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

async function checkEvCourses() {
  console.log('=== CHECKING FUNDAÇÃO BRADESCO (EV.ORG.BR) COURSES ===\n');
  const res = await fetchPage('https://www.ev.org.br/cursos');
  console.log('EV Catalog Status:', res.status);

  // Match all /cursos/... links
  const regex = /href="(\/cursos\/[^"]+)"/g;
  const courseSlugs = [];
  let m;
  while ((m = regex.exec(res.body)) !== null) {
    if (!courseSlugs.includes(m[1]) && m[1] !== '/cursos' && m[1] !== '/cursos/') {
      courseSlugs.push(m[1]);
    }
  }

  console.log(`Found ${courseSlugs.length} course links on EV.org.br:`);
  console.log(courseSlugs);

  // Check titles of all found courses
  const verifiedEv = [];
  for (const slug of courseSlugs) {
    const pageUrl = `https://www.ev.org.br${slug}`;
    const pageRes = await fetchPage(pageUrl);
    const match = pageRes.body.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = match ? match[1].replace(/\s+/g, ' ').trim() : null;
    const is404 = title && title.includes('404');
    if (!is404) {
      verifiedEv.push({ title, url: pageUrl, slug });
      console.log(`[OK] "${title}" -> ${pageUrl}`);
    }
  }

  const fs = require('fs');
  fs.writeFileSync('scripts/ev_courses_official.json', JSON.stringify(verifiedEv, null, 2));
}

checkEvCourses().catch(console.error);
