const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

describe('BarberFlow FASE 2 — Testes Automatizados de Core, Multitenancy e Anti-Conflito', () => {
  let tenantA, tenantB;
  let barberA, barberA_Inactive, barberB;
  let serviceA, serviceA_Inactive, serviceB;
  let customerA, customerB;

  before(async () => {
    // Setup clean test tenants
    tenantA = await prisma.barbershop.create({
      data: {
        name: 'Barbearia Teste A',
        slug: `barbearia-a-${Date.now()}`,
      },
    });

    tenantB = await prisma.barbershop.create({
      data: {
        name: 'Barbearia Teste B',
        slug: `barbearia-b-${Date.now()}`,
      },
    });

    // Business hours for Tenant A: Monday to Friday 09:00 - 18:00, Sunday closed
    for (let day = 0; day <= 6; day++) {
      await prisma.businessHours.create({
        data: {
          barbershopId: tenantA.id,
          dayOfWeek: day,
          openTime: '09:00',
          closeTime: '18:00',
          isOpen: day >= 1 && day <= 5, // Mon-Fri open, Sat-Sun closed
        },
      });
    }

    // Barbers
    barberA = await prisma.barber.create({
      data: {
        barbershopId: tenantA.id,
        name: 'Barbeiro Carlos (Tenant A)',
        isActive: true,
      },
    });

    barberA_Inactive = await prisma.barber.create({
      data: {
        barbershopId: tenantA.id,
        name: 'Barbeiro Inativo (Tenant A)',
        isActive: false,
      },
    });

    barberB = await prisma.barber.create({
      data: {
        barbershopId: tenantB.id,
        name: 'Barbeiro Pedro (Tenant B)',
        isActive: true,
      },
    });

    // Services
    serviceA = await prisma.service.create({
      data: {
        barbershopId: tenantA.id,
        name: 'Corte Tradicional (Tenant A)',
        price: 40.0,
        durationMin: 30,
        isActive: true,
      },
    });

    serviceA_Inactive = await prisma.service.create({
      data: {
        barbershopId: tenantA.id,
        name: 'Serviço Inativo (Tenant A)',
        price: 30.0,
        durationMin: 30,
        isActive: false,
      },
    });

    serviceB = await prisma.service.create({
      data: {
        barbershopId: tenantB.id,
        name: 'Barba (Tenant B)',
        price: 35.0,
        durationMin: 30,
        isActive: true,
      },
    });

    // Customers
    customerA = await prisma.customer.create({
      data: {
        barbershopId: tenantA.id,
        name: 'Cliente João (Tenant A)',
        phone: '11999990001',
      },
    });

    customerB = await prisma.customer.create({
      data: {
        barbershopId: tenantB.id,
        name: 'Cliente Maria (Tenant B)',
        phone: '21999990002',
      },
    });
  });

  after(async () => {
    // Cleanup
    if (tenantA) {
      await prisma.appointment.deleteMany({ where: { barbershopId: tenantA.id } });
      await prisma.customer.deleteMany({ where: { barbershopId: tenantA.id } });
      await prisma.barber.deleteMany({ where: { barbershopId: tenantA.id } });
      await prisma.service.deleteMany({ where: { barbershopId: tenantA.id } });
      await prisma.businessHours.deleteMany({ where: { barbershopId: tenantA.id } });
      await prisma.barbershop.delete({ where: { id: tenantA.id } });
    }
    if (tenantB) {
      await prisma.appointment.deleteMany({ where: { barbershopId: tenantB.id } });
      await prisma.customer.deleteMany({ where: { barbershopId: tenantB.id } });
      await prisma.barber.deleteMany({ where: { barbershopId: tenantB.id } });
      await prisma.service.deleteMany({ where: { barbershopId: tenantB.id } });
      await prisma.barbershop.delete({ where: { id: tenantB.id } });
    }
    await prisma.$disconnect();
  });

  // Helper for appointment creation logic directly simulating the backend engine
  async function createAppointmentCore({ tenantId, customerId, barberId, serviceId, scheduledAt }) {
    return await prisma.$transaction(async (tx) => {
      // 1. Validate Barber & active
      const barber = await tx.barber.findFirst({
        where: { id: barberId, barbershopId: tenantId, deletedAt: null },
      });
      if (!barber) throw new Error('BARBER_NOT_FOUND');
      if (!barber.isActive) throw new Error('BARBER_INACTIVE');

      // 2. Validate Customer
      const customer = await tx.customer.findFirst({
        where: { id: customerId, barbershopId: tenantId, deletedAt: null },
      });
      if (!customer) throw new Error('CUSTOMER_NOT_FOUND');

      // 3. Validate Service & active
      const service = await tx.service.findFirst({
        where: { id: serviceId, barbershopId: tenantId, deletedAt: null },
      });
      if (!service) throw new Error('SERVICE_NOT_FOUND');
      if (!service.isActive) throw new Error('SERVICE_INACTIVE');

      const start = new Date(scheduledAt);
      const duration = service.durationMin;
      const end = new Date(start.getTime() + duration * 60 * 1000);

      // 4. Validate Business Hours
      const dayOfWeek = start.getDay();
      const bHours = await tx.businessHours.findUnique({
        where: { barbershopId_dayOfWeek: { barbershopId: tenantId, dayOfWeek } },
      });
      if (bHours) {
        if (!bHours.isOpen) throw new Error('SHOP_CLOSED_DAY');
        const [openH, openM] = bHours.openTime.split(':').map(Number);
        const [closeH, closeM] = bHours.closeTime.split(':').map(Number);
        const startMin = start.getHours() * 60 + start.getMinutes();
        const endMin = end.getHours() * 60 + end.getMinutes();
        if (startMin < openH * 60 + openM || endMin > closeH * 60 + closeM) {
          throw new Error('OUT_OF_BUSINESS_HOURS');
        }
      }

      // 5. Strict Interval Overlap Check:
      // Overlap: (novo_start < existing_end) AND (new_end > existing_start)
      const conflict = await tx.appointment.findFirst({
        where: {
          barberId: barber.id,
          barbershopId: tenantId,
          status: { notIn: ['CANCELADO', 'NO_SHOW'] },
          AND: [{ scheduledAt: { lt: end } }, { endAt: { gt: start } }],
        },
      });

      if (conflict) throw new Error('SCHEDULE_CONFLICT');

      return await tx.appointment.create({
        data: {
          barbershopId: tenantId,
          customerId: customer.id,
          barberId: barber.id,
          serviceId: service.id,
          scheduledAt: start,
          endAt: end,
          durationMinutes: duration,
          price: service.price,
          serviceNameSnapshot: service.name,
          servicePriceSnapshot: service.price,
          status: 'AGENDADO',
        },
      });
    }, { isolationLevel: 'Serializable' });
  }

  // ----------------------------------------------------
  // TEST GROUP 1: MULTITENANCY & ISOLATION
  // ----------------------------------------------------
  test('Multitenant: Cliente do Tenant B não pode ser consultado pelo Tenant A', async () => {
    const found = await prisma.customer.findFirst({
      where: { id: customerB.id, barbershopId: tenantA.id },
    });
    assert.strictEqual(found, null, 'Cliente de Tenant B não deve ser retornado para Tenant A');
  });

  test('Multitenant: Não deve permitir agendar com Barbeiro do Tenant B no Tenant A', async () => {
    await assert.rejects(
      async () => {
        await createAppointmentCore({
          tenantId: tenantA.id,
          customerId: customerA.id,
          barberId: barberB.id, // Wrong tenant
          serviceId: serviceA.id,
          scheduledAt: new Date('2026-09-07T10:00:00Z'), // Monday
        });
      },
      /BARBER_NOT_FOUND/,
      'Tentativa de usar barbeiro de outro tenant deve ser rejeitada'
    );
  });

  test('Multitenant: Não deve permitir agendar com Cliente do Tenant B no Tenant A', async () => {
    await assert.rejects(
      async () => {
        await createAppointmentCore({
          tenantId: tenantA.id,
          customerId: customerB.id, // Wrong tenant
          barberId: barberA.id,
          serviceId: serviceA.id,
          scheduledAt: new Date('2026-09-07T10:00:00Z'),
        });
      },
      /CUSTOMER_NOT_FOUND/,
      'Tentativa de usar cliente de outro tenant deve ser rejeitada'
    );
  });

  test('Multitenant: Não deve permitir agendar com Serviço do Tenant B no Tenant A', async () => {
    await assert.rejects(
      async () => {
        await createAppointmentCore({
          tenantId: tenantA.id,
          customerId: customerA.id,
          barberId: barberA.id,
          serviceId: serviceB.id, // Wrong tenant
          scheduledAt: new Date('2026-09-07T10:00:00Z'),
        });
      },
      /SERVICE_NOT_FOUND/,
      'Tentativa de usar serviço de outro tenant deve ser rejeitada'
    );
  });

  // ----------------------------------------------------
  // TEST GROUP 2: INACTIVE ENTITY VALIDATION
  // ----------------------------------------------------
  test('Regra: Deve impedir agendamento com Barbeiro Inativo', async () => {
    await assert.rejects(
      async () => {
        await createAppointmentCore({
          tenantId: tenantA.id,
          customerId: customerA.id,
          barberId: barberA_Inactive.id,
          serviceId: serviceA.id,
          scheduledAt: new Date('2026-09-07T10:00:00Z'),
        });
      },
      /BARBER_INACTIVE/,
      'Barbeiro inativo deve ser rejeitado'
    );
  });

  test('Regra: Deve impedir agendamento com Serviço Inativo', async () => {
    await assert.rejects(
      async () => {
        await createAppointmentCore({
          tenantId: tenantA.id,
          customerId: customerA.id,
          barberId: barberA.id,
          serviceId: serviceA_Inactive.id,
          scheduledAt: new Date('2026-09-07T10:00:00Z'),
        });
      },
      /SERVICE_INACTIVE/,
      'Serviço inativo deve ser rejeitado'
    );
  });

  // ----------------------------------------------------
  // TEST GROUP 3: BUSINESS HOURS VALIDATION
  // ----------------------------------------------------
  test('Horário: Deve bloquear agendamento em dia fechado (Domingo)', async () => {
    // 2026-09-06 is Sunday
    const sundayDate = new Date('2026-09-06T14:00:00Z');
    assert.strictEqual(sundayDate.getDay(), 0);

    await assert.rejects(
      async () => {
        await createAppointmentCore({
          tenantId: tenantA.id,
          customerId: customerA.id,
          barberId: barberA.id,
          serviceId: serviceA.id,
          scheduledAt: sundayDate,
        });
      },
      /SHOP_CLOSED_DAY/,
      'Agendamento em dia fechado deve ser rejeitado'
    );
  });

  // ----------------------------------------------------
  // TEST GROUP 4: ANTI-CONFLICT & OVERLAP SCENARIOS
  // ----------------------------------------------------
  // Let base appointment be on Monday 2026-09-07 at 14:00 to 14:30 (30 min)
  const baseDate = new Date('2026-09-07T14:00:00Z');

  test('Anti-Conflito 1: Deve criar agendamento base com sucesso', async () => {
    const app = await createAppointmentCore({
      tenantId: tenantA.id,
      customerId: customerA.id,
      barberId: barberA.id,
      serviceId: serviceA.id,
      scheduledAt: baseDate,
    });

    assert.ok(app.id, 'Agendamento base deve ser criado');
    assert.strictEqual(app.status, 'AGENDADO');
    assert.strictEqual(app.serviceNameSnapshot, 'Corte Tradicional (Tenant A)');
    assert.strictEqual(app.price, 40.0);
  });

  test('Anti-Conflito 2: Conflito Exato (mesmo início e mesma duração 14:00 - 14:30)', async () => {
    await assert.rejects(
      async () => {
        await createAppointmentCore({
          tenantId: tenantA.id,
          customerId: customerA.id,
          barberId: barberA.id,
          serviceId: serviceA.id,
          scheduledAt: baseDate, // 14:00
        });
      },
      /SCHEDULE_CONFLICT/,
      'Horário idêntico deve gerar conflito'
    );
  });

  test('Anti-Conflito 3: Conflito Parcial Começando Durante (14:15 - 14:45)', async () => {
    const overlapStart = new Date(baseDate.getTime() + 15 * 60 * 1000); // 14:15
    await assert.rejects(
      async () => {
        await createAppointmentCore({
          tenantId: tenantA.id,
          customerId: customerA.id,
          barberId: barberA.id,
          serviceId: serviceA.id,
          scheduledAt: overlapStart,
        });
      },
      /SCHEDULE_CONFLICT/,
      'Novo agendamento iniciando durante outro existente deve ser rejeitado'
    );
  });

  test('Anti-Conflito 4: Conflito Parcial Terminando Durante (13:45 - 14:15)', async () => {
    const overlapEnd = new Date(baseDate.getTime() - 15 * 60 * 1000); // 13:45 (ends at 14:15)
    await assert.rejects(
      async () => {
        await createAppointmentCore({
          tenantId: tenantA.id,
          customerId: customerA.id,
          barberId: barberA.id,
          serviceId: serviceA.id,
          scheduledAt: overlapEnd,
        });
      },
      /SCHEDULE_CONFLICT/,
      'Novo agendamento terminando durante outro existente deve ser rejeitado'
    );
  });

  test('Anti-Conflito 5: Conflito Englobando (13:30 - 14:30 com serviço de 60min)', async () => {
    // Create 60min service
    const service60 = await prisma.service.create({
      data: {
        barbershopId: tenantA.id,
        name: 'Combo 60 min',
        price: 70,
        durationMin: 60,
      },
    });

    const enclosingStart = new Date(baseDate.getTime() - 15 * 60 * 1000); // 13:45 to 14:45
    await assert.rejects(
      async () => {
        await createAppointmentCore({
          tenantId: tenantA.id,
          customerId: customerA.id,
          barberId: barberA.id,
          serviceId: service60.id,
          scheduledAt: enclosingStart,
        });
      },
      /SCHEDULE_CONFLICT/,
      'Agendamento englobando outro existente deve ser rejeitado'
    );
  });

  test('Anti-Conflito 6: Horário Imediatamente Adjacente Deve Ser Permitido (14:30 - 15:00)', async () => {
    const adjacentStart = new Date(baseDate.getTime() + 30 * 60 * 1000); // 14:30
    const app = await createAppointmentCore({
      tenantId: tenantA.id,
      customerId: customerA.id,
      barberId: barberA.id,
      serviceId: serviceA.id,
      scheduledAt: adjacentStart,
    });

    assert.ok(app.id, 'Horário imediatamente consecutivo deve ser aceito');
  });

  // ----------------------------------------------------
  // TEST GROUP 5: CONCURRENCY RACE CONDITION TEST
  // ----------------------------------------------------
  test('Concorrência: Dois requests simultâneos para o mesmo horário exato - apenas 1 tem sucesso', async () => {
    const concurrentSlot = new Date('2026-09-07T16:00:00Z');

    const results = await Promise.allSettled([
      createAppointmentCore({
        tenantId: tenantA.id,
        customerId: customerA.id,
        barberId: barberA.id,
        serviceId: serviceA.id,
        scheduledAt: concurrentSlot,
      }),
      createAppointmentCore({
        tenantId: tenantA.id,
        customerId: customerA.id,
        barberId: barberA.id,
        serviceId: serviceA.id,
        scheduledAt: concurrentSlot,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.strictEqual(fulfilled.length, 1, 'Exatamente 1 agendamento deve ser criado');
    assert.strictEqual(rejected.length, 1, 'O outro request simultâneo deve ser rejeitado por conflito');
  });
});
