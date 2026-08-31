const fs = require('fs');

const data = JSON.parse(fs.readFileSync('scripts/audit_results_raw.json', 'utf8'));

console.log('=== ITENS QUE NECESSITAM CORREÇÃO / REVISÃO ===\n');

const needsWork = data.filter(d => d.classification !== 'VALID');
console.log(`Total: ${needsWork.length} itens\n`);

needsWork.forEach((item, index) => {
  console.log(`${index + 1}. [${item.id}] [${item.category}] [${item.institution}]`);
  console.log(`   Título: "${item.title}"`);
  console.log(`   URL Atual: ${item.currentUrl}`);
  console.log(`   Motivo: ${item.issueReason}`);
  console.log('------------------------------------------------------------');
});
