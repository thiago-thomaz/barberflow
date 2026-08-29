const https = require('https');

function sendMsg(from, text, slug = 'barber-shop') {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ from, text, tenantSlug: slug, messageId: `test_flow_${Date.now()}` });
    const req = https.request('https://barber.projetosunion.cloud/api/webhooks/whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function testFlows() {
  console.log('==================================================');
  console.log('🧪 WHATSAPP LIVE SERVER FUNCTIONAL & FLOW AUDIT');
  console.log('==================================================\n');

  const testPhone = '5514999990002';
  const slug = 'barber-shop';

  // 1. Test Menu
  console.log('1️⃣ Test "Oi" -> Main Menu...');
  const res1 = await sendMsg(testPhone, 'Oi', slug);
  console.log('   Status:', res1.status);
  console.log('   Reply:\n' + res1.data.result?.reply);
  if (!res1.data.result?.reply.includes('Encerrar atendimento')) {
    throw new Error('Menu test failed');
  }
  console.log('   ✅ PASS\n');

  // 2. Test "Encerrar"
  console.log('2️⃣ Test "Encerrar" session exit...');
  const res2 = await sendMsg(testPhone, 'Encerrar', slug);
  console.log('   Reply:\n' + res2.data.result?.reply);
  if (!res2.data.result?.reply.includes('Atendimento encerrado')) {
    throw new Error('Exit test failed');
  }
  console.log('   ✅ PASS\n');

  // 3. Test "#sair"
  console.log('3️⃣ Test "#sair" command...');
  const res3 = await sendMsg(testPhone, '#sair', slug);
  console.log('   Reply:\n' + res3.data.result?.reply);
  if (!res3.data.result?.reply.includes('Atendimento encerrado')) {
    throw new Error('#sair test failed');
  }
  console.log('   ✅ PASS\n');

  // 4. Test Service selection & "0" Voltar
  console.log('4️⃣ Test "1" (Agendar) then "0" (Voltar)...');
  await sendMsg(testPhone, 'Oi', slug);
  const res4a = await sendMsg(testPhone, '1', slug);
  console.log('   In service selection:', res4a.data.result?.state);
  const res4b = await sendMsg(testPhone, '0', slug);
  console.log('   After typing 0 (Voltar):\n' + res4b.data.result?.reply);
  if (res4b.data.result?.state !== 'IDLE') throw new Error('Voltar test failed');
  console.log('   ✅ PASS\n');

  console.log('==================================================');
  console.log('🎉 ALL ENGINE EXIT & NAVIGATION FLOWS VALIDATED');
  console.log('==================================================');
}

testFlows().catch(err => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
