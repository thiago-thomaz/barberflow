import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/tenant';

// POST /api/appointments/[id]/start - Start service
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const appointment = await prisma.appointment.findFirst({
      where: { id: params.id, barbershopId: session.barbershopId },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    const updated = await prisma.appointment.update({
      where: { id: params.id },
      data: {
        status: 'EM_ATENDIMENTO',
        startedAt: new Date(),
      },
      include: { customer: true, barber: true, service: true },
    });

    await logAuditEvent({
      tenantId: session.barbershopId,
      userId: session.userId,
      action: 'UPDATE',
      entity: 'Appointment',
      entityId: params.id,
      metadata: { newStatus: 'EM_ATENDIMENTO' },
    });

    return NextResponse.json({ success: true, appointment: updated });
  } catch (error: any) {
    console.error('Error starting appointment:', error);
    return NextResponse.json({ error: 'Erro ao iniciar atendimento' }, { status: 500 });
  }
}
