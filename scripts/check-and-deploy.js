const { runRemoteCommand } = require('./vps-exec');

async function main() {
  console.log('--- Checking Coolify Apps ---');
  const appsSql = `SELECT id, name, fqdn, git_repository, git_branch, status FROM applications WHERE fqdn LIKE '%barber%';`;
  const appsRes = await runRemoteCommand(`docker exec coolify-db psql -U coolify -d coolify -c "${appsSql}"`);
  console.log(appsRes.stdout);

  console.log('--- Checking Latest Deployments ---');
  const depSql = `SELECT id, application_id, deployment_uuid, status, created_at, updated_at FROM application_deployment_queues ORDER BY id DESC LIMIT 5;`;
  const depRes = await runRemoteCommand(`docker exec coolify-db psql -U coolify -d coolify -c "${depSql}"`);
  console.log(depRes.stdout);
}

main().catch(console.error);
