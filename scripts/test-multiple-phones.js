const https = require('https');

function sendInboundToN8n(from, text, senderName) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      event: 'message',
      session: 'default',
      payload: {
        id: `test_multi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        from: from,
        to: '5514988016163@c.us',
        body: text,
        fromMe: false,
        _data: {
          notifyName: senderName || 'Cliente Teste'
        }
      }
    });

    const req = https.request('https://n8n.srv1194775.hstgr.cloud/webhook/barberflow-waha-inbound', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function sendDirectToApi(from, text, senderName) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      from: from,
      text: text,
      receiverPhone: '5514988016163',
      senderName: senderName,
      messageId: `api_test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
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

async function runTest() {
  console.log('🧪 Iniciando teste de agendamento com diferentes números e celulares...');

  // Test 1: Celular de São Paulo (DDD 11) - Número Padrão
  console.log('\n--- 1. Testando Número Celular DDD 11 (5511977778888) ---');
  const res1 = await sendDirectToApi('5511977778888@c.us', 'Oi', 'Lucas Silva');
  console.log('Status:', res1.status);
  console.log('Resposta:', res1.data?.result?.reply?.substring(0, 100) + '...');

  // Test 2: Celular do Rio de Janeiro (DDD 21) - Formato de dígitos
  console.log('\n--- 2. Testando Número Celular DDD 21 (5521988887777) ---');
  const res2 = await sendDirectToApi('5521988887777', '1', 'Rafael Rio');
  console.log('Status:', res2.status);
  console.log('Resposta:', res2.data?.result?.reply?.substring(0, 100) + '...');

  // Test 3: Novo celular com WhatsApp LID aleatório (não começa com 904)
  console.log('\n--- 3. Testando Celular com LID aleatório (15982736450192@lid) ---');
  const res3 = await sendDirectToApi('15982736450192@lid', 'Oi', 'Novo Contato LID');
  console.log('Status:', res3.status);
  console.log('Resposta:', res3.data?.result?.reply?.substring(0, 100) + '...');

  // Test 4: Envio através do Webhook WAHA/n8n Inbound
  console.log('\n--- 4. Testando via n8n Webhook Inbound para outro número ---');
  const resN8n = await sendInboundToN8n('5514991112233@c.us', 'Oi', 'Cliente N8N');
  console.log('N8N Response:', resN8n);

  console.log('\n✅ Todos os testes executados com sucesso!');
}

runTest().catch(console.error);
