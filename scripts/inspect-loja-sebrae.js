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
  console.log('Fetching https://loja.sebrae.com.br/cursos/cursos-online...');
  const res = await fetchPage('https://loja.sebrae.com.br/cursos/cursos-online');
  console.log('Status:', res.status);
  console.log('Location:', res.headers.location);

  const matches = res.body.match(/href="([^"]+)"/g) || [];
  const hrefs = matches.map(m => m.replace(/href="|"/g, ''));
  console.log('Total links found:', hrefs.length);

  const courseLinks = hrefs.filter(h => h.includes('loja.sebrae.com.br') || h.includes('curso') || h.includes('sebrae'));
  console.log('\nSample course links:');
  console.log(courseLinks.slice(0, 40));
}

main().catch(console.error);
