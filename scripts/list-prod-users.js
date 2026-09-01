const { execSync } = require('child_process');

try {
  const result = execSync(
    'ssh -i "C:\\\\Users\\\\Thiago Thomaz\\\\.ssh\\\\id_rsa" -o StrictHostKeyChecking=no root@212.86.109.157 "docker exec d3e2b8dfc38c node -e \\"const { PrismaClient } = require(\'@prisma/client\'); const p = new PrismaClient(); p.user.findMany({ select: { id: true, email: true, role: true } }).then(r => console.log(JSON.stringify(r)));\\""',
    { encoding: 'utf8' }
  );
  console.log('Production Users:', result);
} catch (e) {
  console.error(e.message);
}
