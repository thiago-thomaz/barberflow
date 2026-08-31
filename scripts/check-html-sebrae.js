const https = require('https');

https.get('https://loja.sebrae.com.br/cursos/cursos-online', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    // Find snippets around gest-o or marketing
    const idx = data.indexOf('gest-o-financeira');
    if (idx !== -1) {
      console.log('Snippet around gest-o-financeira:');
      console.log(data.substring(idx - 200, idx + 400));
    } else {
      console.log('Not found in raw html');
    }
  });
});
