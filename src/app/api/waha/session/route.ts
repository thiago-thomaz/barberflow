import { NextRequest, NextResponse } from 'next/server';
import { wahaClient } from '@/lib/whatsapp/waha';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/waha/session - Check WAHA Session and QR code status
export async function GET(req: NextRequest) {
  try {
    const authSession = getSessionFromRequest(req);
    if (!authSession || !authSession.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionName = searchParams.get('session') || 'default';

    const statusInfo = await wahaClient.getSessionStatus(sessionName);

    let qrCode = null;
    if (!statusInfo || statusInfo.status === 'SCAN_QR_CODE' || statusInfo.status === 'STARTING') {
      const qrRes = await wahaClient.getQRCode(sessionName);
      if (qrRes.qr) qrCode = qrRes.qr;
    }

    return NextResponse.json({
      sessionName,
      status: statusInfo?.status || 'STOPPED',
      isWorking: statusInfo?.status === 'WORKING',
      me: statusInfo?.me || null,
      qr: qrCode,
      wahaUrl: process.env.WAHA_URL || 'https://evo.projetosunion.cloud',
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao consultar status WAHA', details: error.message }, { status: 500 });
  }
}

// POST /api/waha/session - Start or Stop WAHA Session
export async function POST(req: NextRequest) {
  try {
    const authSession = getSessionFromRequest(req);
    if (!authSession || !authSession.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { action, session } = body;
    const sessionName = session || 'default';

    if (action === 'START') {
      const startRes = await wahaClient.startSession(sessionName);
      return NextResponse.json(startRes);
    } else if (action === 'STOP') {
      const stopRes = await wahaClient.stopSession(sessionName);
      return NextResponse.json(stopRes);
    }

    return NextResponse.json({ error: 'Ação inválida. Use START ou STOP' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao gerenciar sessão WAHA', details: error.message }, { status: 500 });
  }
}
