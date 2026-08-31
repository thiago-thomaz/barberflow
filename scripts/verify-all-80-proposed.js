const https = require('https');
const http = require('http');

function checkDirectUrl(url) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const client = u.protocol === 'https:' ? https : http;
      const req = client.request({
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 8000
      }, (res) => {
        let body = '';
        res.on('data', c => { if (body.length < 20000) body += c; });
        res.on('end', () => {
          const match = body.match(/<title[^>]*>([^<]+)<\/title>/i);
          resolve({
            url,
            status: res.statusCode,
            title: match ? match[1].replace(/\s+/g, ' ').trim() : null
          });
        });
      });
      req.on('error', (e) => resolve({ url, status: 'ERROR', error: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ url, status: 'TIMEOUT' }); });
      req.end();
    } catch (e) {
      resolve({ url, status: 'MALFORMED' });
    }
  });
}

// Full updated mapping list
const updatedItems = [
  // Trilha Comece Aqui (10)
  { id: 'trilha-m1-entenda-seu-negocio', url: 'https://loja.sebrae.com.br/aprender-a-empreender-1-372000001028' },
  { id: 'trilha-m2-controle-financeiro-basico', url: 'https://loja.sebrae.com.br/como-controlar-o-fluxo-de-caixa-1-2151' },
  { id: 'trilha-m3-formacao-de-preco', url: 'https://loja.sebrae.com.br/como-definir-o-preco-de-venda-1-371440103446' },
  { id: 'trilha-m4-marketing-iniciante', url: 'https://loja.sebrae.com.br/marketing-digital-para-sua-empresa-primeiros-passos-1-372000031607' },
  { id: 'trilha-m5-clientes-recorrencia', url: 'https://loja.sebrae.com.br/customer-success-como-conquistar-e-manter-clientes-1-372000017996' },
  { id: 'trilha-m6-gestao-equipe', url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/lei/l13352.htm' },
  { id: 'trilha-m7-indicadores-chave', url: 'https://loja.sebrae.com.br/gest-o-financeira-1-372000026927' },
  { id: 'trilha-m8-planejamento-metas', url: 'https://loja.sebrae.com.br/passo-a-passo-para-alcancar-o-sucesso-financeiro-1-372000019237' },
  { id: 'trilha-m9-tecnologia-automacoes', url: 'https://www.gov.br/governodigital/pt-br' },
  { id: 'trilha-m10-proximos-passos', url: 'https://loja.sebrae.com.br/estrategia-financeira-para-o-crescimento-1-372000018036' },

  // Gestão & Metas (8)
  { id: 'gestao-sebrae-aprender-empreender', url: 'https://loja.sebrae.com.br/aprender-a-empreender-1-372000001028' },
  { id: 'gestao-bradesco-administracao-estrategica', url: 'https://www.ev.org.br/cursos/Contabilidade-Empresarial' },
  { id: 'gestao-enap-inovacao-pequenos-negocios', url: 'https://www.escolavirtual.gov.br/curso/11' },
  { id: 'gestao-senai-desvendando-produtividade', url: 'https://www.youtube.com/watch?v=Odr7wrmsvyY' },
  { id: 'gestao-artigo-estoque-barbearia', url: 'https://loja.sebrae.com.br/controle-da-movimentac-o-financeira-1-302000002221' },
  { id: 'gestao-sebrae-qualidade-atendimento', url: 'https://loja.sebrae.com.br/atendimento-ao-cliente-1-372000017766' },
  { id: 'gestao-artigo-padronizacao-servicos', url: 'https://loja.sebrae.com.br/atendimento-ao-cliente-1-372000017766' },
  { id: 'gestao-bradesco-organizacao-tempo', url: 'https://www.ev.org.br/cursos/comunicacao-empresarial' },

  // Finanças (10)
  { id: 'financas-sebrae-fluxo-caixa', url: 'https://loja.sebrae.com.br/como-controlar-o-fluxo-de-caixa-1-2151' },
  { id: 'financas-sebrae-preco-venda', url: 'https://loja.sebrae.com.br/como-definir-o-preco-de-venda-1-371440103446' },
  { id: 'financas-sebrae-gestao-financeira', url: 'https://loja.sebrae.com.br/gest-o-financeira-1-372000026927' },
  { id: 'financas-bradesco-matematica-financeira', url: 'https://www.ev.org.br/cursos/Construindo-minha-Protecao-Financeira' },
  { id: 'financas-artigo-ponto-equilibrio', url: 'https://loja.sebrae.com.br/passo-a-passo-para-alcancar-o-sucesso-financeiro-1-372000019237' },
  { id: 'financas-artigo-custo-fixo-variavel', url: 'https://loja.sebrae.com.br/gest-o-financeira-1-372000026927' },
  { id: 'financas-artigo-reserva-emergencia', url: 'https://loja.sebrae.com.br/planejamento-financeiro-para-acesso-ao-credito-1-372000113579' },
  { id: 'financas-artigo-taxas-maquininha', url: 'https://loja.sebrae.com.br/controle-da-movimentac-o-financeira-1-302000002221' },
  { id: 'financas-sebrae-microcredito', url: 'https://loja.sebrae.com.br/microcredito-consciente-1-372000027024' },
  { id: 'financas-artigo-divisao-lucros', url: 'https://loja.sebrae.com.br/educac-o-financeira-empresarial-1-372000018001' },

  // Marketing & Vendas (10)
  { id: 'mkt-sebrae-marketing-digital', url: 'https://loja.sebrae.com.br/marketing-digital-para-sua-empresa-primeiros-passos-1-372000031607' },
  { id: 'mkt-sebrae-turbinar-vendas', url: 'https://loja.sebrae.com.br/marketing-digital-estrategias-e-praticas-para-conquistar-clientes-1-372000110038' },
  { id: 'mkt-bradesco-estrategias-comunicacao', url: 'https://www.ev.org.br/cursos/comunicacao_escrita' },
  { id: 'mkt-artigo-reels-instagram', url: 'https://loja.sebrae.com.br/marketing-digital-e-redes-sociais-1-372000114127' },
  { id: 'mkt-artigo-programa-indicacao', url: 'https://loja.sebrae.com.br/marketing-digital-estrategias-e-praticas-para-conquistar-clientes-1-372000110038' },
  { id: 'mkt-artigo-promocoes-dias-fracos', url: 'https://loja.sebrae.com.br/marketing-digital-e-redes-sociais-1-372000114127' },
  { id: 'mkt-artigo-google-meu-negocio', url: 'https://www.google.com/intl/pt-BR_br/business/' },
  { id: 'mkt-sebrae-visual-merchandising', url: 'https://loja.sebrae.com.br/comunicac-o-no-processo-de-vendas-para-pequenos-negocios-1-372000053300' },
  { id: 'mkt-artigo-calendario-postagens', url: 'https://loja.sebrae.com.br/marketing-digital-e-redes-sociais-1-372000114127' },
  { id: 'mkt-artigo-anuncios-locais', url: 'https://loja.sebrae.com.br/marketing-digital-para-sua-empresa-reforcando-sua-presenca-1-377235868' },

  // Clientes & Recorrência (6)
  { id: 'clientes-sebrae-customer-success', url: 'https://loja.sebrae.com.br/customer-success-como-conquistar-e-manter-clientes-1-372000017996' },
  { id: 'clientes-artigo-recuperacao-inativos', url: 'https://loja.sebrae.com.br/customer-success-como-conquistar-e-manter-clientes-1-372000017996' },
  { id: 'clientes-artigo-ltv-calculo', url: 'https://loja.sebrae.com.br/gest-o-financeira-1-372000026927' },
  { id: 'clientes-artigo-pos-venda-barbearia', url: 'https://loja.sebrae.com.br/atendimento-ao-cliente-1-372000017766' },
  { id: 'clientes-artigo-pesquisa-satisfacao', url: 'https://loja.sebrae.com.br/customer-success-como-conquistar-e-manter-clientes-1-372000017996' },
  { id: 'clientes-artigo-club-assinatura', url: 'https://loja.sebrae.com.br/marketing-digital-estrategias-e-praticas-para-conquistar-clientes-1-372000110038' },

  // Pessoas & Equipe (6)
  { id: 'pessoas-sebrae-lideranca-equipe', url: 'https://loja.sebrae.com.br/gest-o-de-pessoas-1-371440100237' },
  { id: 'pessoas-bradesco-comunicacao-interpessoal', url: 'https://www.ev.org.br/cursos/atendimento-ao-publico' },
  { id: 'pessoas-artigo-contratacao-barbeiro', url: 'https://loja.sebrae.com.br/gest-o-de-pessoas-1-371440100237' },
  { id: 'pessoas-artigo-comissao-progressiva', url: 'https://loja.sebrae.com.br/gest-o-de-pessoas-1-371440100237' },
  { id: 'pessoas-artigo-feedback-produtivo', url: 'https://loja.sebrae.com.br/gest-o-de-pessoas-1-371440100237' },
  { id: 'pessoas-artigo-cultura-pontualidade', url: 'https://loja.sebrae.com.br/gest-o-de-pessoas-1-371440100237' },

  // Operação & Agenda (5)
  { id: 'operacao-artigo-reduzir-no-show', url: 'https://loja.sebrae.com.br/atendimento-ao-cliente-1-372000017766' },
  { id: 'operacao-artigo-tempo-medio-corte', url: 'https://loja.sebrae.com.br/gest-o-financeira-1-372000026927' },
  { id: 'operacao-anvisa-biosseguranca', url: 'https://www.gov.br/anvisa/pt-br/assuntos/fiscalizacao-e-monitoramento' },
  { id: 'operacao-artigo-organizacao-bancada', url: 'https://www.youtube.com/watch?v=Odr7wrmsvyY' },
  { id: 'operacao-artigo-rotina-abertura-fechamento', url: 'https://loja.sebrae.com.br/como-controlar-o-fluxo-de-caixa-1-2151' },

  // Empreendedorismo (5)
  { id: 'emp-sebrae-modelo-negocio', url: 'https://loja.sebrae.com.br/aprender-a-empreender-1-372000001028' },
  { id: 'emp-enap-inovacao-criatividade', url: 'https://www.escolavirtual.gov.br/curso/11' },
  { id: 'emp-artigo-segunda-unidade', url: 'https://loja.sebrae.com.br/estrategia-financeira-para-o-crescimento-1-372000018036' },
  { id: 'emp-artigo-servicos-adicionais', url: 'https://loja.sebrae.com.br/preco-de-vendas-para-beleza-1-372000069337' },
  { id: 'emp-artigo-vender-produtos-propria-marca', url: 'https://loja.sebrae.com.br/marketing-digital-estrategias-e-praticas-para-conquistar-clientes-1-372000110038' },

  // Tecnologia & IA (5)
  { id: 'tec-sebrae-ia-pequenos-negocios', url: 'https://loja.sebrae.com.br/marketing-digital-para-sua-empresa-primeiros-passos-1-372000031607' },
  { id: 'tec-bradesco-seguranca-informacao', url: 'https://www.ev.org.br/cursos/comunicacao_IA' },
  { id: 'tec-artigo-ia-stories-legendas', url: 'https://www.youtube.com/watch?v=IkdzOMRWYxE' },
  { id: 'tec-artigo-seguranca-pix-whatsapp', url: 'https://www.gov.br/governodigital/pt-br' },
  { id: 'tec-artigo-lgpd-barbearia', url: 'https://www.gov.br/anpd/pt-br' },

  // Legislação (5)
  { id: 'leg-gov-portal-empreendedor-mei', url: 'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor' },
  { id: 'leg-sebrae-salao-parceiro', url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/lei/l13352.htm' },
  { id: 'leg-gov-receita-federal-cnpj', url: 'https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/cnpjreva_solicitacao.asp' },
  { id: 'leg-enap-etica-direitos-consumidor', url: 'https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm' },
  { id: 'leg-artigo-nota-fiscal-servico', url: 'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/servicos-para-mei/nota-fiscal' },

  // Vídeos (10)
  { id: 'video-sebrae-precificacao-servicos', url: 'https://www.youtube.com/watch?v=ofuPr0mkmNA' },
  { id: 'video-sebrae-gestao-tempo-atendimento', url: 'https://www.youtube.com/watch?v=8oVd3V5vfrU' },
  { id: 'video-sebrae-instagram-negocios', url: 'https://www.youtube.com/watch?v=-qLs3TZYBeI' },
  { id: 'video-senai-inovacao-produtividade', url: 'https://www.youtube.com/watch?v=Odr7wrmsvyY' },
  { id: 'video-enap-comunicacao-atendimento', url: 'https://www.youtube.com/watch?v=079jjwYCSFU' },
  { id: 'video-sebrae-fluxo-caixa-pratica', url: 'https://www.youtube.com/watch?v=67sMVbPVqCU' },
  { id: 'video-gov-mei-passo-a-passo', url: 'https://www.youtube.com/watch?v=LSzxva0gMYk' },
  { id: 'video-sebrae-fidelizacao-clientes', url: 'https://www.youtube.com/watch?v=-p8O-cYX8Qg' },
  { id: 'video-bradesco-inovacao-tecnologia', url: 'https://www.youtube.com/watch?v=IkdzOMRWYxE' },
  { id: 'video-sebrae-lideranca-pequenas-equipes', url: 'https://www.youtube.com/watch?v=RoK9J-PjdAQ' }
];

async function main() {
  console.log(`Checking ${updatedItems.length} Candidate URLs...\n`);
  let okCount = 0;
  for (let i = 0; i < updatedItems.length; i++) {
    const item = updatedItems[i];
    const res = await checkDirectUrl(item.url);
    const isOk = [200, 301, 302].includes(res.status);
    if (isOk) okCount++;
    console.log(`[${i+1}/${updatedItems.length}] [${item.id}] -> HTTP ${res.status} | Title: "${res.title || 'N/A'}"`);
  }
  console.log(`\nResult: ${okCount}/${updatedItems.length} URLs verified!`);
}

main().catch(console.error);
