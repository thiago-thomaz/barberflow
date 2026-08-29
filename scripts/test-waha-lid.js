const { runRemoteCommand } = require('./vps-exec');

async function testWahaSend() {
  console.log('Testing WAHA send to 90464929759328@lid...');
  const resLid = await runRemoteCommand(`curl -s -X POST https://evo.projetosunion.cloud/api/sendText \\
    -H "Content-Type: application/json" \\
    -H "X-Api-Key: bf_waha_sec_9e06180371424a1b80c355fb5dc21182" \\
    -d '{"session":"default","chatId":"90464929759328@lid","text":"Teste BarberFlow LID"}'`);
  console.log('LID Result:', resLid.stdout || resLid.stderr);

  console.log('\nTesting WAHA send to 90464929759328@c.us...');
  const resCus = await runRemoteCommand(`curl -s -X POST https://evo.projetosunion.cloud/api/sendText \\
    -H "Content-Type: application/json" \\
    -H "X-Api-Key: bf_waha_sec_9e06180371424a1b80c355fb5dc21182" \\
    -d '{"session":"default","chatId":"90464929759328@c.us","text":"Teste BarberFlow CUS"}'`);
  console.log('C.US Result:', resCus.stdout || resCus.stderr);
}

testWahaSend().catch(console.error);
