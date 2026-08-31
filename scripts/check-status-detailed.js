const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const sql = `SELECT id, status, deployment_uuid, updated_at FROM application_deployment_queues ORDER BY id DESC LIMIT 5;`;
  const res = await runRemoteCommand(`docker exec coolify-db psql -U coolify -d coolify -c "${sql}"`);
  console.log(res.stdout || res.stderr);

  const ps = await runRemoteCommand(`docker ps --filter name=7ho00pvb569n5m3jgee0fnsi`);
  console.log('App Containers:', ps.stdout || ps.stderr);

  const images = await runRemoteCommand(`docker images --filter reference=7ho00pvb569n5m3jgee0fnsi*`);
  console.log('App Images:', images.stdout || images.stderr);
}

main().catch(console.error);
