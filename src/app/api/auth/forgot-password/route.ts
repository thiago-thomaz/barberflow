import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { enforceRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// POST /api/auth/forgot-password - Request password reset token
export async function POST(req: NextRequest) {
  try {
    const rateLimitBlocked = enforceRateLimit(req, 'forgot-password', 5, 15 * 60 * 1000);
    if (rateLimitBlocked) return rateLimitBlocked;

    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'E-mail é obrigatório' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (user) {
      // Invalidate existing tokens
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      // In production, send via email service. In dev, token is safely generated.
      console.log(`[AUTH] Password reset link generated for ${user.email}`);
    }

    // Always return identical success message to prevent user enumeration attacks
    return NextResponse.json({
      success: true,
      message:
        'Se este e-mail estiver cadastrado, enviamos as instruções para redefinição de senha.',
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Erro ao processar solicitação de recuperação de senha' },
      { status: 500 }
    );
  }
}
