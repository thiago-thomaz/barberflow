const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const sql = `SELECT status, updated_at, deployment_uuid FROM application_deployment_queues ORDER BY id DESC LIMIT 5;`;
  const res = await runRemoteCommand(`docker exec coolify-db psql -U coolify -d coolify -c "${sql}"`);
  console.log(res.stdout || res.stderr);

  const ps = await runRemoteCommand(`docker ps -a --filter name=7ho00pvb569n5m3jgee0fnsi`);
  console.log('All Containers for App:', ps.stdout || ps.stderr);
}

main().catch(console.error);

