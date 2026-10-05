const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const sql = `SELECT id, name, health_check_enabled, health_check_path, health_check_port, health_check_host, health_check_method, health_check_return_code FROM applications WHERE id = 4;`;
  const res = await runRemoteCommand(`docker exec coolify-db psql -U coolify -d coolify -c "${sql}"`);
  console.log(res.stdout);
}

main().catch(console.error);
