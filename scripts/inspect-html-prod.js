const https = require('https');

function fetchHtml(path) {
  return new Promise((resolve, reject) => {
    https.get(`https://barber.projetosunion.cloud${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== VERIFICAÇÃO DETALHADA DO HTML DAS PÁGINAS EM PRODUÇÃO ===\n');
  
  const pages = ['/academia', '/academia/ferramentas', '/academia/ia', '/dashboard'];
  for (const page of pages) {
    const res = await fetchHtml(page);
    console.log(`[HTML] ${page}: HTTP ${res.status}`);
    console.log(`       - Tamanho: ${res.body.length} bytes`);
    
    // Check keywords in HTML/SSR bundle
    const hasAcademia = res.body.includes('Academia') || res.body.includes('academia');
    const hasSidebar = res.body.includes('Gestão Financeira') || res.body.includes('sidebar') || res.body.includes('BarberFlow');
    console.log(`       - Referências de Academia: ${hasAcademia ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`       - Referências de Sidebar: ${hasSidebar ? '✅ SIM' : '❌ NÃO'}`);
  }
}

main().catch(console.error);
