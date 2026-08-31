const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const sql = `SELECT email, role, "barbershopId" FROM "User" LIMIT 5;`;
  const res = await runRemoteCommand(`docker exec 9b43ae88482d node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.user.findMany({ select: { id: true, email: true, role: true } }).then(console.log);
  "`);
  console.log(res.stdout);
}

main().catch(console.error);
