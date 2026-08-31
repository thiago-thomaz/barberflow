const https = require('https');

function fetchPage(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', (e) => resolve({ status: 'ERROR', error: e.message }));
  });
}

function decodeHtml(html) {
  return html
    .replace(/&atilde;/g, 'ã')
    .replace(/&Atilde;/g, 'Ã')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&Ccedil;/g, 'Ç')
    .replace(/&eacute;/g, 'é')
    .replace(/&Eacute;/g, 'É')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&oacute;/g, 'ó')
    .replace(/&aacute;/g, 'á')
    .replace(/&iacute;/g, 'í')
    .replace(/&uacute;/g, 'ú')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');
}

async function main() {
  const allCourses = [];
  const urls = [
    'https://loja.sebrae.com.br/cursos/cursos-online',
    'https://loja.sebrae.com.br/cursos',
    'https://loja.sebrae.com.br/dono-de-pequeno-negocio',
    'https://loja.sebrae.com.br/futuro-empresario',
    'https://loja.sebrae.com.br/mei'
  ];

  for (const u of urls) {
    console.log('Fetching', u);
    const res = await fetchPage(u);
    if (res.status !== 200) continue;

    // Matches <a href="https://loja.sebrae.com.br/..." class="product-card__header"> <img ... alt="..."
    const regex = /<a[^>]*href="(https:\/\/loja\.sebrae\.com\.br\/[^"]+)"[^>]*class="product-card__header"[^>]*>[\s\S]*?alt="([^"]+)"/gi;
    let m;
    while ((m = regex.exec(res.body)) !== null) {
      const link = m[1].trim();
      const title = decodeHtml(m[2].trim());
      if (!allCourses.some(c => c.link === link)) {
        allCourses.push({ title, link });
      }
    }
  }

  console.log(`\nFound ${allCourses.length} distinct Sebrae Courses:\n`);
  allCourses.forEach((c, i) => {
    console.log(`${i + 1}. "${c.title}" -> ${c.link}`);
  });

  const fs = require('fs');
  fs.writeFileSync('scripts/sebrae_courses_official.json', JSON.stringify(allCourses, null, 2));
}

main().catch(console.error);
