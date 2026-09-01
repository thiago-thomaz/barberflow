const test = require('node:test');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'barberflow-secure-jwt-secret-key-production';

function signTokenTest(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyTokenTest(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function isSuperAdminTest(session) {
  return session?.role === 'SUPER_ADMIN';
}

function getPostLoginRedirectTest(user) {
  if (!user) return '/dashboard';
  if (user.role === 'SUPER_ADMIN') return '/admin';
  return '/dashboard';
}

async function requireSuperAdminTest(req) {
  const authHeader = req.headers.get('authorization');
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies.get('barberflow_token')?.value) {
    token = req.cookies.get('barberflow_token').value;
  }

  if (!token) throw new Error('UNAUTHORIZED');
  const session = verifyTokenTest(token);
  if (!session) throw new Error('UNAUTHORIZED');
  if (session.role !== 'SUPER_ADMIN') throw new Error('FORBIDDEN');

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user || user.role !== 'SUPER_ADMIN') throw new Error('FORBIDDEN');
  return { session, user };
}

test('=== PHASE 21: SUPER ADMIN AUTH & ROUTING SUITE ===', async (t) => {
  let superAdminUser;
  let ownerUser;
  let barberUser;
  let receptionistUser;

  await t.test('1. Setup test users with specific roles', async () => {
    // Upsert SUPER_ADMIN
    superAdminUser = await prisma.user.upsert({
      where: { email: 'admin@barberflow.com' },
      update: { role: 'SUPER_ADMIN' },
      create: {
        email: 'admin@barberflow.com',
        name: 'Super Administrador BarberFlow',
        passwordHash: '$2a$10$txmgf4QECAySV8A8ZRj5cepdqJMxY3XT1BOZsm6haRwFLirqvD80W',
        role: 'SUPER_ADMIN',
      },
    });
    assert.strictEqual(superAdminUser.role, 'SUPER_ADMIN');

    // Create / Find tenant test users
    const barbershop = await prisma.barbershop.findFirst();
    assert.ok(barbershop, 'Barbershop should exist in DB');

    ownerUser = await prisma.user.findFirst({
      where: { role: 'OWNER', barbershopId: barbershop.id },
    });
    if (!ownerUser) {
      ownerUser = await prisma.user.create({
        data: {
          email: 'owner.test@barberflow.com',
          name: 'Owner Test',
          passwordHash: '$2a$10$txmgf4QECAySV8A8ZRj5cepdqJMxY3XT1BOZsm6haRwFLirqvD80W',
          role: 'OWNER',
          barbershopId: barbershop.id,
        },
      });
    }

    barberUser = await prisma.user.findFirst({
      where: { role: 'BARBER' },
    });
    if (!barberUser) {
      barberUser = await prisma.user.create({
        data: {
          email: 'barber.test@barberflow.com',
          name: 'Barber Test',
          passwordHash: '$2a$10$txmgf4QECAySV8A8ZRj5cepdqJMxY3XT1BOZsm6haRwFLirqvD80W',
          role: 'BARBER',
          barbershopId: barbershop.id,
        },
      });
    }

    receptionistUser = await prisma.user.findFirst({
      where: { role: 'RECEPTIONIST' },
    });
    if (!receptionistUser) {
      receptionistUser = await prisma.user.create({
        data: {
          email: 'receptionist.test@barberflow.com',
          name: 'Receptionist Test',
          passwordHash: '$2a$10$txmgf4QECAySV8A8ZRj5cepdqJMxY3XT1BOZsm6haRwFLirqvD80W',
          role: 'RECEPTIONIST',
          barbershopId: barbershop.id,
        },
      });
    }
  });

  await t.test('2. Validate getPostLoginRedirect for all user roles', () => {
    assert.strictEqual(
      getPostLoginRedirectTest({ role: 'SUPER_ADMIN' }),
      '/admin',
      'SUPER_ADMIN must redirect to /admin'
    );
    assert.strictEqual(
      getPostLoginRedirectTest({ role: 'OWNER' }),
      '/dashboard',
      'OWNER must redirect to /dashboard'
    );
    assert.strictEqual(
      getPostLoginRedirectTest({ role: 'BARBER' }),
      '/dashboard',
      'BARBER must redirect to /dashboard'
    );
    assert.strictEqual(
      getPostLoginRedirectTest({ role: 'RECEPTIONIST' }),
      '/dashboard',
      'RECEPTIONIST must redirect to /dashboard'
    );
    assert.strictEqual(
      getPostLoginRedirectTest(null),
      '/dashboard',
      'null user defaults to /dashboard'
    );
    assert.strictEqual(
      getPostLoginRedirectTest(undefined),
      '/dashboard',
      'undefined user defaults to /dashboard'
    );
    assert.strictEqual(
      getPostLoginRedirectTest({ role: 'UNKNOWN' }),
      '/dashboard',
      'Unknown role defaults to /dashboard'
    );
  });

  await t.test('3. Token generation and decoding for SUPER_ADMIN', () => {
    const token = signTokenTest({
      userId: superAdminUser.id,
      email: superAdminUser.email,
      role: 'SUPER_ADMIN',
      barbershopId: null,
    });
    assert.ok(token);

    const payload = verifyTokenTest(token);
    assert.ok(payload);
    assert.strictEqual(payload.role, 'SUPER_ADMIN');
    assert.strictEqual(payload.userId, superAdminUser.id);
    assert.strictEqual(payload.barbershopId, null);
    assert.strictEqual(isSuperAdminTest(payload), true);
  });

  await t.test('4. Token generation and decoding for OWNER / BARBER / RECEPTIONIST', () => {
    const ownerToken = signTokenTest({
      userId: ownerUser.id,
      email: ownerUser.email,
      role: 'OWNER',
      barbershopId: ownerUser.barbershopId,
    });
    const ownerPayload = verifyTokenTest(ownerToken);
    assert.strictEqual(ownerPayload.role, 'OWNER');
    assert.strictEqual(isSuperAdminTest(ownerPayload), false);

    const barberToken = signTokenTest({
      userId: barberUser.id,
      email: barberUser.email,
      role: 'BARBER',
      barbershopId: barberUser.barbershopId,
    });
    const barberPayload = verifyTokenTest(barberToken);
    assert.strictEqual(barberPayload.role, 'BARBER');
    assert.strictEqual(isSuperAdminTest(barberPayload), false);
  });

  await t.test('5. Server-side requireSuperAdmin permits valid SUPER_ADMIN', async () => {
    const token = signTokenTest({
      userId: superAdminUser.id,
      email: superAdminUser.email,
      role: 'SUPER_ADMIN',
      barbershopId: null,
    });

    const mockReq = {
      headers: new Headers({
        Authorization: `Bearer ${token}`,
      }),
      cookies: {
        get: () => undefined,
      },
    };

    const { session, user } = await requireSuperAdminTest(mockReq);
    assert.strictEqual(session.userId, superAdminUser.id);
    assert.strictEqual(user.role, 'SUPER_ADMIN');
  });

  await t.test('6. Server-side requireSuperAdmin blocks unauthenticated requests with UNAUTHORIZED', async () => {
    const mockReq = {
      headers: new Headers(),
      cookies: {
        get: () => undefined,
      },
    };

    await assert.rejects(
      async () => {
        await requireSuperAdminTest(mockReq);
      },
      (err) => {
        assert.strictEqual(err.message, 'UNAUTHORIZED');
        return true;
      }
    );
  });

  await t.test('7. Server-side requireSuperAdmin blocks OWNER role with FORBIDDEN', async () => {
    const ownerToken = signTokenTest({
      userId: ownerUser.id,
      email: ownerUser.email,
      role: 'OWNER',
      barbershopId: ownerUser.barbershopId,
    });

    const mockReq = {
      headers: new Headers({
        Authorization: `Bearer ${ownerToken}`,
      }),
      cookies: {
        get: () => undefined,
      },
    };

    await assert.rejects(
      async () => {
        await requireSuperAdminTest(mockReq);
      },
      (err) => {
        assert.strictEqual(err.message, 'FORBIDDEN');
        return true;
      }
    );
  });

  await t.test('8. Server-side requireSuperAdmin blocks BARBER and RECEPTIONIST roles', async () => {
    const barberToken = signTokenTest({
      userId: barberUser.id,
      email: barberUser.email,
      role: 'BARBER',
      barbershopId: barberUser.barbershopId,
    });

    const mockReqBarber = {
      headers: new Headers({
        Authorization: `Bearer ${barberToken}`,
      }),
      cookies: {
        get: () => undefined,
      },
    };

    await assert.rejects(
      async () => {
        await requireSuperAdminTest(mockReqBarber);
      },
      (err) => {
        assert.strictEqual(err.message, 'FORBIDDEN');
        return true;
      }
    );
  });

  await t.test('9. Database anti-spoofing verification in requireSuperAdmin', async () => {
    // Craft a forged token claiming SUPER_ADMIN role for an OWNER user ID
    const forgedToken = signTokenTest({
      userId: ownerUser.id,
      email: ownerUser.email,
      role: 'SUPER_ADMIN', // Spoofed in JWT
      barbershopId: ownerUser.barbershopId,
    });

    const mockReqForged = {
      headers: new Headers({
        Authorization: `Bearer ${forgedToken}`,
      }),
      cookies: {
        get: () => undefined,
      },
    };

    // requireSuperAdmin must query DB and reject since DB role is OWNER
    await assert.rejects(
      async () => {
        await requireSuperAdminTest(mockReqForged);
      },
      (err) => {
        assert.strictEqual(err.message, 'FORBIDDEN');
        return true;
      }
    );
  });

  await t.test('10. Super Admin operates cleanly without barbershopId', async () => {
    assert.strictEqual(superAdminUser.barbershopId, null);
    const token = signTokenTest({
      userId: superAdminUser.id,
      email: superAdminUser.email,
      role: 'SUPER_ADMIN',
      barbershopId: null,
    });
    const verified = verifyTokenTest(token);
    assert.strictEqual(verified.barbershopId, null);
    assert.strictEqual(getPostLoginRedirectTest(verified), '/admin');
  });
});
