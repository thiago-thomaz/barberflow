const https = require('https');

function fetchEvgTitle(id) {
  return new Promise((resolve) => {
    https.get(`https://www.escolavirtual.gov.br/curso/${id}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        // Look for course title in h2 or breadcrumbs or specific class
        const m = data.match(/<h2[^>]*class="[^"]*curso-detalhe-title[^"]*"[^>]*>([\s\S]*?)<\/h2>/i) ||
                  data.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i) ||
                  data.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = m ? m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : 'Unknown';
        resolve({ id, status: res.statusCode, title });
      });
    }).on('error', (e) => resolve({ id, status: 'ERROR', title: e.message }));
  });
}

async function main() {
  const ids = [11, 124, 338, 480, 500, 680, 715, 755, 820, 930];
  for (const id of ids) {
    const res = await fetchEvgTitle(id);
    console.log(`[EVG ${id}] ${res.status} -> "${res.title}"`);
  }
}

main().catch(console.error);
