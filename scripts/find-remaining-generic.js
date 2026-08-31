const { ACADEMIA_CONTENTS } = require('../src/lib/academia/content.ts');

const genericItems = ACADEMIA_CONTENTS.filter(c => c.officialUrl.endsWith('/cursosonline') || c.officialUrl.endsWith('/cursosonline/'));
console.log('Generic items found:', genericItems.length);
genericItems.forEach(g => {
  console.log(`- [${g.id}] [${g.category}] "${g.title}" -> ${g.officialUrl}`);
});
