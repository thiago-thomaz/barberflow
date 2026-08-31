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
  const res = await fetchPage('https://sebrae.com.br/sites/portalsebrae/cursosonline');
  console.log('Status:', res.status);
  console.log('Location:', res.headers.location);
  console.log('Body snippet:\n', res.body.substring(0, 1500));

  // Extract all hrefs
  const matches = res.body.match(/href="([^"]+)"/g) || [];
  const hrefs = matches.map(m => m.replace(/href="|"/g, ''));
  console.log('\nTotal links found:', hrefs.length);
  const sample = hrefs.filter(h => h.includes('sebrae') || h.startsWith('/')).slice(0, 30);
  console.log('Sample links:\n', sample);
}

main().catch(console.error);
