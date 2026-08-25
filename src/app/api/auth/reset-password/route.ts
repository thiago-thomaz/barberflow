import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { enforceRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// POST /api/auth/reset-password - Set new password with valid token
export async function POST(req: NextRequest) {
  try {
    const rateLimitBlocked = enforceRateLimit(req, 'reset-password', 5, 15 * 60 * 1000);
    if (rateLimitBlocked) return rateLimitBlocked;

    const body = await req.json();
    const { token, newPassword } = body;

    if (!token || !newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Token e nova senha (mínimo 8 caracteres) são obrigatórios' },
        { status: 400 }
      );
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Link de recuperação inválido ou expirado' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Senha redefinida com sucesso! Você já pode fazer login.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Erro ao redefinir senha' }, { status: 500 });
  }
}
