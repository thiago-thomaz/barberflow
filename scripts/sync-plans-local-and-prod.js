const { PrismaClient } = require('@prisma/client');
const { runRemoteCommand } = require('./vps-exec');

const prisma = new PrismaClient();

const OFFICIAL_PLANS = [
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

async function syncLocal() {
  console.log('📦 Sincronizando planos no banco de dados local...');
  for (const planDef of OFFICIAL_PLANS) {
    const plan = await prisma.plan.upsert({
      where: { tier: planDef.tier },
      create: planDef,
      update: planDef,
    });
    console.log(`  ✅ Plano sincronizado: ${plan.name} (${plan.tier}) - R$ ${plan.price}`);
  }
}

async function syncRemote() {
  console.log('\n🌐 Sincronizando planos na VPS de Produção...');
  try {
    const script = `
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const plans = ${JSON.stringify(OFFICIAL_PLANS)};
async function run() {
  for (const planDef of plans) {
    await p.plan.upsert({
      where: { tier: planDef.tier },
      create: planDef,
      update: planDef,
    });
  }
  const all = await p.plan.findMany({ select: { name: true, tier: true, price: true } });
  console.log('PROD_PLANS_SYNCED:', JSON.stringify(all));
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
`;
    const b64 = Buffer.from(script).toString('base64');
    const cmd = `CONTAINER_ID=$(docker ps -q --filter name=7ho00pvb569n5m3jgee0fnsi | head -n 1) && docker exec $CONTAINER_ID node -e "eval(Buffer.from('${b64}', 'base64').toString('utf8'))"`;
    const res = await runRemoteCommand(cmd);
    console.log('VPS Output:', res.stdout);
    if (res.stderr) console.error('VPS Stderr:', res.stderr);
  } catch (err) {
    console.error('Erro ao sincronizar na VPS:', err);
  }
}

async function main() {
  await syncLocal();
  await syncRemote();
  console.log('\n🎉 Sincronização concluída!');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
