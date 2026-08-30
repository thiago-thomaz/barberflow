const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const sql = `SELECT logs FROM application_deployment_queues ORDER BY id DESC LIMIT 1;`;
  const res = await runRemoteCommand(`docker exec coolify-db psql -U coolify -d coolify -t -A -c "${sql}"`);
  try {
    const parsed = JSON.parse(res.stdout);
    if (Array.isArray(parsed)) {
      console.log(parsed.map(x => x.output || x).join('\n'));
    } else {
      console.log(parsed);
    }
  } catch (e) {
    console.log(res.stdout || res.stderr);
  }
}

main().catch(console.error);

