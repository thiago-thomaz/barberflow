const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const sql = `SELECT json_build_object('id', id, 'status', status, 'uuid', deployment_uuid, 'updated_at', updated_at, 'logs', logs) FROM application_deployment_queues WHERE id >= 180 ORDER BY id ASC;`;
  const res = await runRemoteCommand(`docker exec coolify-db psql -U coolify -d coolify -t -A -c "${sql}"`);
  const rows = res.stdout.trim().split('\n');
  for (const row of rows) {
    if (!row) continue;
    try {
      const obj = JSON.parse(row);
      console.log(`\n=== ID ${obj.id} | UUID ${obj.uuid} | STATUS: ${obj.status} | UPDATED: ${obj.updated_at} ===`);
      const logs = typeof obj.logs === 'string' ? JSON.parse(obj.logs) : obj.logs;
      if (Array.isArray(logs)) {
        const textLines = logs.map(x => x.output || x);
        console.log(textLines.slice(-15).join('\n'));
      }
    } catch(e) {
      console.log('Parse error:', e.message);
    }
  }
}

main().catch(console.error);
