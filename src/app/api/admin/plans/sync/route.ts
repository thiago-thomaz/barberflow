import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, logAdminAuditEvent } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const OFFICIAL_PLANS = [
  {
    name: 'Starter',
    tier: 'STARTER',
    price: 59.0,
    interval: 'MONTHLY',
    maxBarbers: 2,
    maxMonthlyAppointments: 500,
    hasWhatsappAutomation: false,
    hasAdvancedAnalytics: false,
    hasMultiUnit: false,
    featuresJson: JSON.stringify([
      'Até 2 Barbeiros',
      'Agenda e Agendamento Público',
      'Motor de Recorrência Básico',
      'Gestão de Clientes',
      'Página Pública de Agendamento',
    ]),
  },
  {
    name: 'Profissional',
    tier: 'PRO',
    price: 119.0,
    interval: 'MONTHLY',
    maxBarbers: 999,
    maxMonthlyAppointments: 10000,
    hasWhatsappAutomation: true,
    hasAdvancedAnalytics: true,
    hasMultiUnit: false,
    featuresJson: JSON.stringify([
      'Barbeiros Ilimitados',
      'Dinheiro na Mesa Completo',
      'Integração com n8n & Webhooks',
      'QR Code do Balcão',
      'Relatórios Financeiros & Comissões',
      'Automação WhatsApp & Lembretes',
      'Motor de Recorrência Inteligente',
    ]),
  },
  {
    name: 'Redes & Franquias',
    tier: 'BUSINESS',
    price: 229.0,
    interval: 'MONTHLY',
    maxBarbers: 9999,
    maxMonthlyAppointments: 50000,
    hasWhatsappAutomation: true,
    hasAdvancedAnalytics: true,
    hasMultiUnit: true,
    featuresJson: JSON.stringify([
      'Múltiplas Barbearias / Tenants',
      'Suporte Prioritário VIP',
      'Servidor Dedicado / Webhooks ilimitados',
      'Auditoria e Logs Avançados',
      'Todas as funcionalidades do Profissional',
      'Gestão Multi-Unidades',
    ]),
  },
];

export async function POST(req: NextRequest) {
  try {
    const { user: adminUser } = await requireSuperAdmin(req);

    const synced = [];
    for (const planDef of OFFICIAL_PLANS) {
      const plan = await prisma.plan.upsert({
        where: { tier: planDef.tier },
        create: planDef,
        update: {
          name: planDef.name,
          price: planDef.price,
          interval: planDef.interval,
          maxBarbers: planDef.maxBarbers,
          maxMonthlyAppointments: planDef.maxMonthlyAppointments,
          hasWhatsappAutomation: planDef.hasWhatsappAutomation,
          hasAdvancedAnalytics: planDef.hasAdvancedAnalytics,
          hasMultiUnit: planDef.hasMultiUnit,
          featuresJson: planDef.featuresJson,
        },
      });
      synced.push(plan);
    }

    await logAdminAuditEvent({
      adminUserId: adminUser.id,
      action: 'SYNC_OFFICIAL_PLANS',
      entity: 'Plan',
      metadata: { syncedTiers: synced.map((p) => p.tier) },
      req,
    });

    return NextResponse.json({
      success: true,
      message: 'Planos oficiais sincronizados com sucesso!',
      data: synced,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Acesso restrito ao Super Admin' }, { status: 403 });
    }
    console.error('[AdminPlansSync API Error]:', error);
    return NextResponse.json({ error: 'Erro ao sincronizar planos' }, { status: 500 });
  }
}
