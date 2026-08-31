const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const sql = `SELECT json_build_object('id', id, 'status', status, 'uuid', deployment_uuid, 'updated_at', updated_at, 'logs', logs) FROM application_deployment_queues WHERE id = 184;`;
  const res = await runRemoteCommand(`docker exec coolify-db psql -U coolify -d coolify -t -A -c "${sql}"`);
  const row = res.stdout.trim();
  if (row) {
    const obj = JSON.parse(row);
    console.log(`=== ID ${obj.id} | UUID ${obj.uuid} | STATUS: ${obj.status} | UPDATED: ${obj.updated_at} ===`);
    const logs = typeof obj.logs === 'string' ? JSON.parse(obj.logs) : obj.logs;
    if (Array.isArray(logs)) {
      const textLines = logs.map(x => x.output || x);
      console.log(textLines.slice(-15).join('\n'));
    }
  }
}

main().catch(console.error);
