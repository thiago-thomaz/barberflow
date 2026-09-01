import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVisagismSessionByToken, recordVisagismMetric } from '@/lib/visagism/engine';

export const dynamic = 'force-dynamic';

// POST /api/visagismo/session/[token]/select - Seleciona estilo e prepara agendamento / WhatsApp
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
    const { recommendationId, haircutName, beardName, hairColor, haircutStyle, action } = body;

    // Marca a recomendação selecionada
    if (recommendationId) {
      await prisma.visagismRecommendation.updateMany({
        where: { sessionId: session.id },
        data: { isSelected: false },
      });
      await prisma.visagismRecommendation.update({
        where: { id: recommendationId },
        data: { isSelected: true },
      });
    }

    // Registra métricas
    if (action === 'APPOINTMENT_CLICKED') {
      await recordVisagismMetric({
        barbershopId: session.barbershopId,
        sessionId: session.id,
        eventName: 'appointment_clicked',
        metadata: { haircutName, haircutStyle },
      });
    } else if (action === 'WHATSAPP_SHARED') {
      await recordVisagismMetric({
        barbershopId: session.barbershopId,
        sessionId: session.id,
        eventName: 'whatsapp_shared',
        metadata: { haircutName, beardName },
      });
    } else {
      await recordVisagismMetric({
        barbershopId: session.barbershopId,
        sessionId: session.id,
        eventName: 'style_saved',
        metadata: { haircutName, haircutStyle },
      });
    }

    // Formata mensagem estruturada para WhatsApp do barbeiro
    const whatsappMessage = `Olá! 👋 Fiz meu visagismo no BarberFlow e escolhi meu novo visual:\n\n✂️ *Corte:* ${haircutName || 'Estilo Recomendado'}\n💈 *Estilo:* ${haircutStyle || 'Moderno'}${beardName ? `\n🧔 *Barba:* ${beardName}` : ''}${hairColor ? `\n🎨 *Cor:* ${hairColor}` : ''}\n\nGostaria de agendar esse visual com você na *${session.barbershop.name}*!`;

    const barberPhone = session.barbershop.phone || '';
    const cleanPhone = barberPhone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`}?text=${encodeURIComponent(whatsappMessage)}`;

    // URL de agendamento público com preservação do visual escolhido
    const queryParams = new URLSearchParams({
      visagism: session.publicToken,
      corte: haircutName || '',
      estilo: haircutStyle || '',
      barba: beardName || '',
    });
    const bookingUrl = `/b/${session.barbershop.slug}?${queryParams.toString()}`;

    return NextResponse.json({
      success: true,
      whatsappMessage,
      whatsappUrl,
      bookingUrl,
    });
  } catch (error: any) {
    console.error('Visagism select error:', error);
    return NextResponse.json(
      { error: 'Erro ao selecionar estilo', details: error.message },
      { status: 500 }
    );
  }
}
