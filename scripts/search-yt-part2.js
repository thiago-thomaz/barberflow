const https = require('https');

function searchYouTubeInitialData(query) {
  return new Promise((resolve) => {
    const encoded = encodeURIComponent(query);
    const url = `https://www.youtube.com/results?search_query=${encoded}`;
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const match = data.match(/var ytInitialData = ({[\s\S]*?});<\/script>/i) ||
                      data.match(/ytInitialData\s*=\s*({[\s\S]*?});/i);
        if (!match) return resolve({ query, results: [] });
        try {
          const json = JSON.parse(match[1]);
          const contents = json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
          const videos = [];
          for (const item of contents) {
            const v = item.videoRenderer;
            if (v && v.videoId) {
              const title = v.title?.runs?.[0]?.text || '';
              const channel = v.ownerText?.runs?.[0]?.text || '';
              const duration = v.lengthText?.simpleText || '';
              videos.push({
                videoId: v.videoId,
                title,
                channel,
                duration,
                url: `https://www.youtube.com/watch?v=${v.videoId}`
              });
            }
          }
          resolve({ query, results: videos.slice(0, 5) });
        } catch (e) {
          resolve({ query, results: [], error: e.message });
        }
      });
    }).on('error', (e) => resolve({ query, results: [], error: e.message }));
  });
}

async function main() {
  const queries = [
    'Sebrae como fidelizar clientes recorrencia',
    'Sebrae emissao nota fiscal servico mei nfse nacional',
    'Sebrae gestao do tempo produtividade',
    'SENAI brasil mais produtividade pequenas empresas',
    'Sebrae inteligencia artificial para pequenas empresas'
  ];

  for (const q of queries) {
    const res = await searchYouTubeInitialData(q);
    console.log(`[QUERY] "${q}"`);
    res.results.slice(0, 3).forEach((r, i) => {
      console.log(`   ${i+1}. [${r.channel}] "${r.title}" (${r.duration}) -> ${r.url}`);
    });
    console.log('------------------------------------------------');
  }
}

main().catch(console.error);
