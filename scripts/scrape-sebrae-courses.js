const https = require('https');

function fetchPage(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => { if (data.length < 1000000) data += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', (e) => resolve({ status: 'ERROR', error: e.message }));
  });
}

async function scrapeCatalog() {
  console.log('=== SCRAPING SEBRAE OFFICIAL ONLINE COURSES ===\n');
  const allCourses = [];

  for (let page = 1; page <= 6; page++) {
    const url = `https://loja.sebrae.com.br/cursos/cursos-online?p=${page}`;
    console.log(`Fetching page ${page}...`);
    const res = await fetchPage(url);
    if (res.status !== 200) {
      console.log(`Page ${page} status: ${res.status}`);
      continue;
    }

    // Extract product items from Magento catalog
    // <a class="product-item-link" href="..."> Title </a>
    const itemRegex = /<a[^>]*class="[^"]*product-item-link[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    let count = 0;
    while ((match = itemRegex.exec(res.body)) !== null) {
      const link = match[1].trim();
      const title = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (title && link && !allCourses.some(c => c.link === link)) {
        allCourses.push({ title, link });
        count++;
      }
    }
    console.log(`Found ${count} courses on page ${page}`);
  }

  console.log(`\nTotal Official Sebrae Courses Collected: ${allCourses.length}\n`);
  allCourses.forEach((c, i) => {
    console.log(`${i + 1}. "${c.title}" -> ${c.link}`);
  });

  const fs = require('fs');
  fs.writeFileSync('scripts/sebrae_catalog_scraped.json', JSON.stringify(allCourses, null, 2));
}

scrapeCatalog().catch(console.error);
