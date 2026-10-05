const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const updateSql = `UPDATE applications SET health_check_enabled = true, health_check_path = '/api/health', health_check_port = '3000', health_check_return_code = 200, health_check_interval = 20, health_check_timeout = 5, health_check_retries = 3 WHERE id = 4;`;
  await runRemoteCommand(`docker exec coolify-db psql -U coolify -d coolify -c "${updateSql}"`);

  // Verify
  const sql = `SELECT id, name, health_check_enabled, health_check_path, health_check_port, health_check_return_code FROM applications WHERE id = 4;`;
  const res = await runRemoteCommand(`docker exec coolify-db psql -U coolify -d coolify -c "${sql}"`);
  console.log(res.stdout);
}

main().catch(console.error);
