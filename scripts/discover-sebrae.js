const https = require('https');

function fetchPage(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => { if (data.length < 200000) data += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', (e) => resolve({ status: 'ERROR', error: e.message }));
  });
}

async function main() {
  console.log('Fetching Sebrae cursos structure...');
  const res = await fetchPage('https://sebrae.com.br/cursos');
  console.log('Status /cursos:', res.status);
  if (res.headers.location) console.log('Redirect to:', res.headers.location);

  // Extract all links that contain "curso" or "conteudo"
  const links = [];
  const regex = /href="([^"]*curso[^"]*|[^"]*conteudo[^"]*)"/gi;
  let match;
  while ((match = regex.exec(res.body)) !== null) {
    if (!links.includes(match[1])) links.push(match[1]);
  }
  console.log('Found course links on Sebrae:', links.slice(0, 25));
}

main().catch(console.error);
