import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST /api/auth/demo - Controlled demo login
export async function POST(req: NextRequest) {
  try {
    const demoUser = await prisma.user.findFirst({
      where: { email: 'dono@barbeariaimperial.com' },
      include: { barbershop: true },
    });

    if (!demoUser) {
      return NextResponse.json(
        { error: 'Ambiente de demonstração não inicializado. Por favor execute o seed ou crie uma conta no Onboarding.' },
        { status: 404 }
      );
    }

    const token = signToken({
      userId: demoUser.id,
      email: demoUser.email,
      role: demoUser.role,
      barbershopId: demoUser.barbershopId,
      barbershopName: demoUser.barbershop?.name,
      barbershopSlug: demoUser.barbershop?.slug,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: demoUser.id,
        name: demoUser.name,
        email: demoUser.email,
        role: demoUser.role,
        barbershop: demoUser.barbershop,
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
    console.error('Demo login error:', error);
    return NextResponse.json({ error: 'Erro ao iniciar modo de demonstração' }, { status: 500 });
  }
}
