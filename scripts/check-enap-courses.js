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
      res.on('end', () => {
        const match = data.match(/<title[^>]*>([^<]+)<\/title>/i);
        const h1 = data.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        resolve({
          url,
          status: res.statusCode,
          title: match ? match[1].replace(/\s+/g, ' ').trim() : null,
          h1: h1 ? h1[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : null
        });
      });
    }).on('error', (e) => resolve({ url, status: 'ERROR', error: e.message }));
  });
}

async function checkEvg() {
  console.log('=== CHECKING ENAP / ESCOLA VIRTUAL GOV COURSES ===\n');
  const ids = [11, 60, 124, 294, 338, 344, 400, 480, 500, 680];
  for (const id of ids) {
    const u = `https://www.escolavirtual.gov.br/curso/${id}`;
    const res = await fetchPage(u);
    console.log(`[${res.status}] ${u} -> H1: "${res.h1}" | Title: "${res.title}"`);
  }
}

checkEvg().catch(console.error);
