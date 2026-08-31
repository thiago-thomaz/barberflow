import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  getVisagismSessionByToken,
  saveVisagismPhoto,
  deleteVisagismPhoto,
  VISAGISM_STORAGE_DIR,
} from '@/lib/visagism/engine';

export const dynamic = 'force-dynamic';

// GET /api/visagismo/session/[token]/photo - Retorna a foto privada da sessão
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const session = await getVisagismSessionByToken(token);

    if (!session || !session.photoStorageKey || session.photoDeletedAt) {
      return new NextResponse('Imagem não encontrada ou expirada', { status: 404 });
    }

    const filePath = path.join(VISAGISM_STORAGE_DIR, session.photoStorageKey);
    if (!fs.existsSync(filePath)) {
      return new NextResponse('Arquivo não encontrado no disco', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = session.photoMimeType || 'image/jpeg';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    return new NextResponse('Erro ao carregar imagem', { status: 500 });
  }
}

// POST /api/visagismo/session/[token]/photo - Upload seguro de foto com consentimento LGPD
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

    // Process multipart/form-data ou json base64
    let fileBuffer: Buffer | null = null;
    let mimeType = 'image/jpeg';
    let originalName = 'selfie.jpg';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('photo') as File | null;
      const consent = formData.get('consent');

      if (consent !== 'true') {
        return NextResponse.json(
          { error: 'Consentimento obrigatório para prosseguir (LGPD)' },
          { status: 400 }
        );
      }

      if (!file) {
        return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
      }

      mimeType = file.type || 'image/jpeg';
      originalName = file.name || 'selfie.jpg';
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else if (contentType.includes('application/json')) {
      const json = await req.json();
      if (!json.consent) {
        return NextResponse.json(
          { error: 'Consentimento obrigatório para prosseguir (LGPD)' },
          { status: 400 }
        );
      }
      if (!json.base64) {
        return NextResponse.json({ error: 'Payload base64 não informado' }, { status: 400 });
      }

      const matches = json.base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        fileBuffer = Buffer.from(matches[2], 'base64');
      } else {
        fileBuffer = Buffer.from(json.base64, 'base64');
      }
    }

    if (!fileBuffer) {
      return NextResponse.json({ error: 'Falha ao processar arquivo de imagem' }, { status: 400 });
    }

    const result = await saveVisagismPhoto({
      sessionId: session.id,
      fileBuffer,
      mimeType,
      originalName,
    });

    return NextResponse.json({
      success: true,
      message: 'Foto recebida e protegida com sucesso',
      photoUrl: `/api/visagismo/session/${token}/photo`,
      detectedFaceShape: result.detectedFaceShape,
      notes: result.notes,
    });
  } catch (error: any) {
    console.error('Visagism photo upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar foto' },
      { status: 400 }
    );
  }
}

// DELETE /api/visagismo/session/[token]/photo - Exclusão imediata da foto (LGPD)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const session = await getVisagismSessionByToken(token);

    if (!session) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 404 });
    }

    await deleteVisagismPhoto(session.id);

    return NextResponse.json({
      success: true,
      message: 'Foto excluída com sucesso em conformidade com a LGPD',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Erro ao excluir foto', details: error.message },
      { status: 500 }
    );
  }
}
