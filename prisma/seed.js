const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting BarberFlow Demo Seed...');

  // 1. Clean previous data
  if (prisma.adminAuditLog) await prisma.adminAuditLog.deleteMany();
  if (prisma.saasPayment) await prisma.saasPayment.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.automationEvent.deleteMany();
  await prisma.webhook.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.customerVisitStats.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.service.deleteMany();
  await prisma.businessHours.deleteMany();
  await prisma.barber.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.user.deleteMany();
  await prisma.barbershop.deleteMany();

  // 2. Official Plans (Starter, Profissional, Redes & Franquias)
  const starterPlan = await prisma.plan.create({
    data: {
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
  });

  const proPlan = await prisma.plan.create({
    data: {
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
  });

  const businessPlan = await prisma.plan.create({
    data: {
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
  });

  // 3. Create Tenant: Barbearia Imperial
  const imperialShop = await prisma.barbershop.create({
    data: {
      name: 'Barbearia Imperial',
      slug: 'barbearia-imperial',
      phone: '(11) 98765-4321',
      address: 'Rua Augusta, 1500 - Consolação',
      city: 'São Paulo',
      state: 'SP',
    },
  });

  // 4. Create Tenant B for strict multi-tenant tests: Navalha de Ouro
  const navalhaShop = await prisma.barbershop.create({
    data: {
      name: 'Navalha de Ouro',
      slug: 'navalha-de-ouro',
      phone: '(21) 99888-7766',
      address: 'Av. Atlântica, 500 - Copacabana',
      city: 'Rio de Janeiro',
      state: 'RJ',
    },
  });

  // 5. Subscription
  await prisma.subscription.create({
    data: {
      barbershopId: imperialShop.id,
      planId: proPlan.id,
      status: 'ACTIVE',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // 6. Users (Super Admin & Owners)
  const passwordHash = await bcrypt.hash('senha123barber', 10);
  const adminPasswordHash = await bcrypt.hash('senha123admin', 10);

  const superAdmin = await prisma.user.create({
    data: {
      name: 'Super Administrador BarberFlow',
      email: 'admin@barberflow.com',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
    },
  });

  const ownerImperial = await prisma.user.create({
    data: {
      name: 'Carlos Imperial',
      email: 'dono@barbeariaimperial.com',
      passwordHash,
      role: 'OWNER',
      barbershopId: imperialShop.id,
    },
  });

  const ownerNavalha = await prisma.user.create({
    data: {
      name: 'Marcos Navalha',
      email: 'dono@navalha.com',
      passwordHash,
      role: 'OWNER',
      barbershopId: navalhaShop.id,
    },
  });

  // 7. Business Hours for Imperial (07:00 - 23:00)
  const hours = [
    { dayOfWeek: 0, openTime: '07:00', closeTime: '23:00', isOpen: true },
    { dayOfWeek: 1, openTime: '07:00', closeTime: '23:00', isOpen: true },
    { dayOfWeek: 2, openTime: '07:00', closeTime: '23:00', isOpen: true },
    { dayOfWeek: 3, openTime: '07:00', closeTime: '23:00', isOpen: true },
    { dayOfWeek: 4, openTime: '07:00', closeTime: '23:00', isOpen: true },
    { dayOfWeek: 5, openTime: '07:00', closeTime: '23:00', isOpen: true },
    { dayOfWeek: 6, openTime: '07:00', closeTime: '23:00', isOpen: true },
  ];
  for (const h of hours) {
    await prisma.businessHours.create({
      data: { barbershopId: imperialShop.id, ...h },
    });
  }

  // 8. Barbers (3 Barbers for Imperial)
  const barber1 = await prisma.barber.create({
    data: {
      barbershopId: imperialShop.id,
      name: 'Carlos "Mestre" Silva',
      phone: '(11) 98111-1111',
      specialty: 'Cortes Clássicos, Degradê Navalhado e Fade',
      commission: 50.0,
      isActive: true,
    },
  });

  const barber2 = await prisma.barber.create({
    data: {
      barbershopId: imperialShop.id,
      name: 'Felipe "Navalha" Santos',
      phone: '(11) 98222-2222',
      specialty: 'Barboterapia com Toalha Quente e Freestyle',
      commission: 45.0,
      isActive: true,
    },
  });

  const barber3 = await prisma.barber.create({
    data: {
      barbershopId: imperialShop.id,
      name: 'Lucas Barba & Bigode',
      phone: '(11) 98333-3333',
      specialty: 'Alinhamento de Barba, Pigmentação e Pompadour',
      commission: 50.0,
      isActive: true,
    },
  });

  const barbers = [barber1, barber2, barber3];

  // 9. Services
  const srvCorte = await prisma.service.create({
    data: {
      barbershopId: imperialShop.id,
      name: 'Corte Tradicional / Degradê',
      description: 'Lavagem especial, corte com máquina e tesoura e finalização com pomada premium.',
      price: 45.0,
      durationMin: 30,
      isActive: true,
    },
  });

  const srvBarba = await prisma.service.create({
    data: {
      barbershopId: imperialShop.id,
      name: 'Barboterapia Completa',
      description: 'Toalha quente com óleos essenciais, massagem facial e navalhete de precisão.',
      price: 35.0,
      durationMin: 30,
      isActive: true,
    },
  });

  const srvCombo = await prisma.service.create({
    data: {
      barbershopId: imperialShop.id,
      name: 'Combo Imperial (Corte + Barba)',
      description: 'Experiência completa com corte personalizado e barboterapia.',
      price: 75.0,
      durationMin: 60,
      isActive: true,
    },
  });

  const srvPigmentacao = await prisma.service.create({
    data: {
      barbershopId: imperialShop.id,
      name: 'Pigmentação de Barba / Cabelo',
      description: 'Preenchimento e disfarce de falhas com acabamento super natural.',
      price: 40.0,
      durationMin: 30,
      isActive: true,
    },
  });

  const services = [srvCorte, srvBarba, srvCombo, srvPigmentacao];

  // 10. Sample Customer Names
  const customerNames = [
    'João Pedro Oliveira', 'Matheus Ribeiro', 'Gabriel Souza', 'Lucas Fernandes', 'Guilherme Martins',
    'Rodrigo Lima', 'Thiago Mendes', 'Rafael Barbosa', 'Bruno Rocha', 'Diego Costa',
    'Gustavo Alencar', 'Leonardo Silva', 'Felipe Santos', 'Vinicius Nogueira', 'Eduardo Ramos',
    'Caio Pereira', 'Henrique Castro', 'Alexandre Borges', 'Danilo Farias', 'Marcelo Teixeira',
    'Renan Carvalho', 'Vitor Hugo Dias', 'Igor Vasconcelos', 'Samuel Monteiro', 'Arthur Antunes',
    'Bernardo Guimarães', 'Davi Lucca Pires', 'Enzo Gabriel', 'Heitor Freitas', 'Lorenzo Franco',
    'Murilo Prado', 'Pedro Henrique', 'Vicente Cardoso', 'Benício Arruda', 'Calebe Moreira',
    'Emanuel Assis', 'Joaquim Brandão', 'Noah Rezende', 'Otávio Camargo', 'Raul Dantas',
    'Rael Fontes', 'Thales Guedes', 'Yuri Albuquerque', 'Antônio Fagundes', 'Francisco Viana',
    'Geraldo Meireles', 'Helio Paiva', 'Ivan Queiroz', 'Jonas Silveira', 'Kleber Trindade'
  ];

  console.log(`👤 Generating ${customerNames.length} customers with realistic visit patterns...`);

  const now = new Date();

  // Helper to subtract days
  const subDays = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d;
  };

  // Helper to add days
  const addDays = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d;
  };

  for (let i = 0; i < customerNames.length; i++) {
    const name = customerNames[i];
    const phone = `(11) 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const customer = await prisma.customer.create({
      data: {
        barbershopId: imperialShop.id,
        name,
        phone,
        notes: i % 4 === 0 ? 'Prefere degradê baixo na zero' : i % 5 === 0 ? 'Cliente focado em alinhamento de barba' : null,
      },
    });

    const assignedBarber = barbers[i % barbers.length];
    const preferredService = services[i % services.length];

    // Segment customers:
    // i 0..14: ATIVO / VIP (Regular visits every 15-25 days, last visit 5-15 days ago)
    // i 15..29: EM_RISCO (Regular cycle 20-25 days, last visit 35-45 days ago)
    // i 30..42: INATIVO (Regular cycle 25-30 days, last visit 60-120 days ago)
    // i 43..49: NOVO (Only 1 recent visit 3-10 days ago)

    const visitHistory = [];

    if (i < 15) {
      // ATIVO / VIP
      const cycle = 15 + (i % 8); // 15 to 22 days
      const numVisits = 4 + (i % 4);
      for (let v = numVisits; v >= 1; v--) {
        const daysAgo = (v - 1) * cycle + 7;
        visitHistory.push({ date: subDays(daysAgo), service: preferredService });
      }
    } else if (i < 30) {
      // EM_RISCO
      const cycle = 20 + (i % 5); // 20 to 24 days
      const numVisits = 3;
      const lastDaysAgo = 38 + (i % 10); // 38 to 47 days ago
      for (let v = numVisits; v >= 1; v--) {
        const daysAgo = lastDaysAgo + (v - 1) * cycle;
        visitHistory.push({ date: subDays(daysAgo), service: preferredService });
      }
    } else if (i < 43) {
      // INATIVO
      const cycle = 25 + (i % 6);
      const numVisits = 3;
      const lastDaysAgo = 65 + (i % 40); // 65 to 105 days ago
      for (let v = numVisits; v >= 1; v--) {
        const daysAgo = lastDaysAgo + (v - 1) * cycle;
        visitHistory.push({ date: subDays(daysAgo), service: preferredService });
      }
    } else {
      // NOVO (1 visit)
      visitHistory.push({ date: subDays(5 + (i % 6)), service: preferredService });
    }

    // Create completed appointments and payments
    let totalSpent = 0;
    for (const v of visitHistory) {
      const endAt = new Date(v.date.getTime() + v.service.durationMin * 60 * 1000);
      const app = await prisma.appointment.create({
        data: {
          barbershopId: imperialShop.id,
          customerId: customer.id,
          barberId: assignedBarber.id,
          serviceId: v.service.id,
          scheduledAt: v.date,
          endAt: endAt,
          status: 'CONCLUIDO',
          price: v.service.price,
        },
      });

      await prisma.payment.create({
        data: {
          barbershopId: imperialShop.id,
          appointmentId: app.id,
          customerId: customer.id,
          barberId: assignedBarber.id,
          amount: v.service.price,
          method: i % 2 === 0 ? 'PIX' : 'CARTAO_CREDITO',
          status: 'PAGO',
          paidAt: v.date,
          createdAt: v.date,
        },
      });

      totalSpent += v.service.price;
    }

    // Calculate customer stats & recurrence metrics
    const totalVisits = visitHistory.length;
    const avgTicket = totalVisits > 0 ? totalSpent / totalVisits : 0;
    const lastVisitDate = visitHistory.length > 0 ? visitHistory[visitHistory.length - 1].date : null;
    const daysSinceLastVisit = lastVisitDate ? Math.floor((now.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    let avgDays = 0;
    let medianDays = 0;
    if (totalVisits >= 2) {
      const intervals = [];
      for (let k = 1; k < visitHistory.length; k++) {
        const diff = Math.round((visitHistory[k].date.getTime() - visitHistory[k - 1].date.getTime()) / (1000 * 60 * 60 * 24));
        if (diff > 0) intervals.push(diff);
      }
      if (intervals.length > 0) {
        avgDays = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
        intervals.sort((a, b) => a - b);
        medianDays = intervals[Math.floor(intervals.length / 2)];
      }
    } else {
      avgDays = 30;
      medianDays = 30;
    }

    const cycleDays = medianDays || avgDays || 30;
    const estimatedNextVisit = lastVisitDate ? new Date(lastVisitDate.getTime() + cycleDays * 24 * 60 * 60 * 1000) : null;

    let status = 'NOVO';
    let recurrenceRate = 'MEDIA';
    if (totalVisits === 0) {
      status = 'NOVO';
    } else if (totalVisits === 1) {
      if (daysSinceLastVisit > 60) status = 'INATIVO';
      else if (daysSinceLastVisit > 35) status = 'EM_RISCO';
      else status = 'NOVO';
    } else {
      if (daysSinceLastVisit > cycleDays * 2.0) status = 'INATIVO';
      else if (daysSinceLastVisit > cycleDays * 1.25) status = 'EM_RISCO';
      else if (totalVisits >= 5) status = 'VIP';
      else status = 'ATIVO';

      if (cycleDays <= 21) recurrenceRate = 'ALTA';
      else if (cycleDays <= 35) recurrenceRate = 'MEDIA';
      else recurrenceRate = 'BAIXA';
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: { status, recurrenceRate },
    });

    await prisma.customerVisitStats.create({
      data: {
        customerId: customer.id,
        totalVisits,
        totalSpent,
        avgTicket,
        avgDaysBetweenVisits: avgDays,
        medianDaysBetween: medianDays,
        lastVisitDate,
        estimatedNextVisit,
        daysSinceLastVisit,
      },
    });
  }

  // 11. Schedule upcoming appointments for TODAY and next 3 days
  console.log('📅 Scheduling upcoming appointments for today and this week...');

  const todaySlots = [
    { hour: 9, min: 0, status: 'CONCLUIDO', customerIdx: 0, barberIdx: 0, serviceIdx: 0 },
    { hour: 10, min: 0, status: 'CONCLUIDO', customerIdx: 1, barberIdx: 1, serviceIdx: 2 },
    { hour: 11, min: 0, status: 'EM_ATENDIMENTO', customerIdx: 2, barberIdx: 0, serviceIdx: 1 },
    { hour: 14, min: 0, status: 'CONFIRMADO', customerIdx: 3, barberIdx: 1, serviceIdx: 0 },
    { hour: 15, min: 30, status: 'AGENDADO', customerIdx: 4, barberIdx: 2, serviceIdx: 2 },
    { hour: 17, min: 0, status: 'AGENDADO', customerIdx: 5, barberIdx: 0, serviceIdx: 0 },
    { hour: 18, min: 30, status: 'CANCELADO', customerIdx: 6, barberIdx: 1, serviceIdx: 1 },
  ];

  for (const slot of todaySlots) {
    const cust = await prisma.customer.findFirst({
      where: { name: customerNames[slot.customerIdx], barbershopId: imperialShop.id },
    });
    const srv = services[slot.serviceIdx];
    const barb = barbers[slot.barberIdx];

    const scheduledAt = new Date();
    scheduledAt.setHours(slot.hour, slot.min, 0, 0);
    const endAt = new Date(scheduledAt.getTime() + srv.durationMin * 60 * 1000);

    const app = await prisma.appointment.create({
      data: {
        barbershopId: imperialShop.id,
        customerId: cust.id,
        barberId: barb.id,
        serviceId: srv.id,
        scheduledAt,
        endAt,
        status: slot.status,
        price: srv.price,
      },
    });

    if (slot.status === 'CONCLUIDO') {
      await prisma.payment.create({
        data: {
          barbershopId: imperialShop.id,
          appointmentId: app.id,
          customerId: cust.id,
          barberId: barb.id,
          amount: srv.price,
          method: 'PIX',
          status: 'PAGO',
          paidAt: scheduledAt,
        },
      });
    }
  }

  // 12. Create n8n Webhook configuration
  await prisma.webhook.create({
    data: {
      barbershopId: imperialShop.id,
      url: 'https://n8n.srv1194775.hstgr.cloud/webhook/barberflow-events',
      secret: 'whsec_barberflow_n8n_demo_secret_2026',
      isActive: true,
      events: JSON.stringify(['*']),
    },
  });

  console.log('✅ Demo Seed successfully populated:');
  console.log('   - Barbearia: Barbearia Imperial (slug: barbearia-imperial)');
  console.log('   - Login: dono@barbeariaimperial.com | Senha: senha123barber');
  console.log('   - 3 Barbeiros, 4 Serviços, 50 Clientes com estatísticas completas.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
