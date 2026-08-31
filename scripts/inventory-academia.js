const { ACADEMIA_CONTENTS } = require('../src/lib/academia/content');

console.log('Total de Conteúdos:', ACADEMIA_CONTENTS.length);

const categoriesCount = {};
const institutionsCount = {};

ACADEMIA_CONTENTS.forEach(item => {
  categoriesCount[item.category] = (categoriesCount[item.category] || 0) + 1;
  institutionsCount[item.institution] = (institutionsCount[item.institution] || 0) + 1;
});

console.log('\nPor Categoria:', categoriesCount);
console.log('\nPor Instituição:', institutionsCount);

console.log('\nExemplos de URLs cadastradas:');
ACADEMIA_CONTENTS.slice(0, 20).forEach((item, i) => {
  console.log(`${i+1}. [${item.id}] [${item.institution}] "${item.title}" -> ${item.officialUrl}`);
});
