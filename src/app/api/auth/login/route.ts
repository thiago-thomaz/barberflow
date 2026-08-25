import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, signToken } from '@/lib/auth';
import { logAuditEvent } from '@/lib/tenant';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { barbershop: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const validPassword = await comparePassword(password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      barbershopId: user.barbershopId,
      barbershopName: user.barbershop?.name,
      barbershopSlug: user.barbershop?.slug,
    });

    if (user.barbershopId) {
      await logAuditEvent({
        tenantId: user.barbershopId,
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
      });
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        barbershop: user.barbershop,
      },
      token,
    });

    response.cookies.set('barberflow_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Erro interno ao realizar login' }, { status: 500 });
  }
}
