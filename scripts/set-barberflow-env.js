const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const phpCode = `
$app = App\\Models\\Application::where('uuid', '7ho00pvb569n5m3jgee0fnsi')->first();
$vars = [
  'WAHA_URL' => 'https://evo.projetosunion.cloud',
  'WAHA_API_KEY' => 'bf_waha_sec_9e06180371424a1b80c355fb5dc21182',
  'WAHA_DEFAULT_SESSION' => 'default',
  'WHATSAPP_PROVIDER' => 'WAHA'
];

foreach ($vars as $k => $v) {
  App\\Models\\EnvironmentVariable::updateOrCreate(
    [
      'resourceable_type' => 'App\\Models\\Application',
      'resourceable_id' => $app->id,
      'key' => $k
    ],
    [
      'value' => $v,
      'is_preview' => false,
      'uuid' => (string) Illuminate\\Support\\Str::uuid(),
      'is_runtime' => true,
      'is_buildtime' => true
    ]
  );
  echo "CONFIGURED_$k\\n";
}
`;

  await runRemoteCommand(`cat <<'EOF' > /data/coolify/applications/set_barberflow_env.php\n<?php\nrequire __DIR__ . '/../../../vendor/autoload.php';\n$app = require_once __DIR__ . '/../../../bootstrap/app.php';\n$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);\n$kernel->bootstrap();\n${phpCode}\nEOF`);

  const res = await runRemoteCommand(`docker exec -w /var/www/html coolify php /var/www/html/storage/app/applications/set_barberflow_env.php`);
  console.log('Result:', res.stdout || res.stderr);
}

main().catch(console.error);
