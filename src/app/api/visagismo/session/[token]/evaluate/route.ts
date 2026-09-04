import { NextRequest, NextResponse } from 'next/server';
import { getVisagismSessionByToken, evaluateVisagismSession } from '@/lib/visagism/engine';
import { VisagismProfileInput } from '@/lib/visagism/types';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// POST /api/visagismo/session/[token]/evaluate - Submete o perfil e gera as 3 recomendações
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const startTime = Date.now();
  try {
    const { token } = params;
    const session = await getVisagismSessionByToken(token);

    if (!session) {
      logger.warn('[EVALUATE] Tentativa de avaliação em sessão inválida', {
        module: 'VISAGISM_EVALUATE',
        action: 'INVALID_SESSION',
      });
      return NextResponse.json({ error: 'Sessão inválida ou expirada' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      objective = 'Corte',
      style = 'Moderno',
      changeLevel = 'Medio',
      maintenanceLevel = 'Medio',
      hairLength = 'Tanto faz',
      faceShape = 'Oval',
      colorPreference = 'Natural',
    } = body;

    const profileInput: VisagismProfileInput = {
      objective,
      style,
      changeLevel,
      maintenanceLevel,
      hairLength,
      faceShape,
      colorPreference,
    };

    logger.visagism('EVALUATION_REQUEST', {
      sessionId: session.id,
      barbershopId: session.barbershopId,
      faceShape,
      objective,
      style,
    });

    const evaluation = await evaluateVisagismSession(session, profileInput);
    const durationMs = Date.now() - startTime;

    logger.visagism('EVALUATION_COMPLETED', {
      sessionId: session.id,
      barbershopId: session.barbershopId,
      recommendationsCount: evaluation?.recommendations?.length || 0,
      durationMs,
    });

    return NextResponse.json({
      success: true,
      evaluation,
    });
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    logger.error('[EVALUATE] Erro ao gerar recomendações de visagismo:', error, {
      module: 'VISAGISM_EVALUATE',
      durationMs,
    });
    return NextResponse.json(
      { error: 'Erro ao gerar recomendações de visagismo', details: error.message },
      { status: 500 }
    );
  }
}
