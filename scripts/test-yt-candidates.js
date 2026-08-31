const https = require('https');

function fetchYoutube(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => { if (data.length < 500000) data += c; });
      res.on('end', () => {
        const m = data.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = m ? m[1].replace(/ - YouTube$/i, '').trim() : null;
        resolve({ status: res.statusCode, title, isUnavailable: data.includes('Este vídeo não está disponível') || data.includes('Video unavailable') });
      });
    }).on('error', (e) => resolve({ status: 'ERROR', title: e.message }));
  });
}

// Official YouTube videos from Sebrae, Bradesco, Senai, Gov.br
const candidateVideos = [
  { id: 'sebrae-preco', url: 'https://www.youtube.com/watch?v=8kY10rRkPlo', expected: 'Como definir o preço de venda' },
  { id: 'sebrae-fluxo', url: 'https://www.youtube.com/watch?v=J3Y8jR7oJ0M', expected: 'Fluxo de caixa' },
  { id: 'sebrae-atendimento', url: 'https://www.youtube.com/watch?v=m6l1yv_L9_M', expected: 'Atendimento' },
  { id: 'sebrae-mkt', url: 'https://www.youtube.com/watch?v=0jZ6_X9eF5M', expected: 'Marketing' },
  { id: 'gov-mei', url: 'https://www.youtube.com/watch?v=2TzF7Y-B0G0', expected: 'MEI' }
];

async function main() {
  console.log('Testing Candidate Videos...\n');
  for (const c of candidateVideos) {
    const res = await fetchYoutube(c.url);
    console.log(`[${c.id}] Status: ${res.status} | Title: "${res.title}" | Unavailable: ${res.isUnavailable}`);
  }
}

main().catch(console.error);
