const { ACADEMIA_CONTENTS } = require('../src/lib/academia/content');

console.log('=== LISTA COMPLETA DOS 80 ITENS ATUAIS ===\n');

ACADEMIA_CONTENTS.forEach((item, index) => {
  console.log(`${index + 1}. [${item.id}] [${item.category}] [${item.institution}]`);
  console.log(`   Título: "${item.title}"`);
  console.log(`   Formato: ${item.format} | Gratuito: ${item.isFree} | Certificado: ${item.certificate} | Duração: ${item.duration}`);
  console.log(`   URL Atual: ${item.officialUrl}`);
  console.log('------------------------------------------------------------');
});
