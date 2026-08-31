/**
 * BarberFlow — Academia BarberFlow AI Consultant Engine
 * Motor Consultivo Especializado em Barbearias
 * Zero Custos de API / 100% Determinístico & Estruturado / Fallback Silencioso
 */

export interface TenantMetricsSnapshot {
  monthlyRevenue?: number;
  avgTicket?: number;
  monthlyAppointments?: number;
  inactiveClientsCount?: number;
  barbersCount?: number;
  occupancyRate?: number;
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

  // 2. Deterministic Rules Engine (Camada 1 & 2 & 3)
  const response = generateDeterministicAdvice(q, metrics);
  response.responseTimeMs = Date.now() - startTime;
  return response;
}

function generateDeterministicAdvice(q: string, metrics?: TenantMetricsSnapshot): ConsultationResponse {
  // Topic: Horários Vazios / Ocupação / Dias Fracos
  if (q.includes('vazi') || q.includes('terça') || q.includes('quarta') || q.includes('dia fraco') || q.includes('movimento fraco') || q.includes('ocupação') || q.includes('agenda vazia')) {
    const occText = metrics?.occupancyRate ? `Sua taxa de ocupação atual estimada é de ${metrics.occupancyRate.toFixed(1)}%.` : 'Horários ociosos entre terça e quinta-feira representam a maior perda invisível de lucro em barbearias.';
    return {
      topic: 'Otimização de Horários Vazios & Ocupação',
      problem: 'Ociosidade de cadeiras e horários vagos no início e meio da semana (Terça a Quinta).',
      diagnosis: `O padrão do público masculino é concentrar os cortes na sexta e sábado. ${occText} Descontos diretos no corte avulso desvalorizam o serviço, enquanto combos de alto valor agregado preenchem a agenda mantendo o ticket médio elevado.`,
      recommendation: 'Crie a campanha "Terça & Quarta do Barbaço" oferecendo Corte + Barboterapia com toalha quente + Sobrancelha por um valor fechado imperdível apenas nesses dias.',
      actionPlan: [
        { step: 1, title: 'Criar o Combo na Tabela de Serviços', detail: 'Cadastre o serviço "Combo Master Meio de Semana" no BarberFlow com duração de 45 minutos.' },
        { step: 2, title: 'Disparo de WhatsApp no Domingo à Noite', detail: 'Envie um aviso nos Stories e WhatsApp para clientes que costumam cortar a cada 20 dias convidando para o atendimento de terça ou quarta.' },
        { step: 3, title: 'Incentivo à Equipe', detail: 'Ofereça um bônus simbólico (ex: R$ 5 a mais por combo realizado) ao barbeiro que atingir mais de 6 atendimentos nesses dias.' },
      ],
      metric: 'Meta: Elevar a taxa de ocupação de terça e quarta para no mínimo 60%.',
      modelUsed: 'DETERMINISTIC_RULES_ENGINE',
      responseTimeMs: 0,
    };
  }

  // Topic: Precificação / Preço / Cobrar / Margem / Aumentar Preço
  if (q.includes('preço') || q.includes('cobrar') || q.includes('precificação') || q.includes('aumentar preço') || q.includes('margem') || q.includes('quanto cobrar')) {
    return {
      topic: 'Estratégia de Precificação & Margem de Lucro',
      problem: 'Incerteza sobre o valor correto a cobrar por corte/barba e medo de perder clientes com reajuste.',
      diagnosis: 'Muitos donos precificam copiando concorrentes do bairro, sem considerar custos fixos individuais (aluguel, água, energia, comissões). Se seu custo fixo por atendimento for R$ 12 e a comissão for 50%, cobrar R$ 35 deixa margem líquida insuficiente.',
      recommendation: 'Ajuste o preço com base no tempo de cadeira e agregue percepção de valor (toalha descartável premium, café de qualidade, agendamento pontual) antes de comunicar o reajuste.',
      actionPlan: [
        { step: 1, title: 'Calcular o Custo da Cadeira', detail: 'Use a Calculadora de Preço de Venda na aba Ferramentas da Academia para apurar seu custo exato por minuto.' },
        { step: 2, title: 'Melhorar a Experiência no Balcão', detail: 'Padronize a recepção e a finalização com produtos premium antes de aplicar o novo preço.' },
        { step: 3, title: 'Aviso Prévio Acolhedor', detail: 'Comunique seus clientes com 15 dias de antecedência explicando os investimentos em melhorias e conforto do espaço.' },
      ],
      metric: 'Meta: Garantir margem líquida da barbearia de pelo menos 25% sobre cada serviço realizado.',
      modelUsed: 'DETERMINISTIC_RULES_ENGINE',
      responseTimeMs: 0,
    };
  }

  // Topic: Clientes Inativos / Churn / Retenção / Reativação / Sumiram
  if (q.includes('inativo') || q.includes('sumir') || q.includes('reativar') || q.includes('retorno') || q.includes('perder cliente') || q.includes('fidelizar') || q.includes('recorrência')) {
    const countText = metrics?.inactiveClientsCount ? `Você possui atualmente cerca de ${metrics.inactiveClientsCount} clientes em risco de abandono no BarberFlow.` : 'Clientes que ultrapassam 35 dias sem cortar o cabelo têm 65% mais chance de migrar para outro concorrente.';
    return {
      topic: 'Recuperação de Clientes Inativos & Recorrência',
      problem: 'Clientes que cortavam regularmente deixaram de agendar nos últimos 30 a 60 dias.',
      diagnosis: `${countText} Na maioria das vezes, o cliente não deixou de frequentar por insatisfação, mas por esquecimento e falta de um lembrete no momento certo.`,
      recommendation: 'Dispare uma campanha de reativação pelo WhatsApp com mensagem amigável e acolhedora convidando para renovar o visual.',
      actionPlan: [
        { step: 1, title: 'Filtrar Clientes em Risco', detail: 'Acesse a aba Recorrência no BarberFlow e selecione os clientes com mais de 30 dias de ausência.' },
        { step: 2, title: 'Gerar Mensagem de Reativação', detail: 'Use o Gerador de Mensagens na aba Ferramentas para gerar o texto ideal com tom descontraído.' },
        { step: 3, title: 'Disparo Fracionado', detail: 'Envie de 10 a 15 mensagens por dia de segunda a quarta-feira para não sobrecarregar as respostas.' },
      ],
      metric: 'Meta: Reativar pelo menos 20% da base inativa em até 7 dias.',
      modelUsed: 'DETERMINISTIC_RULES_ENGINE',
      responseTimeMs: 0,
    };
  }

  // Topic: MEI / Impostos / Nota Fiscal / CNPJ / DAS / Legal
  if (q.includes('mei') || q.includes('imposto') || q.includes('cnpj') || q.includes('nota fiscal') || q.includes('das') || q.includes('tribut') || q.includes('legal') || q.includes('lei')) {
    return {
      topic: 'Legislação, Formalização & MEI',
      problem: 'Dúvidas sobre formalização, limite do MEI e emissão de notas fiscais de serviço.',
      diagnosis: 'O barbeiro autônomo pode atuar como MEI no CNAE de cabeleireiro/barbeiro (CNAE 9602-5/01). No entanto, o dono da barbearia com múltiplos parceiros deve atuar sob a Lei do Salão Parceiro para tributar apenas a sua cota-parte retida, evitando bitributação.',
      recommendation: 'Mantenha a guia mensal do DAS em dia no portal gov.br e emita suas NFS-e pelo Emissor Nacional gratuito do governo.',
      actionPlan: [
        { step: 1, title: 'Pagar o DAS Mensal', detail: 'Gere o boleto DAS todo dia 20 no Portal do Empreendedor (gov.br) para garantir benefícios previdenciários (INSS).' },
        { step: 2, title: 'Cadastrar no Emissor Nacional', detail: 'Crie seu acesso no Portal de Gestão NFS-e Nacional para emitir notas fiscais quando solicitadas.' },
        { step: 3, title: 'Alinhar com Contador', detail: 'Se o faturamento bruto anual total se aproximar do teto do MEI (R$ 81.000), planeje a transição para ME (Simples Nacional).' },
      ],
      metric: 'Meta: 100% de conformidade fiscal e regularidade no CNPJ sem multas.',
      disclaimer: 'Aviso Legal/Tributário: Este conteúdo possui finalidade estritamente educacional e informativa. Não substitui a orientação formal de um contador registrado no CRC.',
      modelUsed: 'DETERMINISTIC_RULES_ENGINE',
      responseTimeMs: 0,
    };
  }

  // Topic: Comissões / Equipe / Barbeiros Parceiros / Salário
  if (q.includes('comissão') || q.includes('comissao') || q.includes('equipe') || q.includes('barbeiro') || q.includes('contratar') || q.includes('pagar barbeiro') || q.includes('salão parceiro')) {
    return {
      topic: 'Gestão de Barbeiros Parceiros & Comissões',
      problem: 'Dúvidas sobre percentual ideal de comissão e como manter a equipe motivada sem comprometer o caixa.',
      diagnosis: 'Comissões fixas muito altas (ex: 60% ou 70%) quebram a barbearia porque não sobra margem para cobrir aluguel, luz, recepção e impostos. A média saudável de mercado varia entre 45% e 55% para serviços, dependendo de quem fornece os produtos.',
      recommendation: 'Adote o modelo de Comissão Progressiva e formalize o Contrato de Salão Parceiro (Lei 13.352/2016) para segurança jurídica e incentivo de produção.',
      actionPlan: [
        { step: 1, title: 'Estruturar Faixas de Comissão', detail: 'Defina 45% na faixa inicial e 50% ou 52% se o profissional ultrapassar a meta de faturamento mensal.' },
        { step: 2, title: 'Formalizar o Contrato', detail: 'Garanta que todo barbeiro tenha CNPJ MEI e contrato de parceiro assinado e arquivado.' },
        { step: 3, title: 'Transparência de Relatórios', detail: 'Utilize o extrato financeiro do BarberFlow para fechamento semanal sem atritos na conferência.' },
      ],
      metric: 'Meta: Manter o custo total de comissões abaixo de 52% do faturamento bruto da barbearia.',
      disclaimer: 'Aviso Educacional: As regras trabalhistas e tributárias devem seguir a Lei 13.352/2016. Consulte seu contador para homologação do contrato.',
      modelUsed: 'DETERMINISTIC_RULES_ENGINE',
      responseTimeMs: 0,
    };
  }

  // Topic: Faturamento / Aumentar Vendas / Metas / Lucro
  if (q.includes('faturamento') || q.includes('vendas') || q.includes('lucro') || q.includes('meta') || q.includes('dinheiro') || q.includes('ganhar mais') || q.includes('crescer')) {
    const revText = metrics?.monthlyRevenue ? `Seu faturamento recente registrado é de R$ ${metrics.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.` : 'O faturamento é resultado direto de 3 alavancas: Número de Clientes x Frequência x Ticket Médio.';
    return {
      topic: 'Alavancagem de Faturamento & Vendas',
      problem: 'Desejo de aumentar o faturamento mensal da barbearia de forma previsível e consistente.',
      diagnosis: `${revText} Para crescer 30%, o caminho mais rápido não é trabalhar 30% mais horas, mas sim: 1) Elevar o ticket médio com venda de pomadas e sobrancelha; 2) Reduzir o tempo entre cortes de 30 para 20 dias.`,
      recommendation: 'Implemente uma meta diária clara por cadeira e ative a venda consultiva de produtos de cuidados masculinos na bancada.',
      actionPlan: [
        { step: 1, title: 'Desdobrar a Meta em Cortes Diários', detail: 'Divida o faturamento almejado pelos dias de trabalho e número de barbeiros usando a Calculadora de Metas.' },
        { step: 2, title: 'Oferecer Produtos na Saída', detail: 'Ensine a equipe a explicar a pomada ou óleo usado na finalização. 2 pomadas vendidas por dia geram mais de R$ 1.500 no mês.' },
        { step: 3, title: 'Reagendamento Imediato', detail: 'Agende o próximo retorno do cliente logo no balcão antes de ele sair da barbearia.' },
      ],
      metric: 'Meta: Aumentar o ticket médio em pelo menos R$ 10,00 nos próximos 30 dias.',
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
