const https = require('https');

function searchYouTubeOfficial(query) {
  return new Promise((resolve) => {
    const encoded = encodeURIComponent(query);
    const url = `https://www.youtube.com/results?search_query=${encoded}`;
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => { if (data.length < 500000) data += c; });
      res.on('end', () => {
        // Extract videoIds and titles
        // "videoId":"xxxxxx" ... "title":{"runs":[{"text":"..."
        const matches = [];
        const regex = /"videoId":"([a-zA-Z0-9_-]{11})"[^}]*?"title":\{"runs":\[\{"text":"([^"]+)"/g;
        let m;
        while ((m = regex.exec(data)) !== null && matches.length < 5) {
          matches.push({ videoId: m[1], title: m[2], url: `https://www.youtube.com/watch?v=${m[1]}` });
        }
        resolve({ query, results: matches });
      });
    }).on('error', (e) => resolve({ query, results: [], error: e.message }));
  });
}

async function main() {
  const queries = [
    'Sebrae como definir o preco de venda',
    'Sebrae como controlar o fluxo de caixa',
    'Sebrae marketing digital e redes sociais',
    'Sebrae atendimento ao cliente encantamento',
    'Sebrae gestao de pessoas lideranca equipe',
    'Sebrae como reter clientes fidelizacao',
    'Portal do Empreendedor como emitir nota fiscal mei',
    'Fundacao Bradesco organizacao do tempo produtividade',
    'SENAI metodologia produtividade pequenas empresas',
    'ENAP excelencia atendimento publico'
  ];

  console.log('Searching Official YouTube Videos...\n');
  const officialVideos = [];
  for (const q of queries) {
    const res = await searchYouTubeOfficial(q);
    console.log(`Query: "${q}"`);
    if (res.results.length > 0) {
      const top = res.results[0];
      console.log(`   -> [${top.videoId}] "${top.title}" (${top.url})`);
      officialVideos.push({ query: q, top });
    } else {
      console.log('   -> No results');
    }
  }

  const fs = require('fs');
  fs.writeFileSync('scripts/official_youtube_scraped.json', JSON.stringify(officialVideos, null, 2));
}

main().catch(console.error);
