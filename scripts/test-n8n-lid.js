const https = require('https');

function sendInboundToN8n(from, text) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      event: 'message',
      session: 'default',
      payload: {
        id: `test_in_${Date.now()}`,
        from: from,
        to: '5514988016163@c.us',
        body: text,
        fromMe: false,
        _data: {
          notifyName: 'Thiago Thomaz'
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

async function main() {
  console.log('Sending "Oi" through n8n inbound webhook for 90464929759328@lid...');
  const res = await sendInboundToN8n('90464929759328@lid', 'Oi');
  console.log('Webhook Response:', res);
}

main().catch(console.error);
