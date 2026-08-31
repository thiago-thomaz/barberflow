import { NextRequest, NextResponse } from 'next/server';
import { getVisagismSessionByToken, evaluateVisagismSession } from '@/lib/visagism/engine';
import { VisagismProfileInput } from '@/lib/visagism/types';

export const dynamic = 'force-dynamic';

// POST /api/visagismo/session/[token]/evaluate - Submete o perfil e gera as 3 recomendações
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const session = await getVisagismSessionByToken(token);

    if (!session) {
      return NextResponse.json({ error: 'Sessão inválida ou expirada' }, { status: 404 });
    }

    const body = await req.json();
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

    const evaluation = await evaluateVisagismSession(session, profileInput);

    return NextResponse.json({
      success: true,
      evaluation,
    });
  } catch (error: any) {
    console.error('Visagism evaluation error:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar recomendações de visagismo', details: error.message },
      { status: 500 }
    );
  }
}
