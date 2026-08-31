const https = require('https');

const urls = [
  'https://sebrae.com.br/sites/PortalSebrae/cursosonline/gestao-financeira',
  'https://sebrae.com.br/sites/PortalSebrae/cursosonline/como-controlar-o-fluxo-de-caixa',
  'https://sebrae.com.br/sites/PortalSebrae/cursosonline/como-definir-o-preco-de-venda',
  'https://sebrae.com.br/sites/PortalSebrae/cursosonline/marketing-digital-para-o-empreendedor',
  'https://sebrae.com.br/sites/PortalSebrae/cursosonline/marketing-digital-e-redes-sociais',
  'https://sebrae.com.br/sites/PortalSebrae/cursosonline/atendimento-ao-cliente',
  'https://sebrae.com.br/sites/PortalSebrae/cursosonline/gestao-de-pessoas',
  'https://sebrae.com.br/sites/PortalSebrae/cursosonline/aprender-a-empreender',
  'https://sebrae.com.br/sites/PortalSebrae/cursosonline/customer-success-como-conquistar-e-manter-clientes',
  'https://sebrae.com.br/sites/PortalSebrae/cursosonline/inteligencia-artificial',
  'https://sebrae.com.br/sites/PortalSebrae/cursosonline/modelagem-financeira-para-startups',
  'https://sebrae.com.br/sites/PortalSebrae/cursosonline/estrategias-de-comunicacao-e-marketing',
  'https://sebrae.com.br/sites/PortalSebrae/cursosonline/como-turbinar-suas-vendas',
  'https://sebrae.com.br/sites/PortalSebrae/cursosonline/planejamento-estrategico-para-empreendedores',
  'https://www.ev.org.br/cursos/introducao-a-administracao-estrategica',
  'https://www.ev.org.br/cursos/organizacao-do-tempo',
  'https://www.ev.org.br/cursos/comunicacao-e-relacionamento-no-trabalho',
  'https://www.ev.org.br/cursos/atendimento-ao-publico',
  'https://www.ev.org.br/cursos/educacao-financeira',
  'https://www.ev.org.br/cursos/inovacao-no-ambiente-de-trabalho',
  'https://www.escolavirtual.gov.br/curso/124',
  'https://www.escolavirtual.gov.br/curso/11',
  'https://www.escolavirtual.gov.br/curso/137',
  'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor',
  'https://www.gov.br/receitafederal/pt-br/assuntos/meu-cpf'
];

function checkUrl(targetUrl) {
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
        timeout: 8000
      }, (res) => {
        let body = '';
        res.on('data', chunk => { if (body.length < 20000) body += chunk; });
        res.on('end', () => {
          const match = body.match(/<title[^>]*>([^<]+)<\/title>/i);
          resolve({
            url: targetUrl,
            status: res.statusCode,
            location: res.headers.location || null,
            title: match ? match[1].replace(/\s+/g, ' ').trim() : null
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
  console.log('Testing candidates...\n');
  for (const u of urls) {
    const res = await checkUrl(u);
    console.log(`[${res.status}] ${u}`);
    if (res.location) console.log(`   └ Redirect -> ${res.location}`);
    if (res.title) console.log(`   └ Title: ${res.title}`);
  }
}

main().catch(console.error);
