import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVisagismPhotoBuffer } from '@/lib/visagism/engine';
import { generateClientVisualPreview } from '@/lib/visagism/providers/replicate';

interface RouteContext {
  params: {
    token: string;
  };
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { token } = params;
    const body = await req.json().catch(() => ({}));
    const { targetImageUrl, haircutName } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    if (!targetImageUrl) {
      return NextResponse.json({ error: 'targetImageUrl obrigatório' }, { status: 400 });
    }

    // Busca sessão ativa
    const session = await prisma.visagismSession.findUnique({
      where: { publicToken: token },
    });

    if (!session || session.status === 'EXPIRED') {
      return NextResponse.json({ error: 'Sessão não encontrada ou expirada' }, { status: 404 });
    }

    // Busca foto do cliente salva no storage ou enviada pelo frontend
    let clientBuffer: Buffer | null = null;
    let clientMime = 'image/jpeg';

    const photoData = await getVisagismPhotoBuffer(session.id);
    if (photoData && photoData.buffer) {
      clientBuffer = photoData.buffer;
      clientMime = photoData.mimeType;
    } else if (body.clientPhotoBase64 && typeof body.clientPhotoBase64 === 'string') {
      const match = body.clientPhotoBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        clientMime = match[1];
        clientBuffer = Buffer.from(match[2], 'base64');
      } else {
        clientBuffer = Buffer.from(body.clientPhotoBase64, 'base64');
      }
    }

    if (!clientBuffer) {
      return NextResponse.json({
        success: false,
        message: 'Foto original do cliente não encontrada para montagem de IA.',
        previewUrl: null,
      });
    }

    // Gera preview usando Replicate
    const generatedUrl = await generateClientVisualPreview({
      clientPhotoBuffer: clientBuffer,
      clientPhotoMimeType: clientMime,
      targetHaircutImageUrl: targetImageUrl,
    });

    if (!generatedUrl) {
      return NextResponse.json({
        success: false,
        message: 'Não foi possível gerar a montagem no momento.',
        previewUrl: null,
      });
    }

    return NextResponse.json({
      success: true,
      previewUrl: generatedUrl,
      haircutName,
    });
  } catch (error: any) {
    console.error('Erro na rota generate-preview:', error);
    return NextResponse.json({ error: 'Erro interno ao processar geração' }, { status: 500 });
  }
}
