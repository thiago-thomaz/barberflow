const https = require('https');

const baseUrl = 'https://evo.projetosunion.cloud';
const apiKey = 'bf_waha_sec_9e06180371424a1b80c355fb5dc21182';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
        ...(options.headers || {})
      }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function runAudit() {
  console.log('==============================================');
  console.log('🧪 WAHA PRODUCTION FULL AUDIT & TEST SUITE');
  console.log('==============================================\n');

  // Test 1: Server Status
  console.log('1️⃣ Testing Server Status (/api/server/status)...');
  const statusRes = await request('/api/server/status');
  console.log('   Status Code:', statusRes.status);
  console.log('   Response:', statusRes.data);
  if (statusRes.status !== 200) throw new Error('Server status check failed');
  console.log('   ✅ PASS\n');

  // Test 2: Server Version
  console.log('2️⃣ Testing Server Version (/api/version)...');
  const verRes = await request('/api/version');
  console.log('   Status Code:', verRes.status);
  console.log('   Engine:', verRes.data.engine, '| Version:', verRes.data.version);
  if (verRes.status !== 200) throw new Error('Version check failed');
  console.log('   ✅ PASS\n');

  // Test 3: List Sessions
  console.log('3️⃣ Testing Sessions List (/api/sessions?all=true)...');
  const sessRes = await request('/api/sessions?all=true');
  console.log('   Status Code:', sessRes.status);
  console.log('   Total Sessions:', Array.isArray(sessRes.data) ? sessRes.data.length : 0);
  if (sessRes.status !== 200) throw new Error('Sessions list failed');
  console.log('   ✅ PASS\n');

  // Test 4: Default Session State
  console.log('4️⃣ Testing Default Session Status (/api/sessions/default)...');
  const defRes = await request('/api/sessions/default');
  console.log('   Status Code:', defRes.status);
  console.log('   Session Status:', defRes.data.status, '| State:', defRes.data.engine?.state);
  if (defRes.status !== 200) throw new Error('Default session check failed');
  console.log('   ✅ PASS\n');

  // Test 5: QR Code Availability
  console.log('5️⃣ Testing QR Code Endpoint (/api/default/auth/qr)...');
  const qrRes = await request('/api/default/auth/qr');
  console.log('   Status Code:', qrRes.status);
  console.log('   QR Content Type:', qrRes.headers['content-type']);
  console.log('   QR Buffer Length:', typeof qrRes.data === 'string' ? qrRes.data.length : 'Binary');
  if (qrRes.status !== 200 && qrRes.status !== 201) throw new Error('QR endpoint check failed');
  console.log('   ✅ PASS\n');

  console.log('==============================================');
  console.log('🎉 ALL 5 WAHA INFRASTRUCTURE CHECKS PASSED (100%)');
  console.log('==============================================');
}

runAudit().catch(err => {
  console.error('❌ AUDIT FAILED:', err.message);
  process.exit(1);
});
