const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const phpCode = `
$app = App\\Models\\Application::where('uuid', 'kfqib7khsae0hnnurptry6bu')->first();
$env = App\\Models\\EnvironmentVariable::updateOrCreate(
  [
    'resourceable_type' => 'App\\Models\\Application',
    'resourceable_id' => $app->id,
    'key' => 'WAHA_API_KEY'
  ],
  [
    'value' => 'bf_waha_sec_9e06180371424a1b80c355fb5dc21182',
    'is_preview' => false,
    'is_shown_once' => false,
    'is_multiline' => false,
    'is_literal' => false,
    'uuid' => (string) Illuminate\\Support\\Str::uuid(),
    'is_runtime' => true,
    'is_buildtime' => true
  ]
);
echo "SUCCESS_ENV_ID: " . $env->id;
`;

  await runRemoteCommand(`cat <<'EOF' > /data/coolify/applications/set_waha_key.php\n<?php\nrequire __DIR__ . '/../../../vendor/autoload.php';\n$app = require_once __DIR__ . '/../../../bootstrap/app.php';\n$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);\n$kernel->bootstrap();\n${phpCode}\nEOF`);

  const res = await runRemoteCommand(`docker exec -w /var/www/html coolify php /var/www/html/storage/app/applications/set_waha_key.php`);
  console.log('Result:', res.stdout || res.stderr);
}

main().catch(console.error);
