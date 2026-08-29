const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const phpCode = `
$app = App\\Models\\Application::where('uuid', '7ho00pvb569n5m3jgee0fnsi')->first();
$deploymentUuid = new_public_id();
$result = queue_application_deployment(
    application: $app,
    deployment_uuid: $deploymentUuid,
    pull_request_id: 0,
    force_rebuild: true,
    is_api: true,
    no_questions_asked: true
);
echo "BARBERFLOW_DEPLOY_RESULT: " . json_encode($result);
`;

  await runRemoteCommand(`cat <<'EOF' > /data/coolify/applications/deploy_barberflow.php\n<?php\nrequire __DIR__ . '/../../../vendor/autoload.php';\n$app = require_once __DIR__ . '/../../../bootstrap/app.php';\n$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);\n$kernel->bootstrap();\n${phpCode}\nEOF`);

  const res = await runRemoteCommand(`docker exec -w /var/www/html coolify php /var/www/html/storage/app/applications/deploy_barberflow.php`);
  console.log(res.stdout || res.stderr);
}

main().catch(console.error);
