const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const ps = await runRemoteCommand(`docker ps | grep 7ho00 | awk '{print $1}'`);
  const container = ps.stdout.trim().split('\n')[0];
  console.log('Target container:', container);

  const nodeScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const info = await prisma.$queryRawUnsafe('PRAGMA table_info(AppointmentReminder);');
  console.log('Current columns:', info.map(c => c.name));

  const hasBarbershopId = info.some(c => c.name === 'barbershopId');
  if (!hasBarbershopId) {
    console.log('Adding column barbershopId to AppointmentReminder...');
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE AppointmentReminder ADD COLUMN barbershopId TEXT;');
      console.log('Successfully added barbershopId!');
    } catch (e) {
      console.error('Error adding column:', e.message);
    }
  } else {
    console.log('Column barbershopId already exists.');
  }

  // Also check if any existing reminder needs barbershopId populated from Appointment
  try {
    await prisma.$executeRawUnsafe(\`
      UPDATE AppointmentReminder
      SET barbershopId = (SELECT barbershopId FROM Appointment WHERE Appointment.id = AppointmentReminder.appointmentId)
      WHERE barbershopId IS NULL;
    \`);
    console.log('Populated barbershopId from Appointment table.');
  } catch (e) {
    console.log('Update notice:', e.message);
  }
}

run().catch(console.error);
`;

  await runRemoteCommand(`cat <<'EOF' > /tmp/fix_db.js\n${nodeScript}\nEOF`);
  await runRemoteCommand(`docker cp /tmp/fix_db.js ${container}:/app/fix_db.js`);
  const res = await runRemoteCommand(`docker exec ${container} node /app/fix_db.js`);
  console.log(res.stdout || res.stderr);
}

main().catch(console.error);
