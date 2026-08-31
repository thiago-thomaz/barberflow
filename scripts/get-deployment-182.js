const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const sql = `SELECT json_build_object('id', id, 'status', status, 'uuid', deployment_uuid, 'updated_at', updated_at, 'logs', logs) FROM application_deployment_queues WHERE id = 182;`;
  const res = await runRemoteCommand(`docker exec coolify-db psql -U coolify -d coolify -t -A -c "${sql}"`);
  try {
    const obj = JSON.parse(res.stdout.trim());
    console.log(`=== ID ${obj.id} | UUID ${obj.uuid} | STATUS: ${obj.status} ===`);
    const logs = typeof obj.logs === 'string' ? JSON.parse(obj.logs) : obj.logs;
    if (Array.isArray(logs)) {
      console.log(logs.map(x => x.output || x).slice(-25).join('\n'));
    }
  } catch(e) {
    console.log(res.stdout || res.stderr);
  }
}

main().catch(console.error);
