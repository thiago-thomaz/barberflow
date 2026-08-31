/**
 * BarberFlow — Academia BarberFlow AI Consultant Engine
 * Motor Consultivo Especializado em Barbearias
 * Zero Custos de API / 100% Determinístico & Estruturado / Multi-Tenant Context
 */

export interface TenantMetricsSnapshot {
  monthlyRevenue?: number;
  avgTicket?: number;
  monthlyAppointments?: number;
  inactiveClientsCount?: number;
  activeClientsCount?: number;
  barbersCount?: number;
  occupancyRate?: number;
  monthlyExpenses?: number;
  upcomingPayables7d?: number;
  upcomingReceivables7d?: number;
}

export interface ConsultationResponse {
  topic: string;
  problem: string;
  diagnosis: string;
  recommendation: string;
  actionPlan: Array<{ step: number; title: string; detail: string }>;
  metric: string;
  disclaimer?: string;
  modelUsed: 'DETERMINISTIC_RULES_ENGINE' | 'LOCAL_MODEL_OLLAMA';
  responseTimeMs: number;
}

export async function consultBarberFlowAi(
  question: string,
  metrics?: TenantMetricsSnapshot,
  userId?: string,
  barbershopId?: string
): Promise<ConsultationResponse> {
  const startTime = Date.now();
  const q = question.toLowerCase().trim();

  // 1. Check for Ollama Local Model if configured (Optional Layer 4)
  const ollamaUrl = process.env.OLLAMA_URL || process.env.LOCAL_AI_URL;
  if (ollamaUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s max

      const res = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || 'llama3:8b',
          prompt: `Você é o Consultor BarberFlow especialista em gestão de barbearias no Brasil. Responda em português estruturado: PROBLEMA, DIAGNOSTICO, RECOMENDAÇÃO, PLANO DE AÇÃO (3 passos) e MÉTRICA. Pergunta: ${question}`,
          stream: false,
        }),
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.response) {
          return parseAiResponse(data.response, Date.now() - startTime, 'LOCAL_MODEL_OLLAMA');
        }
      }
    } catch {
      // Fallback silently to Deterministic Engine (Zero Error)
    }
  }

  // 2. Deterministic Rules Engine (Camada 1, 2 e 3)
  const response = generateDeterministicAdvice(q, metrics);
  response.responseTimeMs = Date.now() - startTime;
  return response;
}

function generateDeterministicAdvice(q: string, metrics?: TenantMetricsSnapshot): ConsultationResponse {
  // Quick Question 1: "Estou cobrando pouco?" / Precificação / Preço
  if (q.includes('cobrando pouco') || q.includes('preço baixo') || q.includes('quanto cobrar') || q.includes('precificação') || q.includes('aumentar preço')) {
    const ticketVal = metrics?.avgTicket || 45;
    const ticketComment = metrics?.avgTicket
      ? `Seu ticket médio recente apurado é de R$ ${metrics.avgTicket.toFixed(2)}.`
      : 'O preço do corte em barbearias de bairro varia entre R$ 35 e R$ 60, enquanto espaços estruturados cobram acima de R$ 65.';

    return {
      topic: 'Diagnóstico de Preço & Margem de Venda',
      problem: 'Insegurança sobre o valor cobrado e risco de trabalhar no prejuízo por não cobrir os custos de cadeira.',
      diagnosis: `${ticketComment} Se o seu custo fixo por hora for de R$ 25 e a comissão for de 50%, cobrar R$ 35 por um corte de 30 minutos deixa uma margem líquida inferior a R$ 5,00 para a barbearia.`,
      recommendation: 'Use a Calculadora de Preço de Venda da Academia para apurar seus custos fixos por minuto e reajuste o valor agregando valor na experiência antes do aumento.',
      actionPlan: [
        { step: 1, title: 'Calcular Custo Exato do Minuto', detail: 'Acesse a Calculadora de Preço de Venda nas Ferramentas da Academia e insira seus custos de aluguel, insumos e comissão.' },
        { step: 2, title: 'Padronizar a Finalização', detail: 'Inclua toalha quente e massagem rápida no ombro para justificar uma percepção de valor superior.' },
        { step: 3, title: 'Aviso Prévio Acolhedor', detail: 'Comunique seus clientes com 15 dias de antecedência explicando os investimentos em conforto do espaço.' },
      ],
      metric: 'Meta: Garantir margem líquida mínima de 25% para a barbearia após o pagamento de comissões e custos fixos.',
      modelUsed: 'DETERMINISTIC_RULES_ENGINE',
      responseTimeMs: 0,
    };
  }

  // Quick Question 2: "Tenho clientes suficientes?" / Clientes / Base de Clientes
  if (q.includes('clientes suficientes') || q.includes('tamanho da base') || q.includes('quantos clientes')) {
    const active = metrics?.activeClientsCount || 0;
    const inactive = metrics?.inactiveClientsCount || 0;
    const barbers = metrics?.barbersCount || 1;
    const totalNeeded = barbers * 150; // ~150 clientes recorrentes por barbeiro para agenda cheia

    const baseText = active > 0
      ? `Você possui atualmente ${active} clientes ativos e ${inactive} clientes sem retorno no BarberFlow.`
      : `Para manter ${barbers} barbeiro(s) com agenda cheia (cortando a cada 20 a 25 dias), você precisa de uma base ativa de aproximadamente ${totalNeeded} clientes recorrentes.`;

    return {
      topic: 'Dimensionamento da Base de Clientes',
      problem: 'Dúvida se a quantidade atual de clientes cadastrados sustenta a meta de faturamento e ocupação.',
      diagnosis: `${baseText} O segredo não é apenas trazer novos clientes todos os dias, mas sim blindar a retenção dos clientes já atendidos.`,
      recommendation: 'Trabalhe o agendamento do próximo retorno na própria cadeira antes do cliente pagar no balcão e ative a reativação automática.',
      actionPlan: [
        { step: 1, title: 'Calcular Churn e Retenção', detail: 'Utilize a Calculadora de Retenção & Churn na aba Ferramentas para medir a taxa mensal de perda.' },
        { step: 2, title: 'Implantar Reagendamento Imediato', detail: 'Instrua a recepção a perguntar: "Já deixamos pré-agendado seu retorno daqui a 20 dias para garantir o mesmo horário?"' },
        { step: 3, title: 'Recuperar Clientes em Risco', detail: 'Acesse o módulo de Recorrência e dispare mensagens para quem está há mais de 30 dias sem agendar.' },
      ],
      metric: `Meta: Manter pelo menos ${totalNeeded} clientes ativos cortando a cada 21 dias por cadeira.`,
      modelUsed: 'DETERMINISTIC_RULES_ENGINE',
      responseTimeMs: 0,
    };
  }

  // Quick Question 3: "Como reduzir horários vazios?" / Horários Vazios / Terça e Quarta / Ocupação
  if (q.includes('reduzir horários vazios') || q.includes('vazi') || q.includes('terça') || q.includes('quarta') || q.includes('dia fraco') || q.includes('movimento fraco') || q.includes('ocupação') || q.includes('agenda vazia')) {
    const occText = metrics?.occupancyRate ? `Sua taxa de ocupação estimada atual é de ${metrics.occupancyRate.toFixed(1)}%.` : 'A ociosidade de terça e quarta-feira é o maior ralo financeiro de uma barbearia.';
    return {
      topic: 'Otimização de Horários Vazios & Ocupação',
      problem: 'Ociosidade de cadeiras e horários vagos no início e meio da semana (Terça a Quinta).',
      diagnosis: `O público masculino concentra naturalmente os atendimentos na sexta e sábado. ${occText} Oferecer desconto direto no corte avulso desvaloriza a marca. O caminho correto é criar combos exclusivos com serviços de alta margem (ex: Barboterapia ou Sobrancelha).`,
      recommendation: 'Crie a campanha "Terça & Quarta do Barbaço" com o serviço Combo Master (Corte + Barba + Sobrancelha) válido exclusivamente nesses dias.',
      actionPlan: [
        { step: 1, title: 'Criar o Combo na Tabela de Serviços', detail: 'Cadastre o serviço "Combo Master Meio de Semana" no BarberFlow com duração de 45 minutos.' },
        { step: 2, title: 'Disparo de WhatsApp no Domingo à Noite', detail: 'Envie um aviso nos Stories e WhatsApp para clientes que costumam cortar a cada 20 dias convidando para terça ou quarta.' },
        { step: 3, title: 'Incentivo à Equipe', detail: 'Ofereça um bônus simbólico por combo realizado ao barbeiro que atingir mais de 6 atendimentos nesses dias.' },
      ],
      metric: 'Meta: Elevar a taxa de ocupação de terça e quarta para no mínimo 60%.',
      modelUsed: 'DETERMINISTIC_RULES_ENGINE',
      responseTimeMs: 0,
    };
  }

  // Quick Question 4: "Como melhorar minha recorrência?" / Recorrência / Retorno / Frequência
  if (q.includes('melhorar minha recorrência') || q.includes('recorrência') || q.includes('frequência') || q.includes('fazer clientes voltarem') || q.includes('voltar')) {
    const countText = metrics?.inactiveClientsCount ? `Você possui cerca de ${metrics.inactiveClientsCount} clientes atrasados para retornar no BarberFlow.` : 'Reduzir o intervalo médio de retorno de 30 para 20 dias aumenta seu faturamento em 50% com a mesma base de clientes.';
    return {
      topic: 'Engenharia de Recorrência & Frequência',
      problem: 'Clientes demoram muito tempo para agendar o próximo corte, espaçando as visitas.',
      diagnosis: `${countText} A maioria dos homens não corta o cabelo porque esquece de agendar na correria do dia a dia, e não por insatisfação.`,
      recommendation: 'Monitore o painel de Recorrência semanalmente e automatize lembretes de renovação de visual.',
      actionPlan: [
        { step: 1, title: 'Filtrar Clientes em Risco na Recorrência', detail: 'Abra a aba Recorrência no BarberFlow e veja a lista de oportunidades categorizadas.' },
        { step: 2, title: 'Usar Gerador de Mensagens', detail: 'Gere um texto amigável na aba Ferramentas da Academia sem tom de cobrança agressiva.' },
        { step: 3, title: 'Criar Programa de Assinatura/Clube', detail: 'Avalie criar um Clube do Corte com pagamento mensal fixo para garantir receita recorrente previsível.' },
      ],
      metric: 'Meta: Reduzir o ciclo médio de retorno dos clientes fiéis para 20 dias.',
      modelUsed: 'DETERMINISTIC_RULES_ENGINE',
      responseTimeMs: 0,
    };
  }

  // Quick Question 5: "Minha situação financeira está saudável?" / Saúde Financeira / Caixa / Lucro
  if (q.includes('financeira está saudável') || q.includes('situação financeira') || q.includes('saúde financeira') || q.includes('dinheiro no caixa') || q.includes('fluxo de caixa')) {
    const payables = metrics?.upcomingPayables7d || 0;
    const receivables = metrics?.upcomingReceivables7d || 0;
    const expenses = metrics?.monthlyExpenses || 0;
    const rev = metrics?.monthlyRevenue || 0;

    let finHealthDiag = 'Uma barbearia saudável mantém separação total de contas, reserva de emergência para 3 meses e margem líquida superior a 20%.';
    if (payables > 0 && receivables > 0) {
      finHealthDiag = `Contas a pagar nos próximos 7 dias: R$ ${payables.toFixed(2)} vs Recebíveis previstos: R$ ${receivables.toFixed(2)}.`;
    }

    return {
      topic: 'Diagnóstico de Saúde Financeira & Liquidez',
      problem: 'Incerteza sobre a lucratividade real e capacidade de honrar compromissos futuros.',
      diagnosis: finHealthDiag,
      recommendation: 'Acompanhe diariamente o módulo de Gestão Financeira, registre 100% das despesas e defina um pró-labore fixo para o dono.',
      actionPlan: [
        { step: 1, title: 'Separar Caixa Pessoal do Caixa da Empresa', detail: 'Nunca pague contas da sua casa diretamente com o dinheiro do caixa da barbearia.' },
        { step: 2, title: 'Calcular Ponto de Equilíbrio', detail: 'Use a Calculadora de Break-Even na Academia para saber o faturamento mínimo mensal necessário.' },
        { step: 3, title: 'Rotina Semanal de Conciliação', detail: 'Toda segunda-feira de manhã, confira os lançamentos e contas a pagar da semana.' },
      ],
      metric: 'Meta: Manter margem líquida acima de 20% e reserva financeira equivalente a 3 meses de custos fixos.',
      modelUsed: 'DETERMINISTIC_RULES_ENGINE',
      responseTimeMs: 0,
    };
  }

  // Quick Question 6: "Como aumentar meu ticket?" / Ticket Médio / Aumentar Ticket
  if (q.includes('aumentar meu ticket') || q.includes('ticket médio') || q.includes('ticket')) {
    const ticketCurrent = metrics?.avgTicket || 45;
    return {
      topic: 'Alavancagem de Ticket Médio por Atendimento',
      problem: 'Clientes realizam apenas o serviço básico de corte, limitando a receita gerada por hora de cadeira.',
      diagnosis: `Seu ticket médio atual está em cerca de R$ ${ticketCurrent.toFixed(2)}. Cada R$ 10 adicionais por atendimento representam R$ 2.500 a R$ 4.000 a mais de faturamento mensal limpo.`,
      recommendation: 'Implemente venda consultiva de produtos na bancada (pomadas, óleos) e ofereça combos de barba com toalha quente.',
      actionPlan: [
        { step: 1, title: 'Aplicar Produto Explicando os Benefícios', detail: 'Ensine os barbeiros a finalizar o corte usando a pomada e explicando: "Essa pomada dá efeito matte natural. Quer levar uma hoje?"' },
        { step: 2, title: 'Criar Tabela de Combos Inteligentes', detail: 'Corte (R$ 45) + Barba (R$ 40) = R$ 85. Crie o Combo Master por R$ 75 com sobrancelha cortesia.' },
        { step: 3, title: 'Comissão de Produtos para a Equipe', detail: 'Pague de 15% a 20% de comissão sobre venda de produtos para motivar os profissionais.' },
      ],
      metric: 'Meta: Elevar o ticket médio em pelo menos R$ 10,00 nos próximos 30 dias.',
      modelUsed: 'DETERMINISTIC_RULES_ENGINE',
      responseTimeMs: 0,
    };
  }

  // Quick Question 7: "Como aumentar meu faturamento?" / Faturamento / Ganhar Mais
  if (q.includes('aumentar meu faturamento') || q.includes('faturamento') || q.includes('vendas') || q.includes('ganhar mais') || q.includes('crescer')) {
    const revText = metrics?.monthlyRevenue
      ? `Seu faturamento recente registrado é de R$ ${metrics.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
      : 'O faturamento de uma barbearia é uma multiplicação simples: Número de Clientes x Frequência no Mês x Ticket Médio.';

    return {
      topic: 'Alavancagem de Faturamento & Vendas',
      problem: 'Desejo de aumentar o faturamento mensal da barbearia de forma previsível e consistente.',
      diagnosis: `${revText} Para crescer 30% em faturamento, não é preciso dobrar o número de horas trabalhadas. Basta ajustar 3 engrenagens: 1) Elevar ticket médio em R$ 10; 2) Preencher terças e quartas com combos; 3) Reativar 20 clientes ausentes.`,
      recommendation: 'Execute o diagnóstico da Academia BarberFlow e siga o plano de ação semanal priorizado.',
      actionPlan: [
        { step: 1, title: 'Desdobrar Metas Diárias', detail: 'Divida o faturamento almejado pelos dias do mês usando a Calculadora de Metas da Academia.' },
        { step: 2, title: 'Ativar a Base Inativa', detail: 'Recupere clientes que não cortam há mais de 30 dias pelo módulo de Recorrência.' },
        { step: 3, title: 'Venda de Produtos na Saída', detail: 'Coloque expositor visível de pomadas e pós-barba na recepção.' },
      ],
      metric: 'Meta: Crescimento de 20% a 35% no faturamento bruto nos próximos 60 dias.',
      modelUsed: 'DETERMINISTIC_RULES_ENGINE',
      responseTimeMs: 0,
    };
  }

  // Topic: Marketing / Instagram / Divulgação / Google Maps / Novos Clientes
  if (q.includes('marketing') || q.includes('instagram') || q.includes('divulg') || q.includes('google') || q.includes('atrair') || q.includes('anúncio') || q.includes('stories')) {
    return {
      topic: 'Estratégia de Marketing Local & Atração de Clientes',
      problem: 'Dificuldade em atrair novos clientes da região e manter o Instagram ativo.',
      diagnosis: 'Homens buscam barbearia por conveniência e confiança visual. O Google Maps é a ferramenta número 1 de busca ("barbearia perto de mim") e o Instagram serve como prova social para mostrar a qualidade técnica dos cortes.',
      recommendation: 'Domine o Google Meu Negócio gratuito com fotos semanais e avaliações 5 estrelas, e poste vídeos curtos de transformações no Reels com localização marcada.',
      actionPlan: [
        { step: 1, title: 'Otimizar Perfil no Google Maps', detail: 'Adicione fotos de alta qualidade da fachada, espaço interno e link de agendamento online do BarberFlow.' },
        { step: 2, title: 'Campanha de 10 Avaliações', detail: 'Peça para os 10 clientes mais fiéis avaliarem seu espaço no Google Maps com comentários detalhados.' },
        { step: 3, title: 'Reels Semanais de Transformação', detail: 'Grave 2 vídeos no formato Antes/Depois por semana usando o Gerador de Roteiro de Reels da Academia.' },
      ],
      metric: 'Meta: Conquistar no mínimo 20 avaliações 5 estrelas no Google e 15 novos clientes no mês.',
      modelUsed: 'DETERMINISTIC_RULES_ENGINE',
      responseTimeMs: 0,
    };
  }

  // Topic: Legislação / MEI / Lei Salão Parceiro / Impostos
  if (q.includes('mei') || q.includes('legisla') || q.includes('salão parceiro') || q.includes('salao parceiro') || q.includes('contrato') || q.includes('imposto') || q.includes('tribut')) {
    return {
      topic: 'Legislação, MEI & Lei Salão Parceiro',
      problem: 'Dúvidas jurídicas, tributárias e de formalização contratual para barbearias.',
      diagnosis: 'A Lei do Salão Parceiro (Lei 13.352/2016) permite a parceria formal entre a barbearia (Salão-Parceiro) e os barbeiros (Profissionais-Parceiros como MEI), eliminando o risco trabalhista de vínculo empregatício quando homologado corretamente.',
      recommendation: 'Formalize os contratos de parceria pela Lei Salão Parceiro e mantenha o recolhimento do DAS-MEI em dia.',
      actionPlan: [
        { step: 1, title: 'Adotar Contrato Padrão de Salão Parceiro', detail: 'Utilize o modelo oficial de contrato de parceria disponível na aba Ferramentas ou no Sebrae.' },
        { step: 2, title: 'Controlar o Limite Anual do MEI', detail: 'Monitore o teto de faturamento anual do MEI (R$ 81.000) e considere desenquadramento para ME se necessário.' },
        { step: 3, title: 'Emitir Recibos de Repasse', detail: 'Separe no sistema a cota-parte da barbearia e a cota-parte dos profissionais para fins contábeis.' },
      ],
      metric: 'Meta: 100% da equipe parceira regularizada com contrato assinado e MEI ativo.',
      disclaimer: 'Aviso: Esta orientação possui caráter estritamente educacional e informativo. Consulte sempre um contador habilitado para orientações fiscais específicas.',
      modelUsed: 'DETERMINISTIC_RULES_ENGINE',
      responseTimeMs: 0,
    };
  }

  // Topic: Comissões e Gestão de Barbeiros Parceiros
  if (q.includes('comiss') || q.includes('porcentagem') || q.includes('quanto pagar') || q.includes('comissão')) {
    return {
      topic: 'Gestão de Comissões e Equipe Parceira',
      problem: 'Definição de percentuais justos e sustentáveis de comissão para barbeiros parceiros.',
      diagnosis: 'Comissões muito altas (acima de 60%) quebram a barbearia porque não deixam margem para cobrir aluguel, luz, recepção e marketing. A média de mercado sustentável varia entre 40% e 50% para serviços e 15% a 20% para venda de produtos.',
      recommendation: 'Estruture uma tabela de comissões com escalonamento por metas de faturamento e pontualidade.',
      actionPlan: [
        { step: 1, title: 'Calcular Margem de Contribuição', detail: 'Use a Calculadora de Comissões na Academia para simular o lucro da barbearia após o repasse.' },
        { step: 2, title: 'Definir Regras de Desconto de Insumos', detail: 'Deixe acordado no contrato se a barbearia ou o barbeiro fornece produtos (lâminas, pomadas, capas).' },
        { step: 3, title: 'Apresentar Tabela de Metas', detail: 'Bonifique o profissional que bater meta mensal de atendimentos com 2% a 5% extras de comissão.' },
      ],
      metric: 'Meta: Manter o custo total de repasse de comissões em no máximo 50% do faturamento bruto da barbearia.',
      disclaimer: 'Conteúdo educacional para apoio à gestão de barbearias.',
      modelUsed: 'DETERMINISTIC_RULES_ENGINE',
      responseTimeMs: 0,
    };
  }


  // Fallback Geral Inteligente
  return {
    topic: 'Consultoria Estratégica Geral BarberFlow',
    problem: 'Otimização de processos operacionais, financeiros e de atendimento na barbearia.',
    diagnosis: 'Uma barbearia altamente lucrativa equilibra três engrenagens: 1) Agenda cheia e sem faltas; 2) Controle financeiro rigoroso com separação de contas; 3) Atendimento encantador que garante a retenção do cliente.',
    recommendation: 'Acompanhe seus números diários no BarberFlow e utilize as calculadoras e checklists da Academia para orientar sua tomada de decisão.',
    actionPlan: [
      { step: 1, title: 'Analisar Indicadores no Dashboard', detail: 'Verifique seu faturamento do mês, ticket médio e clientes ausentes no BarberFlow.' },
      { step: 2, title: 'Executar os Checklists Operacionais', detail: 'Siga a rotina de abertura e fechamento de caixa para blindar a operação contra erros.' },
      { step: 3, title: 'Avançar na Trilha Educacional', detail: 'Conclua os 10 módulos da trilha "Comece Aqui" na Academia BarberFlow para aprofundar sua gestão.' },
    ],
    metric: 'Meta: Crescimento sustentável com lucro líquido positivo e previsibilidade de caixa.',
    disclaimer: 'Dica do Consultor: Se tiver uma dúvida específica sobre preços, horários vazios, comissões ou marketing, pergunte diretamente!',
    modelUsed: 'DETERMINISTIC_RULES_ENGINE',
    responseTimeMs: 0,
  };
}

function parseAiResponse(raw: string, responseTimeMs: number, modelUsed: 'LOCAL_MODEL_OLLAMA'): ConsultationResponse {
  return {
    topic: 'Consultoria Personalizada BarberFlow (IA)',
    problem: 'Análise estratégica da consulta solicitada.',
    diagnosis: raw.slice(0, 300) + '...',
    recommendation: raw,
    actionPlan: [
      { step: 1, title: 'Ação Imediata', detail: 'Aplicar a orientação estratégica recomendada no fluxo de atendimento.' },
      { step: 2, title: 'Medição de Resultados', detail: 'Acompanhar a evolução dos números no painel do BarberFlow.' },
      { step: 3, title: 'Ajuste Contínuo', detail: 'Refinar o processo semanalmente com a equipe.' },
    ],
    metric: 'Meta: Acompanhamento de evolução no Dashboard de Gestão.',
    disclaimer: 'Orientação gerada por modelo de linguagem local. Conteúdo educacional.',
    modelUsed,
    responseTimeMs,
  };
}
