const https = require('https');

function getUrlWithRedirects(targetUrl, maxRedirects = 5) {
  return new Promise((resolve) => {
    try {
      const u = new URL(targetUrl);
      const req = https.request({
        hostname: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000
      }, (res) => {
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && maxRedirects > 0) {
          let loc = res.headers.location;
          if (!loc.startsWith('http')) loc = new URL(loc, targetUrl).href;
          res.resume();
          return resolve(getUrlWithRedirects(loc, maxRedirects - 1));
        }

        let body = '';
        res.on('data', chunk => { if (body.length < 50000) body += chunk; });
        res.on('end', () => {
          const match = body.match(/<title[^>]*>([^<]+)<\/title>/i);
          const title = match ? match[1].replace(/\s+/g, ' ').trim() : null;
          const is404 = body.includes('Não Encontrado') || body.includes('404') || (title && title.includes('404'));
          resolve({
            url: targetUrl,
            status: res.statusCode,
            title,
            is404,
            length: body.length
          });
        });
      });
      req.on('error', (e) => resolve({ url: targetUrl, status: 'ERROR', error: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ url: targetUrl, status: 'TIMEOUT' }); });
      req.end();
    } catch (e) {
      resolve({ url: targetUrl, status: 'MALFORMED' });
    }
  });
}

async function main() {
  const sebraeUrls = [
    'https://sebrae.com.br/sites/portalsebrae/cursosonline/gestao-financeira',
    'https://sebrae.com.br/sites/portalsebrae/cursosonline/como-controlar-o-fluxo-de-caixa',
    'https://sebrae.com.br/sites/portalsebrae/cursosonline/como-definir-o-preco-de-venda',
    'https://sebrae.com.br/sites/portalsebrae/cursosonline/marketing-digital-para-o-empreendedor',
    'https://sebrae.com.br/sites/portalsebrae/cursosonline/marketing-digital-e-redes-sociais',
    'https://sebrae.com.br/sites/portalsebrae/cursosonline/atendimento-ao-cliente',
    'https://sebrae.com.br/sites/portalsebrae/cursosonline/gestao-de-pessoas',
    'https://sebrae.com.br/sites/portalsebrae/cursosonline/aprender-a-empreender',
    'https://sebrae.com.br/sites/portalsebrae/cursosonline/customer-success-como-conquistar-e-manter-clientes',
    'https://sebrae.com.br/sites/portalsebrae/cursosonline/estrategias-de-comunicacao-e-marketing',
    'https://sebrae.com.br/sites/portalsebrae/cursosonline/como-turbinar-suas-vendas',
    'https://sebrae.com.br/sites/portalsebrae/cursosonline/planejamento-estrategico-para-empreendedores'
  ];

  console.log('=== VERIFICANDO LINKS DO SEBRAE COM REDIRECIONAMENTO ===\n');
  for (const u of sebraeUrls) {
    const res = await getUrlWithRedirects(u);
    console.log(`[${res.status}] Title: "${res.title}" | is404: ${res.is404} | URL: ${res.url}`);
  }
}

main().catch(console.error);
