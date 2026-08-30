const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const containerRes = await runRemoteCommand(`docker ps -q --filter name=7ho00`);
  const containerId = (containerRes.stdout || '').trim().split('\n')[0];
  console.log('Target container on VPS:', containerId);

  const nodeScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const shops = await prisma.barbershop.findMany();
  console.log('Found shops:', shops.length);

  for (const shop of shops) {
    console.log('Updating hours for shop:', shop.name, shop.id);
    // Delete and recreate business hours covering 07:00 to 23:00 for all days (0 to 6)
    await prisma.businessHours.deleteMany({ where: { barbershopId: shop.id } });
    
    for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
      await prisma.businessHours.create({
        data: {
          barbershopId: shop.id,
          dayOfWeek,
          openTime: '07:00',
          closeTime: '23:00',
          isOpen: true,
        }
      });
    }
  }
  console.log('Business hours updated successfully to 07:00 - 23:00!');
}

run().catch(console.error);
`;

  await runRemoteCommand(`cat <<'EOF' > /tmp/update_hours.js\n${nodeScript}\nEOF`);
  await runRemoteCommand(`docker cp /tmp/update_hours.js ${containerId}:/app/update_hours.js`);
  const res = await runRemoteCommand(`docker exec ${containerId} node /app/update_hours.js`);
  console.log(res.stdout || res.stderr);
}

main().catch(console.error);
