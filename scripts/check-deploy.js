const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const sql = `SELECT status, updated_at FROM application_deployment_queues ORDER BY id DESC LIMIT 3;`;
  const res = await runRemoteCommand(`docker exec coolify-db psql -U coolify -d coolify -c "${sql}"`);
  console.log(res.stdout || res.stderr);

  const ps = await runRemoteCommand(`docker ps | grep -E 'barberflow|7ho00'`);
  console.log('Containers:', ps.stdout || ps.stderr);
}

main().catch(console.error);
