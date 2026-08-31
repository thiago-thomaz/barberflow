const https = require('https');

function fetchPage(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => { if (data.length < 500000) data += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', (e) => resolve({ status: 'ERROR', error: e.message }));
  });
}

async function main() {
  const pages = [
    'https://sebrae.com.br/sites/PortalSebrae/cursosonline',
    'https://sebrae.com.br/sites/PortalSebrae/artigos',
    'https://sebrae.com.br/sites/PortalSebrae',
    'https://www.sebrae.com.br/sites/PortalSebrae/cursosonline'
  ];

  for (const p of pages) {
    console.log(`Checking ${p}...`);
    const res = await fetchPage(p);
    console.log(`Status: ${res.status}`);
    if (res.headers.location) console.log(`Redirect: ${res.headers.location}`);

    // Look for all links
    const matches = res.body.match(/href="([^"]+)"/g) || [];
    const sebraeLinks = matches
      .map(m => m.replace(/href="|"/g, ''))
      .filter(href => href.includes('curso') || href.includes('artigo') || href.includes('financeiro') || href.includes('venda') || href.includes('preco') || href.includes('gestao'));

    console.log(`Matched ${sebraeLinks.length} course/article links:`);
    console.log(sebraeLinks.slice(0, 10));
    console.log('-------------------------------------------');
  }
}

main().catch(console.error);
