const https = require('https');

function check(url) {
  return new Promise(r => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        const m = b.match(/<title[^>]*>([^<]+)<\/title>/i);
        r({ url, status: res.statusCode, title: m ? m[1].replace(/\s+/g, ' ').trim() : null });
      });
    }).on('error', e => r({ url, status: 'ERROR', error: e.message }));
  });
}

async function main() {
  const urls = [
    'https://www.gov.br/anvisa/pt-br',
    'https://www.gov.br/anvisa/pt-br/assuntos/fiscalizacao-e-monitoramento',
    'https://www.gov.br/governodigital/pt-br',
    'https://www.gov.br/governodigital/pt-br/seguranca-da-informacao',
    'https://www.gov.br/anpd/pt-br',
    'https://www.gov.br/anpd/pt-br/assuntos/guias-orientativos',
    'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/servicos-para-mei/nota-fiscal'
  ];

  for (const u of urls) {
    const res = await check(u);
    console.log(`[${res.status}] ${u} -> Title: "${res.title}"`);
  }
}

main().catch(console.error);
