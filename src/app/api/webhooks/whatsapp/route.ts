import { NextRequest, NextResponse } from 'next/server';
import { processWhatsAppMessage } from '@/lib/whatsapp/engine';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/webhooks/whatsapp - Webhook verification for Meta Cloud API
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'barberflow_webhook_verify_secret';

  if (mode === 'subscribe' && token === verifyToken) {
    logger.whatsapp('WEBHOOK_VERIFIED', { actionTaken: 'hub.challenge returned' });
    return new NextResponse(challenge, { status: 200 });
  }

  logger.warn('[WHATSAPP_WEBHOOK] Falha na verificação de token Meta Cloud', {
    module: 'WHATSAPP_WEBHOOK',
    action: 'VERIFICATION_FAILED',
  });
  return NextResponse.json({ error: 'Verificação falhou' }, { status: 403 });
}

// POST /api/webhooks/whatsapp - Receive inbound WhatsApp messages (Meta Cloud, n8n, or simulator)
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();

    // 1. Check if standard Meta Cloud format
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0]?.value;
      const message = change?.messages?.[0];
      const metadata = change?.metadata;

      if (!message) {
        return NextResponse.json({ status: 'ignored_no_message' });
      }

      const from = message.from;
      let text = '';
      let mediaUrl = '';
      let mediaMimeType = '';
      let mediaType: 'text' | 'image' | 'audio' | 'document' = 'text';

      if (message.type === 'text') {
        text = message.text?.body || '';
      } else if (message.type === 'interactive') {
        text = message.interactive?.button_reply?.id || message.interactive?.list_reply?.id || '';
      } else if (message.type === 'button') {
        text = message.button?.text || '';
      } else if (message.type === 'image') {
        mediaType = 'image';
        mediaUrl = message.image?.link || message.image?.url || '';
        mediaMimeType = message.image?.mime_type || 'image/jpeg';
        text = message.image?.caption || '[FOTO]';
      }

      const tenantPhoneId = metadata?.phone_number_id;
      const receiverPhone = metadata?.display_phone_number || tenantPhoneId;

      logger.whatsapp('META_CLOUD_MESSAGE_RECEIVED', {
        from,
        text,
        actionTaken: 'processWhatsAppMessage',
      });

      const result = await processWhatsAppMessage({
        from,
        text: text || '[FOTO]',
        tenantSlugOrId: tenantPhoneId,
        receiverPhone,
        messageId: message.id,
        mediaUrl: mediaUrl || undefined,
        mediaMimeType: mediaMimeType || undefined,
        mediaType,
      });

      const durationMs = Date.now() - startTime;
      logger.http('POST', '/api/webhooks/whatsapp', 200, durationMs, {
        source: 'MetaCloud',
        from,
        actionTaken: (result as any)?.action || (result as any)?.status || 'processed',
      });

      return NextResponse.json({ success: true, result });
    }

    // 2. Direct format (n8n, WAHA, Simulator, or Custom Gateway)
    const {
      from,
      text,
      tenantSlug,
      barbershopId,
      receiverPhone,
      messageId,
      senderName,
      mediaUrl,
      mediaBase64,
      image,
      media,
      mimeType,
      mediaMimeType,
      mediaType,
    } = body;

    const resolvedMediaBase64 = mediaBase64 || (typeof image === 'string' && image.startsWith('data:') ? image : undefined);
    const resolvedMediaUrl = mediaUrl || (typeof image === 'string' && image.startsWith('http') ? image : undefined) || (typeof media === 'string' && media.startsWith('http') ? media : undefined);
    const resolvedMimeType = mediaMimeType || mimeType || (resolvedMediaBase64?.startsWith('data:') ? resolvedMediaBase64.split(';')[0].replace('data:', '') : undefined);

    const messageText = text || body.caption || (resolvedMediaBase64 || resolvedMediaUrl ? '[FOTO]' : '');

    if (!from || !messageText) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: from e text (ou imagem)' },
        { status: 400 }
      );
    }

    logger.whatsapp('DIRECT_MESSAGE_RECEIVED', {
      from,
      phone: from,
      text: messageText,
      barbershopId,
      actionTaken: 'processWhatsAppMessage',
    });

    const result = await processWhatsAppMessage({
      from,
      text: messageText,
      tenantSlugOrId: tenantSlug || barbershopId,
      receiverPhone: receiverPhone,
      messageId,
      senderName,
      mediaUrl: resolvedMediaUrl,
      mediaBase64: resolvedMediaBase64,
      mediaMimeType: resolvedMimeType,
      mediaType: mediaType || (resolvedMediaBase64 || resolvedMediaUrl ? 'image' : 'text'),
    });

    const durationMs = Date.now() - startTime;
    logger.http('POST', '/api/webhooks/whatsapp', 200, durationMs, {
      source: 'Direct/WAHA',
      from,
      actionTaken: (result as any)?.action || (result as any)?.status || 'processed',
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    logger.error('WhatsApp Webhook Error:', error, {
      module: 'WHATSAPP_WEBHOOK',
      durationMs,
    });
    return NextResponse.json(
      { error: 'Erro ao processar mensagem do WhatsApp', details: error.message },
      { status: 500 }
    );
  }
}
