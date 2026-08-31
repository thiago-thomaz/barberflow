const fs = require('fs');
const { ACADEMIA_CONTENTS } = require('../src/lib/academia/content.ts');

const directCorrections = {
  'financas-artigo-custo-fixo-vs-variavel': 'https://loja.sebrae.com.br/gest-o-financeira-1-372000026927',
  'financas-sebrae-estrategias-credito': 'https://loja.sebrae.com.br/planejamento-financeiro-para-acesso-ao-credito-1-372000113579',
  'financas-artigo-lucro-distribuicao': 'https://loja.sebrae.com.br/educac-o-financeira-empresarial-1-372000018001',
  'mkt-artigo-reels-barbearia': 'https://loja.sebrae.com.br/marketing-digital-e-redes-sociais-1-372000114127',
  'mkt-artigo-promocoes-horarios-ociosos': 'https://loja.sebrae.com.br/marketing-digital-e-redes-sociais-1-372000114127',
  'mkt-artigo-google-maps-seo': 'https://www.google.com/intl/pt-BR_br/business/'
};

const fixedContents = ACADEMIA_CONTENTS.map(item => {
  if (directCorrections[item.id]) {
    return {
      ...item,
      officialUrl: directCorrections[item.id],
      verifiedUrl: directCorrections[item.id],
      lastVerifiedAt: '2026-08-31',
      verificationStatus: 'VALID'
    };
  }
  return item;
});

fs.writeFileSync('scripts/updated_contents_dump.json', JSON.stringify(fixedContents, null, 2));
console.log('Fixed dump saved.');
