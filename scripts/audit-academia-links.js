const https = require('https');
const http = require('http');
const { ACADEMIA_CONTENTS } = require('../src/lib/academia/content');

const ALLOWED_DOMAINS = [
  'sebrae.com.br',
  'www.sebrae.com.br',
  'cursos.sebrae.com.br',
  'ev.org.br',
  'www.ev.org.br',
  'escolavirtual.gov.br',
  'www.escolavirtual.gov.br',
  'portaldaindustria.com.br',
  'www.portaldaindustria.com.br',
  'ead.senai.br',
  'www.gov.br',
  'gov.br',
  'youtube.com',
  'www.youtube.com',
  'youtu.be'
];

function fetchUrlInfo(url, maxRedirects = 5) {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string') {
      return resolve({ status: 'INVALID_URL', httpStatus: null, finalUrl: null, title: null, error: 'Empty URL' });
    }

    let parsed;
    try {
      parsed = new URL(url);
    } catch (err) {
      return resolve({ status: 'INVALID_URL', httpStatus: null, finalUrl: null, title: null, error: 'Malformed URL' });
    }

    const client = parsed.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 10000
    };

    const req = client.request(reqOptions, (res) => {
      // Handle redirects
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && maxRedirects > 0) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = new URL(redirectUrl, url).href;
        }
        res.resume();
        return resolve(fetchUrlInfo(redirectUrl, maxRedirects - 1));
      }

      let body = '';
      res.on('data', (chunk) => {
        if (body.length < 50000) {
          body += chunk.toString('utf-8', 0, 5000);
        }
      });

      res.on('end', () => {
        let pageTitle = null;
        const match = body.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (match) {
          pageTitle = match[1].replace(/\s+/g, ' ').trim();
        }

        resolve({
          status: res.statusCode === 200 ? 'ACCESSIBLE' : 'HTTP_ERROR',
          httpStatus: res.statusCode,
          finalUrl: url,
          pageTitle,
          error: null
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 'TIMEOUT', httpStatus: null, finalUrl: url, pageTitle: null, error: 'Request timeout (10s)' });
    });

    req.on('error', (err) => {
      resolve({ status: 'NETWORK_ERROR', httpStatus: null, finalUrl: url, pageTitle: null, error: err.message });
    });

    req.end();
  });
}

async function auditAllContents() {
  console.log('============================================================');
  console.log(`AUDITORIA COMPLETA DE LINKS DA ACADEMIA (${ACADEMIA_CONTENTS.length} ITENS)`);
  console.log('============================================================\n');

  const auditResults = [];

  for (let i = 0; i < ACADEMIA_CONTENTS.length; i++) {
    const item = ACADEMIA_CONTENTS[i];
    process.stdout.write(`[${i + 1}/${ACADEMIA_CONTENTS.length}] Auditando "${item.title.substring(0, 40)}..." `);

    const info = await fetchUrlInfo(item.officialUrl);
    
    // Check if generic catalog URL
    const isGenericSebrae = item.officialUrl.includes('/cursosonline') && !item.officialUrl.includes('/cursosonline/');
    const isGenericSenai = item.officialUrl.includes('cursos-a-distancia') && !item.officialUrl.includes('cursos-a-distancia/');
    const isGenericPortal = item.officialUrl.endsWith('.br') || item.officialUrl.endsWith('.br/');

    let classification = 'VALID';
    let issueReason = null;

    if (info.status !== 'ACCESSIBLE' || info.httpStatus !== 200) {
      classification = 'INVALID';
      issueReason = `HTTP ${info.httpStatus || info.status}: ${info.error || 'Não acessível'}`;
    } else if (isGenericSebrae || isGenericSenai) {
      classification = 'NEEDS_REVIEW';
      issueReason = 'URL aponta para catálogo genérico e não para o conteúdo específico';
    } else if (item.institution === 'BarberFlow Academy' && item.category === 'COMECE_AQUI') {
      classification = 'NEEDS_REVIEW';
      issueReason = 'Módulo proprietário da trilha apontando para catálogo externo genérico do Sebrae';
    }

    console.log(`-> ${info.httpStatus || info.status} [${classification}]`);

    auditResults.push({
      id: item.id,
      title: item.title,
      institution: item.institution,
      category: item.category,
      format: item.format,
      currentUrl: item.officialUrl,
      httpStatus: info.httpStatus,
      finalUrl: info.finalUrl,
      pageTitle: info.pageTitle,
      classification,
      issueReason,
      isFree: item.isFree,
      certificate: item.certificate,
      duration: item.duration
    });
  }

  const summary = {
    total: auditResults.length,
    valid: auditResults.filter(r => r.classification === 'VALID').length,
    needsReview: auditResults.filter(r => r.classification === 'NEEDS_REVIEW').length,
    invalid: auditResults.filter(r => r.classification === 'INVALID').length,
    duplicates: 0
  };

  console.log('\n============================================================');
  console.log('RESUMO DA AUDITORIA INICIAL');
  console.log('============================================================');
  console.log(`Total Auditados:    ${summary.total}`);
  console.log(`Válidos (Específicos): ${summary.valid}`);
  console.log(`Necessitam Revisão:    ${summary.needsReview}`);
  console.log(`Inválidos/Quebrados:   ${summary.invalid}`);
  console.log('============================================================\n');

  // Save audit results to JSON file for detailed processing
  const fs = require('fs');
  fs.writeFileSync('scripts/audit_results_raw.json', JSON.stringify(auditResults, null, 2));
  console.log('Resultados salvos em scripts/audit_results_raw.json');
}

auditAllContents().catch(console.error);
