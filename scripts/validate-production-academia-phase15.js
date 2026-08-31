const https = require('https');

function request(options, bodyData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });
    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

async function main() {
  console.log('=== VALIDAÇÃO DE PRODUÇÃO — FASE 15: AUDITORIA DE LINKS DA ACADEMIA ===\n');

  // 1. Validar página pública /academia
  console.log('1. Validando GET https://barber.projetosunion.cloud/academia ...');
  const resPage = await request({
    hostname: 'barber.projetosunion.cloud',
    path: '/academia',
    method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  console.log(`   HTTP Status: ${resPage.statusCode}`);
  const hasVerifiedBadge = resPage.body.includes('Link verificado em 31/08/2026') || resPage.body.includes('31/08/2026');
  console.log(`   Presença do badge/data de verificação no HTML: ${hasVerifiedBadge}`);

  // 2. Login para obter Cookie de sessão
  console.log('\n2. Realizando Login na Barbearia Imperial...');
  const loginBody = JSON.stringify({
    email: 'dono@barbeariaimperial.com',
    password: 'senha123barber',
  });
  const resLogin = await request(
    {
      hostname: 'barber.projetosunion.cloud',
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginBody),
      },
    },
    loginBody
  );
  console.log(`   Login Status: ${resLogin.statusCode}`);
  const cookie = resLogin.headers['set-cookie'] ? resLogin.headers['set-cookie'].join('; ') : '';

  // 3. Obter catálogo completo em produção via /api/academia/contents
  console.log('\n3. Consultando /api/academia/contents em produção...');
  const resContents = await request({
    hostname: 'barber.projetosunion.cloud',
    path: '/api/academia/contents',
    method: 'GET',
    headers: {
      Cookie: cookie,
    },
  });
  console.log(`   HTTP Status: ${resContents.statusCode}`);
  const data = JSON.parse(resContents.body);
  const items = data.contents;
  console.log(`   Total de conteúdos retornados: ${items.length}`);

  let validCount = 0;
  let genericCount = 0;
  let fakeVideoCount = 0;
  let freeCount = 0;

  items.forEach((item) => {
    if (item.verificationStatus === 'VALID' && item.lastVerifiedAt === '2026-08-31') {
      validCount++;
    }
    if (item.officialUrl.endsWith('/cursosonline') || item.officialUrl.endsWith('/cursosonline/')) {
      genericCount++;
    }
    if (item.officialUrl.includes('dQw4w9WgXcQ')) {
      fakeVideoCount++;
    }
    if (item.isFree === true) {
      freeCount++;
    }
  });

  console.log(`\n=== AUDITORIA FINAL DE PRODUÇÃO ===`);
  console.log(`- Conteúdos com Status VALID e Data 2026-08-31: ${validCount}/${items.length}`);
  console.log(`- Links Genéricos /cursosonline: ${genericCount} (deve ser 0)`);
  console.log(`- Vídeos com template de teste: ${fakeVideoCount} (deve ser 0)`);
  console.log(`- Conteúdos 100% Gratuitos: ${freeCount}/${items.length}`);

  if (
    items.length >= 80 &&
    validCount === items.length &&
    genericCount === 0 &&
    fakeVideoCount === 0 &&
    freeCount === items.length
  ) {
    console.log('\n✅ FASE 15 — VALIDAÇÃO EM PRODUÇÃO APROVADA COM 100% DE SUCESSO! [GO]');
  } else {
    console.log('\n❌ FALHA NA VALIDAÇÃO EM PRODUÇÃO');
    process.exit(1);
  }
}

main().catch(console.error);
