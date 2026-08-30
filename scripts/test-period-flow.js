const https = require('https');

function sendToApi(from, text, senderName) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      from: from,
      text: text,
      receiverPhone: '5514988016163',
      senderName: senderName,
      messageId: `test_period_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    });

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
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function run() {
  const testPhone = '5511999887766@c.us';
  console.log('🧪 Iniciando teste do novo fluxo de agendamento por período (07h às 23h)...');

  console.log('\n--- 1. Resetando/Iniciando Menu ---');
  let r = await sendToApi(testPhone, 'MENU', 'Carlos Teste');
  console.log('Bot:', r.data?.result?.reply);

  console.log('\n--- 2. Selecionando 1 - Agendar Horário ---');
  r = await sendToApi(testPhone, '1', 'Carlos Teste');
  console.log('Bot:', r.data?.result?.reply);

  console.log('\n--- 3. Selecionando Serviço 1 - Corte ---');
  r = await sendToApi(testPhone, '1', 'Carlos Teste');
  console.log('Bot:', r.data?.result?.reply);

  console.log('\n--- 4. Selecionando Barbeiro 1 ---');
  r = await sendToApi(testPhone, '1', 'Carlos Teste');
  console.log('Bot:', r.data?.result?.reply);

  console.log('\n--- 5. Selecionando Data 1 (Amanhã) -> Deve retornar Filtro de Período ---');
  r = await sendToApi(testPhone, '1', 'Carlos Teste');
  console.log('Bot:\n' + r.data?.result?.reply);

  console.log('\n--- 6. Selecionando 1 - Manhã (07h às 12h) ---');
  r = await sendToApi(testPhone, '1', 'Carlos Teste');
  console.log('Bot:\n' + r.data?.result?.reply);

  console.log('\n--- 7. Testando 0 - Voltar para trocar período ---');
  r = await sendToApi(testPhone, '0', 'Carlos Teste');
  console.log('Bot:\n' + r.data?.result?.reply);

  console.log('\n--- 8. Selecionando 3 - Noite (18h às 23h) ---');
  r = await sendToApi(testPhone, '3', 'Carlos Teste');
  console.log('Bot:\n' + r.data?.result?.reply);

  console.log('\n--- 9. Selecionando Horário Livre (Opção 1) ---');
  r = await sendToApi(testPhone, '1', 'Carlos Teste');
  console.log('Bot:\n' + r.data?.result?.reply);

  console.log('\n✅ Teste de fluxo por período validado com sucesso!');
}

run().catch(console.error);
