import { NextRequest, NextResponse } from 'next/server';
import { getVisagismSessionByToken } from '@/lib/visagism/engine';
import { FACE_SHAPES_GUIDE, COLOR_OPTIONS_CATALOG } from '@/lib/visagism/catalog';

export const dynamic = 'force-dynamic';

// GET /api/visagismo/session/[token] - Obtém os dados da sessão de visagismo
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const session = await getVisagismSessionByToken(token);

    if (!session) {
      return NextResponse.json(
        { error: 'Sessão de visagismo não encontrada ou expirada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        publicToken: session.publicToken,
        status: session.status,
        hasPhoto: !!session.photoStorageKey && !session.photoDeletedAt,
        consentAt: session.consentAt,
        expiresAt: session.expiresAt,
        barbershop: session.barbershop,
        customer: session.customer,
        profile: session.profile,
        recommendations: session.recommendations,
      },
      guides: {
        faceShapes: FACE_SHAPES_GUIDE,
        colors: COLOR_OPTIONS_CATALOG,
      },
    });
  } catch (error: any) {
    console.error('Error fetching visagism session:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar sessão', details: error.message },
      { status: 500 }
    );
  }
}
