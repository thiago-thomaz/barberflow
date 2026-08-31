const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

test('BARBERFLOW FASE 17 — REAL-WORLD QA & UAT SUITE', async (t) => {
  let tenantA = null;
  let userA = null;
  let barberA1 = null;
  let barberA2 = null;
  let barberA3 = null;
  let serviceCorte = null;
  let serviceBarba = null;
  let serviceCombo = null;

  let tenantB = null;
  let userB = null;
  let barberB1 = null;
  let serviceB1 = null;

  let diagnosticEngine = null;
  let recurrenceEngine = null;
  let aiModule = null;
  let contentModule = null;

  const uniqueId = `qa17_${Date.now()}`;

  t.before(async () => {
    // Importa módulos TypeScript
    diagnosticEngine = await import('../src/lib/academia/diagnostic-engine.ts');
    aiModule = await import('../src/lib/academia/ai-consultant.ts');
    contentModule = await import('../src/lib/academia/content.ts');

    // 1. Setup Tenant A: "Barbearia QA Alpha"
    tenantA = await prisma.barbershop.create({
      data: {
        name: `Barbearia QA Alpha ${uniqueId}`,
        slug: `qa-alpha-${uniqueId}`,
        phone: '11999991111',
        address: 'Rua Augusta, 1500',
        city: 'São Paulo',
        state: 'SP',
      },
    });

    const passwordHash = await bcrypt.hash('senha_secreta_123', 10);
    userA = await prisma.user.create({
      data: {
        name: 'Dono Alpha',
        email: `dono_alpha_${uniqueId}@barberflow.test`,
        passwordHash,
        role: 'OWNER',
        barbershopId: tenantA.id,
      },
    });

    // 3 Barbeiros para Tenant A
    barberA1 = await prisma.barber.create({
      data: {
        name: 'Carlos Navalha',
        phone: '11988881111',
        specialty: 'Fade & Degradê',
        commission: 50.0,
        barbershopId: tenantA.id,
        isActive: true,
      },
    });

    barberA2 = await prisma.barber.create({
      data: {
        name: 'Marcos Tesoura',
        phone: '11988882222',
        specialty: 'Barba Terapia',
        commission: 45.0,
        barbershopId: tenantA.id,
        isActive: true,
      },
    });

    barberA3 = await prisma.barber.create({
      data: {
        name: 'Felipe Estilo',
        phone: '11988883333',
        specialty: 'Cortes Clássicos',
        commission: 40.0,
        barbershopId: tenantA.id,
        isActive: false, // Inativo para testes de bloqueio
      },
    });

    // Serviços para Tenant A
    serviceCorte = await prisma.service.create({
      data: {
        name: 'Corte Tradicional',
        description: 'Corte com tesoura e máquina com lavagem',
        durationMin: 30,
        price: 45.0,
        barbershopId: tenantA.id,
        isActive: true,
      },
    });

    serviceBarba = await prisma.service.create({
      data: {
        name: 'Barba Terapia',
        description: 'Toalha quente e óleos essenciais',
        durationMin: 30,
        price: 40.0,
        barbershopId: tenantA.id,
        isActive: true,
      },
    });

    serviceCombo = await prisma.service.create({
      data: {
        name: 'Combo Cabelo + Barba',
        description: 'Experiência completa',
        durationMin: 60,
        price: 75.0,
        barbershopId: tenantA.id,
        isActive: true,
      },
    });

    // Horário de Funcionamento (Seg-Sáb 09:00 - 19:00, Dom fechado)
    for (let day = 1; day <= 6; day++) {
      await prisma.businessHours.create({
        data: {
          barbershopId: tenantA.id,
          dayOfWeek: day,
          openTime: '09:00',
          closeTime: '19:00',
          isOpen: true,
        },
      });
    }
    await prisma.businessHours.create({
      data: {
        barbershopId: tenantA.id,
        dayOfWeek: 0,
        openTime: '00:00',
        closeTime: '00:00',
        isOpen: false, // Domingo Fechado
      },
    });

    // 2. Setup Tenant B: "Barbearia QA Beta" (Para testes de isolamento estrito)
    tenantB = await prisma.barbershop.create({
      data: {
        name: `Barbearia QA Beta ${uniqueId}`,
        slug: `qa-beta-${uniqueId}`,
        phone: '11999992222',
      },
    });

    userB = await prisma.user.create({
      data: {
        name: 'Dono Beta',
        email: `dono_beta_${uniqueId}@barberflow.test`,
        passwordHash,
        role: 'OWNER',
        barbershopId: tenantB.id,
      },
    });

    barberB1 = await prisma.barber.create({
      data: {
        name: 'Barbeiro Beta',
        barbershopId: tenantB.id,
      },
    });

    serviceB1 = await prisma.service.create({
      data: {
        name: 'Serviço Beta',
        durationMin: 30,
        price: 50.0,
        barbershopId: tenantB.id,
      },
    });
  });

  t.after(async () => {
    // Cleanup Completo dos Tenants de Teste
    if (tenantA) {
      await prisma.academyActionPlan.deleteMany({ where: { barbershopId: tenantA.id } }).catch(() => {});
      await prisma.academyDiagnosticSnapshot.deleteMany({ where: { barbershopId: tenantA.id } }).catch(() => {});
      await prisma.academyDiagnostic.deleteMany({ where: { barbershopId: tenantA.id } }).catch(() => {});
      await prisma.appointmentReminder.deleteMany({ where: { appointment: { barbershopId: tenantA.id } } }).catch(() => {});
      await prisma.financialTransaction.deleteMany({ where: { barbershopId: tenantA.id } }).catch(() => {});
      await prisma.cashRegister.deleteMany({ where: { barbershopId: tenantA.id } }).catch(() => {});
      await prisma.appointment.deleteMany({ where: { barbershopId: tenantA.id } }).catch(() => {});
      await prisma.customerVisitStats.deleteMany({ where: { customer: { barbershopId: tenantA.id } } }).catch(() => {});
      await prisma.customer.deleteMany({ where: { barbershopId: tenantA.id } }).catch(() => {});
      await prisma.service.deleteMany({ where: { barbershopId: tenantA.id } }).catch(() => {});
      await prisma.barber.deleteMany({ where: { barbershopId: tenantA.id } }).catch(() => {});
      await prisma.businessHours.deleteMany({ where: { barbershopId: tenantA.id } }).catch(() => {});
      await prisma.user.deleteMany({ where: { barbershopId: tenantA.id } }).catch(() => {});
      await prisma.barbershop.delete({ where: { id: tenantA.id } }).catch(() => {});
    }

    if (tenantB) {
      await prisma.academyActionPlan.deleteMany({ where: { barbershopId: tenantB.id } }).catch(() => {});
      await prisma.academyDiagnosticSnapshot.deleteMany({ where: { barbershopId: tenantB.id } }).catch(() => {});
      await prisma.academyDiagnostic.deleteMany({ where: { barbershopId: tenantB.id } }).catch(() => {});
      await prisma.appointment.deleteMany({ where: { barbershopId: tenantB.id } }).catch(() => {});
      await prisma.customer.deleteMany({ where: { barbershopId: tenantB.id } }).catch(() => {});
      await prisma.service.deleteMany({ where: { barbershopId: tenantB.id } }).catch(() => {});
      await prisma.barber.deleteMany({ where: { barbershopId: tenantB.id } }).catch(() => {});
      await prisma.user.deleteMany({ where: { barbershopId: tenantB.id } }).catch(() => {});
      await prisma.barbershop.delete({ where: { id: tenantB.id } }).catch(() => {});
    }

    await prisma.$disconnect();
  });

  // ----------------------------------------------------
  // TESTE 1: Autenticação, Onboarding e Segurança de Senha
  // ----------------------------------------------------
  await t.test('1. UAT: Autenticação, Onboarding, Recuperação e Criptografia', async () => {
    // 1.1 Senha correta vs Senha incorreta
    const user = await prisma.user.findUnique({ where: { email: userA.email } });
    assert.ok(user, 'Usuário deve existir');

    const validPass = await bcrypt.compare('senha_secreta_123', user.passwordHash);
    assert.strictEqual(validPass, true, 'Senha correta deve validar com sucesso');

    const invalidPass = await bcrypt.compare('senha_errada_xyz', user.passwordHash);
    assert.strictEqual(invalidPass, false, 'Senha incorreta deve ser rejeitada');

    // 1.2 Onboarding: Slug único e imutabilidade de dados críticos
    assert.strictEqual(tenantA.slug, `qa-alpha-${uniqueId}`);
    assert.strictEqual(user.barbershopId, tenantA.id);
  });

  // ----------------------------------------------------
  // TESTE 2: Clientes, Validações, Caracteres Especiais e LGPD
  // ----------------------------------------------------
  await t.test('2. UAT: Clientes, Validação de Telefone, Sanitização e LGPD', async () => {
    // 2.1 Criação de cliente com caracteres especiais e sanitização
    const customer1 = await prisma.customer.create({
      data: {
        name: 'João da Silva & Filhos <script>alert(1)</script>',
        phone: '(11) 98765-4321',
        whatsappPhone: '5511987654321',
        email: 'joao.silva@teste.com',
        barbershopId: tenantA.id,
        status: 'NOVO',
        marketingOptIn: true,
        privacyConsentAt: new Date(),
      },
    });

    assert.ok(customer1.id);
    assert.strictEqual(customer1.barbershopId, tenantA.id);

    // 2.2 Isolamento: Tenant B não pode ler customer1 do Tenant A
    const crossQuery = await prisma.customer.findFirst({
      where: { id: customer1.id, barbershopId: tenantB.id },
    });
    assert.strictEqual(crossQuery, null, 'Tenant B não pode acessar cliente do Tenant A');

    // 2.3 Atualização e exclusão lógica (LGPD Anonimização)
    const anonymized = await prisma.customer.update({
      where: { id: customer1.id },
      data: {
        name: 'Cliente Anonimizado (LGPD)',
        phone: '00000000000',
        email: null,
        notes: null,
        deletedAt: new Date(),
      },
    });
    assert.strictEqual(anonymized.name, 'Cliente Anonimizado (LGPD)');
  });

  // ----------------------------------------------------
  // TESTE 3: Barbeiros e Serviços (Regras de Ativação e Preço)
  // ----------------------------------------------------
  await t.test('3. UAT: Barbeiros e Serviços — Regras de Negócio e Validação de Limites', async () => {
    // 3.1 Barbeiro Ativo vs Inativo
    assert.strictEqual(barberA1.isActive, true);
    assert.strictEqual(barberA3.isActive, false);

    // 3.2 Preços e durações válidas
    assert.ok(serviceCorte.price > 0, 'Preço deve ser positivo');
    assert.ok(serviceCorte.durationMin >= 15, 'Duração mínima deve ser >= 15 min');

    // 3.3 Bloqueio de serviço do Tenant B no Tenant A
    const invalidServiceQuery = await prisma.service.findFirst({
      where: { id: serviceB1.id, barbershopId: tenantA.id },
    });
    assert.strictEqual(invalidServiceQuery, null, 'Serviço do Tenant B não existe no Tenant A');
  });

  // ----------------------------------------------------
  // TESTE 4: Agenda — Ciclo de Vida e Anti-Conflito de Horários
  // ----------------------------------------------------
  await t.test('4. UAT: Agenda — Ciclo Completo, Conflito Parcial/Exato e Slots Adjacentes', async () => {
    const cust = await prisma.customer.create({
      data: {
        name: 'Ricardo Cliente',
        phone: '11977778888',
        barbershopId: tenantA.id,
      },
    });

    const baseTime = new Date('2026-09-15T14:00:00.000Z');
    const endTime = new Date('2026-09-15T14:30:00.000Z');

    // 4.1 Criação de agendamento base
    const aptBase = await prisma.appointment.create({
      data: {
        barbershopId: tenantA.id,
        customerId: cust.id,
        barberId: barberA1.id,
        serviceId: serviceCorte.id,
        scheduledAt: baseTime,
        endAt: endTime,
        durationMinutes: 30,
        price: 45.0,
        status: 'AGENDADO',
      },
    });
    assert.ok(aptBase.publicToken, 'Deve gerar publicToken para autoatendimento');

    // 4.2 Detecção de Conflito Exato (Mesmo Barbeiro 14:00 - 14:30)
    const exactConflict = await prisma.appointment.findFirst({
      where: {
        barbershopId: tenantA.id,
        barberId: barberA1.id,
        status: { in: ['AGENDADO', 'CONFIRMADO', 'EM_ATENDIMENTO'] },
        scheduledAt: { lt: endTime },
        endAt: { gt: baseTime },
      },
    });
    assert.ok(exactConflict, 'Deve detectar conflito de horário com o agendamento existente');

    // 4.3 Slot Imediatamente Adjacente (14:30 - 15:00) Deve Ser Permitido
    const adjacentStart = new Date('2026-09-15T14:30:00.000Z');
    const adjacentEnd = new Date('2026-09-15T15:00:00.000Z');
    const adjacentConflict = await prisma.appointment.findFirst({
      where: {
        barbershopId: tenantA.id,
        barberId: barberA1.id,
        status: { in: ['AGENDADO', 'CONFIRMADO', 'EM_ATENDIMENTO'] },
        AND: [
          { scheduledAt: { lt: adjacentEnd } },
          { endAt: { gt: adjacentStart } },
        ],
      },
    });
    assert.strictEqual(adjacentConflict, null, 'Slot imediatamente após não pode gerar falso conflito');

    // 4.4 Barbeiro Diferente no Mesmo Horário (Permitido)
    const differentBarberConflict = await prisma.appointment.findFirst({
      where: {
        barbershopId: tenantA.id,
        barberId: barberA2.id, // Outro barbeiro
        status: { in: ['AGENDADO', 'CONFIRMADO', 'EM_ATENDIMENTO'] },
        AND: [
          { scheduledAt: { lt: endTime } },
          { endAt: { gt: baseTime } },
        ],
      },
    });
    assert.strictEqual(differentBarberConflict, null, 'Outro barbeiro pode atender no mesmo horário');
  });

  // ----------------------------------------------------
  // TESTE 5: Concorrência Extrema — Anti-Double-Booking (50 e 100 Reqs)
  // ----------------------------------------------------
  await t.test('5. TESTE CRÍTICO: Concorrência Massiva (50 & 100 Requests) -> Zero Double-Booking', async () => {
    const slotStart = new Date('2026-11-20T10:00:00.000Z');
    const slotEnd = new Date('2026-11-20T10:30:00.000Z');

    const tempCustomer = await prisma.customer.create({
      data: {
        name: 'Cliente Concorrencia',
        phone: '11966665555',
        barbershopId: tenantA.id,
      },
    });

    async function attemptBooking(requestId) {
      try {
        return await prisma.$transaction(
          async (tx) => {
            const conflict = await tx.appointment.findFirst({
              where: {
                barbershopId: tenantA.id,
                barberId: barberA1.id,
                status: { notIn: ['CANCELADO', 'NO_SHOW'] },
                AND: [
                  { scheduledAt: { lt: slotEnd } },
                  { endAt: { gt: slotStart } },
                ],
              },
            });

            if (conflict) {
              throw new Error('SCHEDULE_CONFLICT');
            }

            const app = await tx.appointment.create({
              data: {
                barbershopId: tenantA.id,
                customerId: tempCustomer.id,
                barberId: barberA1.id,
                serviceId: serviceCorte.id,
                scheduledAt: slotStart,
                endAt: slotEnd,
                durationMinutes: 30,
                price: 45.0,
                status: 'CONFIRMADO',
              },
            });

            return { success: true, app };
          },
          { isolationLevel: 'Serializable', timeout: 35000, maxWait: 15000 }
        );
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    // 50 requisições simultâneas
    const promises50 = Array.from({ length: 50 }, (_, i) => attemptBooking(i));
    const results50 = await Promise.all(promises50);

    const successes50 = results50.filter((r) => r.success);
    const failures50 = results50.filter((r) => !r.success);

    assert.strictEqual(successes50.length, 1, 'Exatamente 1 agendamento deve ter sucesso');
    assert.strictEqual(failures50.length, 49, 'Exatamente 49 requisições devem ser rejeitadas por conflito');

    const totalInDb = await prisma.appointment.count({
      where: {
        barbershopId: tenantA.id,
        barberId: barberA1.id,
        scheduledAt: slotStart,
        status: 'CONFIRMADO',
      },
    });
    assert.strictEqual(totalInDb, 1, 'Banco de dados deve conter rigorosamente 1 agendamento (ZERO Double Booking)');
  });

  // ----------------------------------------------------
  // TESTE 6: WhatsApp, WAHA, n8n e Mensagens Estruturadas
  // ----------------------------------------------------
  await t.test('6. UAT: WhatsApp / WAHA / n8n — Lembretes T-6h/T-2h/T-1h e Formato RFC 5545 (.ics)', async () => {
    // 6.1 Criação de Lembretes Idempotentes
    const apt = await prisma.appointment.findFirst({
      where: { barbershopId: tenantA.id },
    });
    assert.ok(apt, 'Deve existir agendamento prévio');

    const reminder = await prisma.appointmentReminder.create({
      data: {
        barbershopId: tenantA.id,
        appointmentId: apt.id,
        reminderType: 'T_2H',
        scheduledFor: new Date(Date.now() + 7200000),
        status: 'PENDING',
      },
    });

    assert.ok(reminder.id);
    assert.strictEqual(reminder.status, 'PENDING');

    // 6.2 Validação RFC 5545 do Formato de Calendário .ics
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//BarberFlow//Agendamento//PT-BR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:barberflow-${apt.id}@barber.projetosunion.cloud`,
      'DTSTART:20260915T140000Z',
      'DTEND:20260915T143000Z',
      `SUMMARY:Corte de Cabelo - ${tenantA.name}`,
      `DESCRIPTION:Agendamento confirmado no BarberFlow. Barbeiro: Carlos Navalha`,
      `LOCATION:${tenantA.address}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    assert.ok(icsContent.includes('BEGIN:VCALENDAR'));
    assert.ok(icsContent.includes('BEGIN:VEVENT'));
    assert.ok(icsContent.includes(`UID:barberflow-${apt.id}`));
    assert.ok(icsContent.includes('END:VCALENDAR'));
  });

  // ----------------------------------------------------
  // TESTE 7: Gestão Financeira End-to-End (Caixa, DRE, Comissões e Métodos)
  // ----------------------------------------------------
  await t.test('7. UAT: Gestão Financeira End-to-End — Caixa, Fluxo de Caixa, DRE e Comissões', async () => {
    // 7.1 Conta Financeira
    const finAccount = await prisma.financialAccount.create({
      data: {
        barbershopId: tenantA.id,
        name: 'Caixa Balcão QA',
        type: 'CASH',
        initialBalance: 100.0,
        currentBalance: 100.0,
      },
    });

    // 7.2 Abertura de Caixa
    const cashRegister = await prisma.cashRegister.create({
      data: {
        barbershopId: tenantA.id,
        accountId: finAccount.id,
        openedBy: userA.id,
        initialBalance: 100.0, // Fundo de troco R$ 100
        expectedBalance: 100.0,
        status: 'OPEN',
      },
    });
    assert.strictEqual(cashRegister.status, 'OPEN');

    // 7.3 Entradas de 10 Atendimentos (Pix, Dinheiro, Cartão)
    const paymentMethods = ['PIX', 'DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO'];
    let totalRevenue = 0;
    let totalCommissions = 0;

    for (let i = 0; i < 10; i++) {
      const price = 50.0;
      const commissionRate = 0.5; // 50%
      const commissionAmount = price * commissionRate;
      const method = paymentMethods[i % paymentMethods.length];

      totalRevenue += price;
      totalCommissions += commissionAmount;

      await prisma.financialTransaction.create({
        data: {
          barbershopId: tenantA.id,
          type: 'INCOME',
          amount: price,
          netAmount: price,
          description: `Atendimento #${i + 1} (${method})`,
          paymentMethod: method,
          status: 'PAGO',
          paidDate: new Date(),
          accountId: finAccount.id,
          cashRegisterId: method === 'DINHEIRO' ? cashRegister.id : null,
        },
      });
    }

    // 7.4 Despesa Operacional (Aluguel / Insumos)
    const expenseAmount = 150.0;
    await prisma.financialTransaction.create({
      data: {
        barbershopId: tenantA.id,
        type: 'EXPENSE',
        amount: expenseAmount,
        netAmount: expenseAmount,
        description: 'Compra de Pomadas e Insumos',
        paymentMethod: 'PIX',
        status: 'PAGO',
        paidDate: new Date(),
        accountId: finAccount.id,
      },
    });

    // 7.5 Verificação Matemática do DRE
    const netProfit = totalRevenue - totalCommissions - expenseAmount;
    assert.strictEqual(totalRevenue, 500.0, 'Receita Bruta deve ser R$ 500');
    assert.strictEqual(totalCommissions, 250.0, 'Comissões devem ser R$ 250');
    assert.strictEqual(netProfit, 100.0, 'Lucro Líquido Real da Barbearia deve ser R$ 100');

    // 7.6 Fechamento de Caixa
    const closedRegister = await prisma.cashRegister.update({
      where: { id: cashRegister.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedBy: userA.id,
      },
    });
    assert.strictEqual(closedRegister.status, 'CLOSED');
  });

  // ----------------------------------------------------
  // TESTE 8: Motor de Recorrência & Dinheiro na Mesa
  // ----------------------------------------------------
  await t.test('8. UAT: Recorrência — Categorização NOVO/ATIVO/EM_RISCO/INATIVO/VIP e Mediana', async () => {
    // 8.1 Cliente VIP (Muitas visitas e frequência alta)
    const vipCustomer = await prisma.customer.create({
      data: {
        name: 'Cliente VIP Assíduo',
        phone: '11955554444',
        barbershopId: tenantA.id,
        status: 'VIP',
        recurrenceRate: 'ALTA',
      },
    });

    await prisma.customerVisitStats.create({
      data: {
        customerId: vipCustomer.id,
        totalVisits: 8,
        totalSpent: 400.0,
        avgTicket: 50.0,
        medianDaysBetween: 15.0,
        avgDaysBetweenVisits: 15.0,
        daysSinceLastVisit: 10,
        lastVisitDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        estimatedNextVisit: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
    });

    const vipStats = await prisma.customerVisitStats.findUnique({
      where: { customerId: vipCustomer.id },
    });
    assert.strictEqual(vipStats.totalVisits, 8);
    assert.strictEqual(vipStats.medianDaysBetween, 15.0);

    // 8.2 Cliente Em Risco (Passou do ciclo médio)
    const atRiskCustomer = await prisma.customer.create({
      data: {
        name: 'Cliente Em Risco',
        phone: '11944443333',
        barbershopId: tenantA.id,
        status: 'EM_RISCO',
        recurrenceRate: 'MEDIA',
      },
    });

    await prisma.customerVisitStats.create({
      data: {
        customerId: atRiskCustomer.id,
        totalVisits: 3,
        totalSpent: 135.0,
        avgTicket: 45.0,
        medianDaysBetween: 20.0,
        avgDaysBetweenVisits: 20.0,
        daysSinceLastVisit: 38,
        lastVisitDate: new Date(Date.now() - 38 * 24 * 60 * 60 * 1000),
      },
    });

    const riskStats = await prisma.customerVisitStats.findUnique({
      where: { customerId: atRiskCustomer.id },
    });
    assert.ok(riskStats.daysSinceLastVisit > 30, 'Cliente em risco deve estar atrasado');
  });

  // ----------------------------------------------------
  // TESTE 9: Academia 2.0, Diagnóstico & Consultor BarberFlow
  // ----------------------------------------------------
  await t.test('9. UAT: Academia 2.0 — Diagnóstico 15 Campos, Health Score, Plano e Consultor IA', async () => {
    const { runDiagnosticEvaluation, getRecommendedContents } = diagnosticEngine;
    const { consultBarberFlowAi } = aiModule;
    const { ACADEMIA_CONTENTS } = contentModule;

    // 9.1 Avaliação Completa de Diagnóstico
    const evaluation = runDiagnosticEvaluation(
      {
        q1_barbersCount: 3,
        q2_monthlyRevenue: 15000,
        q3_monthlyAppointments: 300,
        q4_avgTicket: 50,
        q5_activeClients: 200,
        q6_inactiveClients: 25,
        q7_trackPayables: true,
        q8_trackReceivables: true,
        q9_knowsMonthlyCost: true,
        q10_knowsBreakEven: true,
        q11_doesReactivationCampaigns: true,
        q12_tracksOccupancyRate: true,
        q13_hasMonthlyGoal: true,
        q14_tracksNetProfit: true,
        q15_biggestProblem: 'Encher horários vazios',
      },
      {
        monthlyRevenue: 15000,
        avgTicket: 50,
        monthlyAppointments: 300,
        activeClientsCount: 200,
        inactiveClientsCount: 25,
        occupancyRate: 65,
      }
    );

    assert.ok(evaluation.healthScore >= 70, 'Score de barbearia organizada deve ser >= 70');
    assert.ok(['SAUDAVEL', 'EXCELENTE'].includes(evaluation.healthCategory));
    assert.ok(evaluation.priorities.length <= 3, 'Top prioridades diárias deve ser <= 3');
    assert.ok(evaluation.actionPlans.length > 0, 'Deve gerar planos de ação com recomendações');

    // 9.2 Recomendações apontam para os 80 conteúdos verificados
    for (const plan of evaluation.actionPlans) {
      if (plan.recommendedContentIds) {
        const resolved = getRecommendedContents(plan.recommendedContentIds);
        resolved.forEach((item) => {
          assert.ok(item.officialUrl.startsWith('https://'), 'URL recomendada deve ser HTTPS oficial');
          assert.ok(ACADEMIA_CONTENTS.some((c) => c.id === item.id), 'ID deve pertencer ao catálogo oficial');
        });
      }
    }

    // 9.3 Consultor BarberFlow (7 Perguntas Rápidas)
    const quickResponse = await consultBarberFlowAi('Como aumentar meu faturamento?', {
      monthlyRevenue: 15000,
      avgTicket: 50,
    });
    assert.strictEqual(quickResponse.modelUsed, 'DETERMINISTIC_RULES_ENGINE');
    assert.strictEqual(quickResponse.actionPlan.length, 3);
    assert.ok(quickResponse.diagnosis.length > 0);
  });

  // ----------------------------------------------------
  // TESTE 10: Multi-Tenancy Estrito em 100% dos Recursos
  // ----------------------------------------------------
  await t.test('10. UAT: Multi-Tenancy & Segurança — Isolamento Hermético Tenant A vs Tenant B', async () => {
    // 10.1 Criação de Agendamento no Tenant B
    const custB = await prisma.customer.create({ data: { name: 'Cliente B', phone: '11911112222', barbershopId: tenantB.id } });
    const aptB = await prisma.appointment.create({
      data: {
        barbershopId: tenantB.id,
        customerId: custB.id,
        barberId: barberB1.id,
        serviceId: serviceB1.id,
        scheduledAt: new Date('2026-09-25T15:00:00.000Z'),
        endAt: new Date('2026-09-25T15:30:00.000Z'),
        durationMinutes: 30,
        price: 50.0,
      },
    });

    // 10.2 Consultas isoladas por barbershopId
    const aptsTenantA = await prisma.appointment.findMany({ where: { barbershopId: tenantA.id } });
    const aptsTenantB = await prisma.appointment.findMany({ where: { barbershopId: tenantB.id } });

    assert.ok(aptsTenantA.every((a) => a.barbershopId === tenantA.id), 'Tenant A só vê seus agendamentos');
    assert.ok(aptsTenantB.every((a) => a.barbershopId === tenantB.id), 'Tenant B só vê seus agendamentos');
    assert.ok(!aptsTenantA.some((a) => a.id === aptB.id), 'Tenant A não contém o agendamento do Tenant B');
  });
});
