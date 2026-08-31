const https = require('https');

https.get('https://www.escolavirtual.gov.br/curso/124', {
  headers: { 'User-Agent': 'Mozilla/5.0' }
}, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    // Find course name or h1 or main
    const idx = d.indexOf('curso-');
    console.log(d.substring(idx, idx + 600));
  });
});
