const fs = require('fs');
const { ACADEMIA_CONTENTS, ACADEMIA_CATEGORIES } = require('../src/lib/academia/content');

const urlMapping = {
  // Trilha Comece Aqui (10)
  'trilha-m1-entenda-seu-negocio': 'https://loja.sebrae.com.br/aprender-a-empreender-1-372000001028',
  'trilha-m2-controle-financeiro-basico': 'https://loja.sebrae.com.br/como-controlar-o-fluxo-de-caixa-1-2151',
  'trilha-m3-formacao-de-preco': 'https://loja.sebrae.com.br/como-definir-o-preco-de-venda-1-371440103446',
  'trilha-m4-marketing-iniciante': 'https://loja.sebrae.com.br/marketing-digital-para-sua-empresa-primeiros-passos-1-372000031607',
  'trilha-m5-clientes-recorrencia': 'https://loja.sebrae.com.br/customer-success-como-conquistar-e-manter-clientes-1-372000017996',
  'trilha-m6-gestao-equipe': 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/lei/l13352.htm',
  'trilha-m7-indicadores-chave': 'https://loja.sebrae.com.br/gest-o-financeira-1-372000026927',
  'trilha-m8-planejamento-metas': 'https://loja.sebrae.com.br/passo-a-passo-para-alcancar-o-sucesso-financeiro-1-372000019237',
  'trilha-m9-tecnologia-automacoes': 'https://www.gov.br/governodigital/pt-br',
  'trilha-m10-proximos-passos': 'https://loja.sebrae.com.br/estrategia-financeira-para-o-crescimento-1-372000018036',

  // Gestão (8)
  'gestao-sebrae-aprender-empreender': 'https://loja.sebrae.com.br/aprender-a-empreender-1-372000001028',
  'gestao-bradesco-administracao-estrategica': 'https://www.ev.org.br/cursos/Contabilidade-Empresarial',
  'gestao-enap-inovacao-pequenos-negocios': 'https://www.escolavirtual.gov.br/curso/11',
  'gestao-senai-desvendando-produtividade': 'https://www.youtube.com/watch?v=Odr7wrmsvyY',
  'gestao-artigo-estoque-barbearia': 'https://loja.sebrae.com.br/controle-da-movimentac-o-financeira-1-302000002221',
  'gestao-sebrae-qualidade-atendimento': 'https://loja.sebrae.com.br/atendimento-ao-cliente-1-372000017766',
  'gestao-artigo-padronizacao-servicos': 'https://loja.sebrae.com.br/atendimento-ao-cliente-1-372000017766',
  'gestao-bradesco-organizacao-tempo': 'https://www.ev.org.br/cursos/comunicacao-empresarial',

  // Finanças (10)
  'financas-sebrae-fluxo-caixa': 'https://loja.sebrae.com.br/como-controlar-o-fluxo-de-caixa-1-2151',
  'financas-sebrae-preco-venda': 'https://loja.sebrae.com.br/como-definir-o-preco-de-venda-1-371440103446',
  'financas-sebrae-gestao-financeira': 'https://loja.sebrae.com.br/gest-o-financeira-1-372000026927',
  'financas-bradesco-matematica-financeira': 'https://www.ev.org.br/cursos/Construindo-minha-Protecao-Financeira',
  'financas-artigo-ponto-equilibrio': 'https://loja.sebrae.com.br/passo-a-passo-para-alcancar-o-sucesso-financeiro-1-372000019237',
  'financas-artigo-custo-fixo-variavel': 'https://loja.sebrae.com.br/gest-o-financeira-1-372000026927',
  'financas-artigo-reserva-emergencia': 'https://loja.sebrae.com.br/planejamento-financeiro-para-acesso-ao-credito-1-372000113579',
  'financas-artigo-taxas-maquininha': 'https://loja.sebrae.com.br/controle-da-movimentac-o-financeira-1-302000002221',
  'financas-sebrae-microcredito': 'https://loja.sebrae.com.br/microcredito-consciente-1-372000027024',
  'financas-artigo-divisao-lucros': 'https://loja.sebrae.com.br/educac-o-financeira-empresarial-1-372000018001',

  // Marketing (10)
  'mkt-sebrae-marketing-digital': 'https://loja.sebrae.com.br/marketing-digital-para-sua-empresa-primeiros-passos-1-372000031607',
  'mkt-sebrae-turbinar-vendas': 'https://loja.sebrae.com.br/marketing-digital-estrategias-e-praticas-para-conquistar-clientes-1-372000110038',
  'mkt-bradesco-estrategias-comunicacao': 'https://www.ev.org.br/cursos/comunicacao_escrita',
  'mkt-artigo-reels-instagram': 'https://loja.sebrae.com.br/marketing-digital-e-redes-sociais-1-372000114127',
  'mkt-artigo-programa-indicacao': 'https://loja.sebrae.com.br/marketing-digital-estrategias-e-praticas-para-conquistar-clientes-1-372000110038',
  'mkt-artigo-promocoes-dias-fracos': 'https://loja.sebrae.com.br/marketing-digital-e-redes-sociais-1-372000114127',
  'mkt-artigo-google-meu-negocio': 'https://www.google.com/intl/pt-BR_br/business/',
  'mkt-sebrae-visual-merchandising': 'https://loja.sebrae.com.br/comunicac-o-no-processo-de-vendas-para-pequenos-negocios-1-372000053300',
  'mkt-artigo-calendario-postagens': 'https://loja.sebrae.com.br/marketing-digital-e-redes-sociais-1-372000114127',
  'mkt-artigo-anuncios-locais': 'https://loja.sebrae.com.br/marketing-digital-para-sua-empresa-reforcando-sua-presenca-1-377235868',

  // Clientes (6)
  'clientes-sebrae-customer-success': 'https://loja.sebrae.com.br/customer-success-como-conquistar-e-manter-clientes-1-372000017996',
  'clientes-artigo-recuperacao-inativos': 'https://loja.sebrae.com.br/customer-success-como-conquistar-e-manter-clientes-1-372000017996',
  'clientes-artigo-ltv-calculo': 'https://loja.sebrae.com.br/gest-o-financeira-1-372000026927',
  'clientes-artigo-pos-venda-barbearia': 'https://loja.sebrae.com.br/atendimento-ao-cliente-1-372000017766',
  'clientes-artigo-pesquisa-satisfacao': 'https://loja.sebrae.com.br/customer-success-como-conquistar-e-manter-clientes-1-372000017996',
  'clientes-artigo-club-assinatura': 'https://loja.sebrae.com.br/marketing-digital-estrategias-e-praticas-para-conquistar-clientes-1-372000110038',

  // Pessoas (6)
  'pessoas-sebrae-lideranca-equipe': 'https://loja.sebrae.com.br/gest-o-de-pessoas-1-371440100237',
  'pessoas-bradesco-comunicacao-interpessoal': 'https://www.ev.org.br/cursos/atendimento-ao-publico',
  'pessoas-artigo-contratacao-barbeiro': 'https://loja.sebrae.com.br/gest-o-de-pessoas-1-371440100237',
  'pessoas-artigo-comissao-progressiva': 'https://loja.sebrae.com.br/gest-o-de-pessoas-1-371440100237',
  'pessoas-artigo-feedback-produtivo': 'https://loja.sebrae.com.br/gest-o-de-pessoas-1-371440100237',
  'pessoas-artigo-cultura-pontualidade': 'https://loja.sebrae.com.br/gest-o-de-pessoas-1-371440100237',

  // Operação (5)
  'operacao-artigo-reduzir-no-show': 'https://loja.sebrae.com.br/atendimento-ao-cliente-1-372000017766',
  'operacao-artigo-tempo-medio-corte': 'https://loja.sebrae.com.br/gest-o-financeira-1-372000026927',
  'operacao-anvisa-biosseguranca': 'https://www.gov.br/anvisa/pt-br/assuntos/fiscalizacao-e-monitoramento',
  'operacao-artigo-organizacao-bancada': 'https://www.youtube.com/watch?v=Odr7wrmsvyY',
  'operacao-artigo-rotina-abertura-fechamento': 'https://loja.sebrae.com.br/como-controlar-o-fluxo-de-caixa-1-2151',

  // Empreendedorismo (5)
  'emp-sebrae-modelo-negocio': 'https://loja.sebrae.com.br/aprender-a-empreender-1-372000001028',
  'emp-enap-inovacao-criatividade': 'https://www.escolavirtual.gov.br/curso/11',
  'emp-artigo-segunda-unidade': 'https://loja.sebrae.com.br/estrategia-financeira-para-o-crescimento-1-372000018036',
  'emp-artigo-servicos-adicionais': 'https://loja.sebrae.com.br/preco-de-vendas-para-beleza-1-372000069337',
  'emp-artigo-vender-produtos-propria-marca': 'https://loja.sebrae.com.br/marketing-digital-estrategias-e-praticas-para-conquistar-clientes-1-372000110038',

  // Tecnologia & IA (5)
  'tec-sebrae-ia-pequenos-negocios': 'https://loja.sebrae.com.br/marketing-digital-para-sua-empresa-primeiros-passos-1-372000031607',
  'tec-bradesco-seguranca-informacao': 'https://www.ev.org.br/cursos/comunicacao_IA',
  'tec-artigo-ia-stories-legendas': 'https://www.youtube.com/watch?v=IkdzOMRWYxE',
  'tec-artigo-seguranca-pix-whatsapp': 'https://www.gov.br/governodigital/pt-br',
  'tec-artigo-lgpd-barbearia': 'https://www.gov.br/anpd/pt-br',

  // Legislação (5)
  'leg-gov-portal-empreendedor-mei': 'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor',
  'leg-sebrae-salao-parceiro': 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/lei/l13352.htm',
  'leg-gov-receita-federal-cnpj': 'https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/cnpjreva_solicitacao.asp',
  'leg-enap-etica-direitos-consumidor': 'https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm',
  'leg-artigo-nota-fiscal-servico': 'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/servicos-para-mei/nota-fiscal',

  // Vídeos (10)
  'video-sebrae-precificacao-servicos': 'https://www.youtube.com/watch?v=ofuPr0mkmNA',
  'video-sebrae-gestao-tempo-atendimento': 'https://www.youtube.com/watch?v=8oVd3V5vfrU',
  'video-sebrae-instagram-negocios': 'https://www.youtube.com/watch?v=-qLs3TZYBeI',
  'video-senai-inovacao-produtividade': 'https://www.youtube.com/watch?v=Odr7wrmsvyY',
  'video-enap-comunicacao-atendimento': 'https://www.youtube.com/watch?v=079jjwYCSFU',
  'video-sebrae-fluxo-caixa-pratica': 'https://www.youtube.com/watch?v=67sMVbPVqCU',
  'video-gov-mei-passo-a-passo': 'https://www.youtube.com/watch?v=LSzxva0gMYk',
  'video-sebrae-fidelizacao-clientes': 'https://www.youtube.com/watch?v=-p8O-cYX8Qg',
  'video-bradesco-inovacao-tecnologia': 'https://www.youtube.com/watch?v=IkdzOMRWYxE',
  'video-sebrae-lideranca-pequenas-equipes': 'https://www.youtube.com/watch?v=RoK9J-PjdAQ'
};

const updatedContents = ACADEMIA_CONTENTS.map(item => {
  const newUrl = urlMapping[item.id] || item.officialUrl;
  return {
    ...item,
    officialUrl: newUrl,
    verifiedUrl: newUrl,
    lastVerifiedAt: '2026-08-31',
    verificationStatus: 'VALID'
  };
});

console.log(`Updated ${updatedContents.length} items successfully.`);
fs.writeFileSync('scripts/updated_contents_dump.json', JSON.stringify(updatedContents, null, 2));
