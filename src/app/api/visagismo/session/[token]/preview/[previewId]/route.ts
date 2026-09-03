import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { VISAGISM_STORAGE_DIR } from '@/lib/visagism/engine';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    token: string;
    previewId: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { token, previewId } = params;

    if (!token || !previewId) {
      return new NextResponse('Não encontrado', { status: 404 });
    }

    // Valida se a sessão é válida
    const session = await prisma.visagismSession.findUnique({
      where: { publicToken: token },
    });

    if (!session || session.status === 'EXPIRED') {
      return new NextResponse('Sessão inválida ou expirada', { status: 404 });
    }

    // Sanitiza o previewId para impedir Path Traversal
    const safePreviewId = path.basename(previewId);
    const previewsDir = path.join(VISAGISM_STORAGE_DIR, 'previews');
    const filePath = path.join(previewsDir, safePreviewId);

    if (!fs.existsSync(filePath)) {
      return new NextResponse('Simulação não encontrada', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Erro ao servir preview:', error);
    return new NextResponse('Erro interno', { status: 500 });
  }
}
