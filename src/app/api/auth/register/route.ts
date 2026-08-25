import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth';
import { logAuditEvent } from '@/lib/tenant';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      password,
      barbershopName,
      phone,
      address,
      city,
      barberName,
      barberSpecialty,
      services, // Array of { name, price, durationMin }
    } = body;

    if (!name || !email || !password || !barbershopName) {
      return NextResponse.json(
        { error: 'Nome, email, senha e nome da barbearia são obrigatórios' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Já existe uma conta cadastrada com este email' },
        { status: 409 }
      );
    }

    // Generate unique slug for public page
    let baseSlug = barbershopName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    if (!baseSlug) baseSlug = 'barbearia';

    let slug = baseSlug;
    let count = 1;
    while (await prisma.barbershop.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${count++}`;
    }

    const passwordHash = await hashPassword(password);

    // Create Barbershop + Owner User + Default Business Hours + Initial Barber + Initial Services in transaction
    const newBarbershop = await prisma.$transaction(async (tx) => {
      const shop = await tx.barbershop.create({
        data: {
          name: barbershopName,
          slug,
          phone: phone || null,
          address: address || null,
          city: city || null,
        },
      });

      const user = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          passwordHash,
          role: 'OWNER',
          barbershopId: shop.id,
        },
      });

      // Default business hours (Mon-Sat 09:00-19:00, Sun Closed)
      const businessDays = [
        { dayOfWeek: 0, openTime: '09:00', closeTime: '18:00', isOpen: false }, // Domingo
        { dayOfWeek: 1, openTime: '09:00', closeTime: '19:00', isOpen: true },  // Segunda
        { dayOfWeek: 2, openTime: '09:00', closeTime: '19:00', isOpen: true },  // Terça
        { dayOfWeek: 3, openTime: '09:00', closeTime: '19:00', isOpen: true },  // Quarta
        { dayOfWeek: 4, openTime: '09:00', closeTime: '19:00', isOpen: true },  // Quinta
        { dayOfWeek: 5, openTime: '09:00', closeTime: '20:00', isOpen: true },  // Sexta
        { dayOfWeek: 6, openTime: '09:00', closeTime: '19:00', isOpen: true },  // Sábado
      ];

      for (const bDay of businessDays) {
        await tx.businessHours.create({
          data: {
            barbershopId: shop.id,
            ...bDay,
          },
        });
      }

      // Create primary Barber if specified (or default to owner's name)
      await tx.barber.create({
        data: {
          barbershopId: shop.id,
          name: barberName || name,
          specialty: barberSpecialty || 'Cortes clássicos e barba',
          isActive: true,
        },
      });

      // Create initial services if provided, else default services
      const defaultServices = services && services.length > 0 ? services : [
        { name: 'Corte Tradicional', price: 40.0, durationMin: 30 },
        { name: 'Barba Terapia', price: 30.0, durationMin: 30 },
        { name: 'Combo Corte + Barba', price: 65.0, durationMin: 60 },
      ];

      for (const s of defaultServices) {
        await tx.service.create({
          data: {
            barbershopId: shop.id,
            name: s.name,
            price: Number(s.price),
            durationMin: Number(s.durationMin || 30),
            isActive: true,
          },
        });
      }

      return { shop, user };
    });

    const token = signToken({
      userId: newBarbershop.user.id,
      email: newBarbershop.user.email,
      role: newBarbershop.user.role,
      barbershopId: newBarbershop.shop.id,
      barbershopName: newBarbershop.shop.name,
      barbershopSlug: newBarbershop.shop.slug,
    });

    await logAuditEvent({
      tenantId: newBarbershop.shop.id,
      userId: newBarbershop.user.id,
      action: 'CREATE',
      entity: 'Barbershop',
      entityId: newBarbershop.shop.id,
    });

    const response = NextResponse.json({
      success: true,
      barbershop: newBarbershop.shop,
      user: {
        id: newBarbershop.user.id,
        name: newBarbershop.user.name,
        email: newBarbershop.user.email,
      },
      token,
    });

    response.cookies.set('barberflow_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('Registration/Onboarding error:', error);
    return NextResponse.json(
      { error: 'Erro interno ao criar conta e barbearia' },
      { status: 500 }
    );
  }
}
