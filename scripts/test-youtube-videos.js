const https = require('https');
const { ACADEMIA_CONTENTS } = require('../src/lib/academia/content');

const videos = ACADEMIA_CONTENTS.filter(c => c.category === 'VIDEOS');

function checkVideo(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => { if (data.length < 50000) data += c; });
      res.on('end', () => {
        const match = data.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = match ? match[1].replace(/\s+/g, ' ').trim() : null;
        resolve({ url, status: res.statusCode, title });
      });
    }).on('error', (e) => resolve({ url, status: 'ERROR', error: e.message }));
  });
}

async function main() {
  console.log(`Testing ${videos.length} YouTube Videos...\n`);
  for (const v of videos) {
    const res = await checkVideo(v.officialUrl);
    console.log(`[${v.id}] [${v.institution}]`);
    console.log(`   BarberFlow Title: "${v.title}"`);
    console.log(`   YouTube URL: ${v.officialUrl}`);
    console.log(`   HTTP ${res.status} -> Page Title: "${res.title}"`);
    console.log('--------------------------------------------------');
  }
}

main().catch(console.error);
