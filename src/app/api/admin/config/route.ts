import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, logAdminAuditEvent } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const DEFAULT_CONFIGS = [
  {
    key: 'SAAS_NAME',
    value: 'BarberFlow',
    category: 'GENERAL',
    description: 'Nome da plataforma SaaS exibido para clientes e barbearias',
  },
  {
    key: 'SUPPORT_EMAIL',
    value: 'suporte@barberflow.com',
    category: 'GENERAL',
    description: 'E-mail oficial de contato para suporte aos assinantes',
  },
  {
    key: 'SUPPORT_PHONE',
    value: '+55 14 98801-6163',
    category: 'GENERAL',
    description: 'WhatsApp de atendimento e suporte comercial',
  },
  {
    key: 'TRIAL_DAYS_DEFAULT',
    value: '14',
    category: 'OPERATIONAL',
    description: 'Duração padrão do período de teste gratuito para novas barbearias (em dias)',
  },
  {
    key: 'MAX_FREE_BARBERS',
    value: '2',
    category: 'OPERATIONAL',
    description: 'Limite máximo de profissionais no plano de entrada',
  },
  {
    key: 'REQUIRE_LGPD_CONSENT',
    value: 'true',
    category: 'SECURITY',
    description: 'Exigência mandatória de consentimento LGPD para clientes',
  },
  {
    key: 'SESSION_TTL_DAYS',
    value: '7',
    category: 'SECURITY',
    description: 'Tempo de expiração dos tokens de autenticação (dias)',
  },
  {
    key: 'WHATSAPP_PROVIDER_ACTIVE',
    value: 'WAHA',
    category: 'INTEGRATIONS',
    description: 'Provedor ativo de mensageria WhatsApp',
  },
];

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin(req);

    // Ensure default configs exist
    for (const def of DEFAULT_CONFIGS) {
      await prisma.saaSSetting.upsert({
        where: { key: def.key },
        create: def,
        update: {},
      });
    }

    const configs = await prisma.saaSSetting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      data: configs,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Acesso restrito ao Super Admin' }, { status: 403 });
    }
    console.error('[AdminConfig GET API Error]:', error);
    return NextResponse.json({ error: 'Erro ao carregar configurações' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user: adminUser } = await requireSuperAdmin(req);
    const body = await req.json();

    const { settings, reason } = body; // Array of { key, value }

    if (!Array.isArray(settings)) {
      return NextResponse.json({ error: 'Formato inválido para configurações' }, { status: 400 });
    }

    const updated: any[] = [];
    for (const item of settings) {
      if (item.key && item.value !== undefined) {
        const res = await prisma.saaSSetting.upsert({
          where: { key: item.key },
          update: { value: String(item.value), updatedBy: adminUser.id },
          create: {
            key: item.key,
            value: String(item.value),
            category: item.category || 'GENERAL',
            description: item.description || null,
            updatedBy: adminUser.id,
          },
        });
        updated.push(res);
      }
    }

    await logAdminAuditEvent({
      adminUserId: adminUser.id,
      action: 'CONFIG_UPDATE',
      entity: 'SaaSSetting',
      metadata: {
        updatedKeys: settings.map((s) => s.key),
        reason: reason || 'Atualização de configurações do SaaS',
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: 'Configurações atualizadas com sucesso',
      data: updated,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Acesso restrito ao Super Admin' }, { status: 403 });
    }
    console.error('[AdminConfig PATCH API Error]:', error);
    return NextResponse.json({ error: 'Erro ao atualizar configurações' }, { status: 500 });
  }
}
