const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const res = await runRemoteCommand(
    'docker exec 21543f282898 node -e "const { PrismaClient } = require(\'@prisma/client\'); const p = new PrismaClient(); p.user.findMany({ select: { id: true, email: true, role: true } }).then(r => console.log(JSON.stringify(r)));"'
  );
  console.log('Result:', res.stdout);
}

main();
