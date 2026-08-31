const fs = require('fs');

const contentSourcesMd = `# Diretório Oficial de Fontes Educacionais — Academia BarberFlow

Este documento relaciona as fontes institucionais, governamentais e acadêmicas oficiais homologadas para curadoria de conteúdos na Academia BarberFlow.

---

## 1. Instituições Homologadas e Domínios Oficiais

### Sebrae (Serviço Brasileiro de Apoio às Micro e Pequenas Empresas)
- **Portal Principal:** \`https://sebrae.com.br\`
- **Plataforma de Cursos Online:** \`https://loja.sebrae.com.br\`
- **Canal Oficial no YouTube:** \`https://www.youtube.com/@Sebrae\`
- **Áreas Temáticas:** Gestão Financeira, Fluxo de Caixa, Precificação, Marketing Digital, Gestão de Pessoas, Atendimento ao Cliente, MEI.

### Fundação Bradesco (Escola Virtual)
- **Portal Oficial:** \`https://www.ev.org.br\`
- **Áreas Temáticas:** Educação Financeira, Contabilidade Empresarial, Atendimento ao Público, Comunicação Empresarial, Ferramentas Digitais e IA.

### Escola Virtual de Governo (ENAP / Governo Federal)
- **Portal Oficial:** \`https://www.escolavirtual.gov.br\`
- **Áreas Temáticas:** Gestão Pública e Estratégica, Direitos do Consumidor, Atendimento ao Cidadão, Inovação.

### SENAI Nacional (Serviço Nacional de Aprendizagem Industrial)
- **Portal Oficial:** \`https://www.portaldaindustria.com.br/senai\`
- **Canal Oficial no YouTube:** \`https://www.youtube.com/@SENAInacional\`
- **Áreas Temáticas:** Produtividade Industrial e Comercial, Metodologia 5S, Processos Operacionais.

### Governo Federal & Órgãos Oficiais (gov.br)
- **Portal do Empreendedor:** \`https://www.gov.br/empresas-e-negocios/pt-br/empreendedor\`
- **Receita Federal do Brasil:** \`https://solucoes.receita.fazenda.gov.br\`
- **Emissor Nacional de NFS-e MEI:** \`https://www.nfse.gov.br\`
- **Legislação Federal (Planalto):** \`https://www.planalto.gov.br\`
  - *Lei do Salão Parceiro:* Lei Federal nº 13.352/2016
  - *Código de Defesa do Consumidor:* Lei Federal nº 8.078/1990
- **ANVISA (Agência Nacional de Vigilância Sanitária):** \`https://www.gov.br/anvisa/pt-br\`
- **ANPD (Autoridade Nacional de Proteção de Dados):** \`https://www.gov.br/anpd/pt-br\`

---

## 2. Política de Curadoria & Conformidade

1. **100% de Gratuidade:** Nenhum conteúdo direcionado exige taxa de matrícula ou cobrança oculta.
2. **Links Diretos:** É terminantemente proibido o uso de páginas genéricas de categoria, agregadores terceiros ou encurtadores de URL.
3. **Segurança:** Todos os links externos são abertos em nova aba com atributo \`rel="noopener noreferrer"\`.
4. **Verificação Semântica Periódica:** As URLs são auditadas para garantir que o título do BarberFlow corresponde exatamente à página de destino.
`;

fs.writeFileSync('docs/ACADEMIA_CONTENT_SOURCES.md', contentSourcesMd);
console.log('docs/ACADEMIA_CONTENT_SOURCES.md generated successfully.');
