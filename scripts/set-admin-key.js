const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const phpCode = `
$app = App\\Models\\Application::where('uuid', 'kfqib7khsae0hnnurptry6bu')->first();
$env = App\\Models\\EnvironmentVariable::where('resourceable_type', 'App\\\\Models\\\\Application')
  ->where('resourceable_id', $app->id)
  ->where('key', 'WAHA_API_KEY')
  ->first();

if ($env) {
  $env->value = 'admin';
  $env->save();
  echo "UPDATED_ENV_TO_ADMIN: " . $env->id . "\\n";
} else {
  $env = new App\\Models\\EnvironmentVariable();
  $env->key = 'WAHA_API_KEY';
  $env->value = 'admin';
  $env->is_preview = false;
  $env->uuid = (string) Illuminate\\Support\\Str::uuid();
  $env->resourceable_type = 'App\\\\Models\\\\Application';
  $env->resourceable_id = $app->id;
  $env->is_runtime = true;
  $env->is_buildtime = true;
  $env->save();
  echo "CREATED_ENV_ADMIN: " . $env->id . "\\n";
}

$deploymentUuid = new_public_id();
$result = queue_application_deployment(
    application: $app,
    deployment_uuid: $deploymentUuid,
    pull_request_id: 0,
    force_rebuild: false,
    is_api: true,
    no_questions_asked: true
);
echo "DEPLOY_QUEUED: " . json_encode($result);
`;

  await runRemoteCommand(`cat <<'EOF' > /data/coolify/applications/set_admin_key.php\n<?php\nrequire __DIR__ . '/../../../vendor/autoload.php';\n$app = require_once __DIR__ . '/../../../bootstrap/app.php';\n$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);\n$kernel->bootstrap();\n${phpCode}\nEOF`);

  const res = await runRemoteCommand(`docker exec -w /var/www/html coolify php /var/www/html/storage/app/applications/set_admin_key.php`);
  console.log('Result:', res.stdout || res.stderr);
}

main().catch(console.error);
