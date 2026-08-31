const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const match = data.match(/<title[^>]*>([^<]+)<\/title>/i);
        resolve({ url, status: res.statusCode, title: match ? match[1].replace(/\s+/g, ' ').trim() : null });
      });
    }).on('error', (e) => resolve({ url, status: 'ERROR', error: e.message }));
  });
}

async function main() {
  const senaiUrls = [
    'https://www.portaldaindustria.com.br/senai/canais/educacao-profissional/cursos-a-distancia/',
    'https://ead.sp.senai.br/',
    'https://futuro.digital/gratuitos'
  ];

  for (const u of senaiUrls) {
    const res = await fetchUrl(u);
    console.log(`[${res.status}] ${u} -> Title: ${res.title}`);
  }
}

main().catch(console.error);
