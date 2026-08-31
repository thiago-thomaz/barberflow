/**
 * BarberFlow — Academia BarberFlow 2.0 Diagnostic & Action Plan Engine
 * Motor Determinístico de Diagnóstico, Score de Saúde da Barbearia e Recomendações
 * Zero Custos de API / 100% Heurísticas Matemáticas / Multi-Tenant Isolation
 */

import { ACADEMIA_CONTENTS } from './content.ts';
import type { EducationContentItem } from './content.ts';
import { ACADEMIA_CALCULATORS, ACADEMIA_CHECKLISTS } from './tools.ts';

export interface DiagnosticQuestion {
  id: string;
  order: number;
  title: string;
  category: 'OPERACAO' | 'FINANCAS' | 'CLIENTES' | 'GESTAO';
  type: 'number' | 'currency' | 'boolean' | 'select';
  options?: string[];
  placeholder?: string;
  helpText?: string;
  realDataKey?: keyof TenantRealMetrics;
}

export interface TenantRealMetrics {
  barbersCount: number;
  monthlyRevenue: number;
  monthlyAppointments: number;
  avgTicket: number;
  activeClientsCount: number;
  inactiveClientsCount: number;
  occupancyRate: number;
  monthlyExpenses?: number;
  upcomingPayables7d?: number;
  upcomingReceivables7d?: number;
  hasAccountsPayable?: boolean;
  hasAccountsReceivable?: boolean;
  hasGoalsConfigured?: boolean;
  hasRecurringExpenses?: boolean;
  moneyOnTheTableOpportunities?: number;
}

export interface DiagnosticAnswers {
  q1_barbersCount?: number;
  q2_monthlyRevenue?: number;
  q3_monthlyAppointments?: number;
  q4_avgTicket?: number;
  q5_activeClients?: number;
  q6_inactiveClients?: number;
  q7_trackPayables?: boolean;
  q8_trackReceivables?: boolean;
  q9_knowsMonthlyCost?: boolean;
  q10_knowsBreakEven?: boolean;
  q11_doesReactivationCampaigns?: boolean;
  q12_tracksOccupancyRate?: boolean;
  q13_hasMonthlyGoal?: boolean;
  q14_tracksNetProfit?: boolean;
  q15_biggestProblem?: string;
}

export type HealthCategory = 'EXCELENTE' | 'SAUDAVEL' | 'ATENCAO' | 'CRITICO' | 'DADOS_INSUFICIENTES';

export interface PillarScore {
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  status: 'EXCELENTE' | 'BOM' | 'ATENCAO' | 'CRITICO';
  diagnosis: string;
}

export interface DailyPriority {
  id: string;
  rank: number;
  category: string;
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  badge: 'URGENTE' | 'ALTA' | 'MEDIA';
}

export interface ActionPlanItemBlueprint {
  id: string;
  title: string;
  problem: string;
  whyItMatters: string;
  action: string;
  howTo: string;
  deadlineDays: number;
  indicator: string;
  recommendedCategory: string;
  recommendedContentIds: string[];
  recommendedToolId?: string;
  recommendedChecklistId?: string;
  priority: 'ALTA' | 'MEDIA' | 'BAIXA';
}

export interface DiagnosticResult {
  healthScore: number;
  healthCategory: HealthCategory;
  pillars: Record<string, PillarScore>;
  priorities: DailyPriority[];
  actionPlans: ActionPlanItemBlueprint[];
  biggestProblemIdentified: string;
  missingData?: {
    isInsufficient: boolean;
    missingFields: string[];
    guidance: string;
  };
  effectiveMetrics: {
    barbersCount: number;
    monthlyRevenue: number;
    monthlyAppointments: number;
    avgTicket: number;
    activeClientsCount: number;
    inactiveClientsCount: number;
    occupancyRate: number;
    inactiveRatePercent: number;
    dataSource: 'REAL_DATA' | 'MANUAL_ANSWERS' | 'HYBRID';
  };
}

export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: 'q1_barbersCount',
    order: 1,
    title: 'Quantos barbeiros trabalham atualmente?',
    category: 'OPERACAO',
    type: 'number',
    placeholder: 'Ex: 2',
    helpText: 'Profissionais ativos atendendo na barbearia.',
    realDataKey: 'barbersCount',
  },
  {
    id: 'q2_monthlyRevenue',
    order: 2,
    title: 'Qual o faturamento médio mensal?',
    category: 'FINANCAS',
    type: 'currency',
    placeholder: 'Ex: 12000',
    helpText: 'Total de receita bruta gerada por serviços e produtos.',
    realDataKey: 'monthlyRevenue',
  },
  {
    id: 'q3_monthlyAppointments',
    order: 3,
    title: 'Quantos atendimentos realiza por mês?',
    category: 'OPERACAO',
    type: 'number',
    placeholder: 'Ex: 250',
    helpText: 'Quantidade total de cortes e serviços concluídos.',
    realDataKey: 'monthlyAppointments',
  },
  {
    id: 'q4_avgTicket',
    order: 4,
    title: 'Qual o ticket médio aproximado?',
    category: 'FINANCAS',
    type: 'currency',
    placeholder: 'Ex: 48.00',
    helpText: 'Valor médio gasto por cliente em cada visita.',
    realDataKey: 'avgTicket',
  },
  {
    id: 'q5_activeClients',
    order: 5,
    title: 'Quantos clientes ativos possui?',
    category: 'CLIENTES',
    type: 'number',
    placeholder: 'Ex: 180',
    helpText: 'Clientes que cortaram nos últimos 30 a 35 dias.',
    realDataKey: 'activeClientsCount',
  },
  {
    id: 'q6_inactiveClients',
    order: 6,
    title: 'Quantos clientes estão sem voltar?',
    category: 'CLIENTES',
    type: 'number',
    placeholder: 'Ex: 40',
    helpText: 'Clientes que ultrapassaram o ciclo normal e sumiram.',
    realDataKey: 'inactiveClientsCount',
  },
  {
    id: 'q7_trackPayables',
    order: 7,
    title: 'Você acompanha contas a pagar?',
    category: 'FINANCAS',
    type: 'boolean',
    helpText: 'Controle de despesas, boletos, comissões e fornecedores.',
  },
  {
    id: 'q8_trackReceivables',
    order: 8,
    title: 'Você acompanha contas a receber?',
    category: 'FINANCAS',
    type: 'boolean',
    helpText: 'Previsão de recebíveis de cartões, Pix e agendamentos futuros.',
  },
  {
    id: 'q9_knowsMonthlyCost',
    order: 9,
    title: 'Você sabe seu custo mensal?',
    category: 'FINANCAS',
    type: 'boolean',
    helpText: 'Soma exata de aluguel, luz, água, comissões e insumos.',
  },
  {
    id: 'q10_knowsBreakEven',
    order: 10,
    title: 'Você sabe quanto precisa faturar para atingir o ponto de equilíbrio?',
    category: 'FINANCAS',
    type: 'boolean',
    helpText: 'Meta mínima de faturamento apenas para não ter prejuízo.',
  },
  {
    id: 'q11_doesReactivationCampaigns',
    order: 11,
    title: 'Você faz campanhas de reativação?',
    category: 'CLIENTES',
    type: 'boolean',
    helpText: 'Mensagens direcionadas de WhatsApp para clientes ausentes.',
  },
  {
    id: 'q12_tracksOccupancyRate',
    order: 12,
    title: 'Você acompanha a taxa de ocupação?',
    category: 'OPERACAO',
    type: 'boolean',
    helpText: 'Percentual de horários ocupados em relação à capacidade.',
  },
  {
    id: 'q13_hasMonthlyGoal',
    order: 13,
    title: 'Você possui meta mensal?',
    category: 'GESTAO',
    type: 'boolean',
    helpText: 'Meta clara de faturamento ou cortes definida para o mês.',
  },
  {
    id: 'q14_tracksNetProfit',
    order: 14,
    title: 'Você acompanha lucro líquido?',
    category: 'FINANCAS',
    type: 'boolean',
    helpText: 'O dinheiro que sobra limpo após pagar todas as despesas.',
  },
  {
    id: 'q15_biggestProblem',
    order: 15,
    title: 'Qual seu maior problema atualmente?',
    category: 'GESTAO',
    type: 'select',
    options: [
      'Atrair clientes',
      'Fazer clientes voltarem',
      'Aumentar faturamento',
      'Melhorar lucro',
      'Controlar despesas',
      'Organizar equipe',
      'Melhorar marketing',
      'Encher horários vazios',
      'Não sei',
    ],
    helpText: 'Sua dor principal na operação do dia a dia.',
  },
];

/**
 * Motor Determinístico de Diagnóstico da Barbearia
 */
export function runDiagnosticEvaluation(
  answers?: DiagnosticAnswers,
  realMetrics?: TenantRealMetrics
): DiagnosticResult {
  // 1. Fusão de Dados: Priorizar dados reais se disponíveis
  const hasRealData = !!(
    realMetrics &&
    (realMetrics.monthlyAppointments > 0 ||
      realMetrics.monthlyRevenue > 0 ||
      realMetrics.activeClientsCount > 0 ||
      realMetrics.barbersCount > 0)
  );

  const barbers = Number(realMetrics?.barbersCount || answers?.q1_barbersCount || 1);
  const revenue = Number(
    realMetrics && realMetrics.monthlyRevenue > 0
      ? realMetrics.monthlyRevenue
      : answers?.q2_monthlyRevenue || 0
  );
  const appointments = Number(
    realMetrics && realMetrics.monthlyAppointments > 0
      ? realMetrics.monthlyAppointments
      : answers?.q3_monthlyAppointments || 0
  );
  const ticket = Number(
    realMetrics && realMetrics.avgTicket > 0
      ? realMetrics.avgTicket
      : answers?.q4_avgTicket || (appointments > 0 && revenue > 0 ? revenue / appointments : 0)
  );
  const activeClients = Number(
    realMetrics && realMetrics.activeClientsCount > 0
      ? realMetrics.activeClientsCount
      : answers?.q5_activeClients || 0
  );
  const inactiveClients = Number(
    realMetrics && typeof realMetrics.inactiveClientsCount === 'number'
      ? realMetrics.inactiveClientsCount
      : answers?.q6_inactiveClients || 0
  );

  // Capacidade estimada (25 dias * 10h * 1.5 cortes/h por barbeiro)
  const maxCapacity = Math.max(1, barbers) * 25 * 10 * 1.5;
  const calculatedOccupancy = appointments > 0 ? Math.min(100, (appointments / maxCapacity) * 100) : 0;
  const occupancyRate = Number(
    realMetrics && realMetrics.occupancyRate > 0
      ? realMetrics.occupancyRate
      : calculatedOccupancy || (answers?.q12_tracksOccupancyRate ? 55 : 35)
  );

  const totalClients = activeClients + inactiveClients;
  const inactiveRatePercent = totalClients > 0 ? (inactiveClients / totalClients) * 100 : 0;

  const dataSource: 'REAL_DATA' | 'MANUAL_ANSWERS' | 'HYBRID' =
    hasRealData && answers && Object.keys(answers).length > 0
      ? 'HYBRID'
      : hasRealData
      ? 'REAL_DATA'
      : 'MANUAL_ANSWERS';

  // 2. Verificação de Dados Insuficientes
  const isDataEmpty =
    barbers === 1 &&
    revenue === 0 &&
    appointments === 0 &&
    ticket === 0 &&
    activeClients === 0 &&
    !answers?.q15_biggestProblem;

  if (isDataEmpty) {
    return {
      healthScore: 0,
      healthCategory: 'DADOS_INSUFICIENTES',
      pillars: {},
      priorities: [
        {
          id: 'prio-iniciar',
          rank: 1,
          category: 'COMECE_AQUI',
          title: 'Cadastrar Primeiros Serviços e Barbeiros',
          description: 'Sua barbearia ainda não possui agendamentos ou respostas suficientes.',
          actionLabel: 'Cadastrar Serviços',
          actionUrl: '/servicos',
          badge: 'URGENTE',
        },
      ],
      actionPlans: [],
      biggestProblemIdentified: 'Dados insuficientes para diagnóstico preciso.',
      missingData: {
        isInsufficient: true,
        missingFields: ['Faturamento', 'Atendimentos', 'Clientes', 'Serviços'],
        guidance:
          'Cadastre seus serviços e barbeiros no BarberFlow ou responda ao questionário de diagnóstico para calcular o Índice de Saúde.',
      },
      effectiveMetrics: {
        barbersCount: barbers,
        monthlyRevenue: revenue,
        monthlyAppointments: appointments,
        avgTicket: ticket,
        activeClientsCount: activeClients,
        inactiveClientsCount: inactiveClients,
        occupancyRate,
        inactiveRatePercent,
        dataSource,
      },
    };
  }

  // 3. Avaliação dos 6 Pilares (Total de 100 Pontos)
  let totalScore = 0;

  // PILAR 1: Ocupação e Capacidade (Peso 20 pts)
  let p1Score = 6;
  let p1Status: 'EXCELENTE' | 'BOM' | 'ATENCAO' | 'CRITICO' = 'CRITICO';
  let p1Diag = 'Taxa de ocupação abaixo de 50%. Existe alta ociosidade de cadeiras nos dias úteis.';
  if (occupancyRate >= 70) {
    p1Score = 20;
    p1Status = 'EXCELENTE';
    p1Diag = `Excelente ocupação (${occupancyRate.toFixed(1)}%). Sua capacidade produtiva está bem aproveitada.`;
  } else if (occupancyRate >= 50) {
    p1Score = 14;
    p1Status = 'BOM';
    p1Diag = `Ocupação média (${occupancyRate.toFixed(1)}%). Há espaço para preencher terças e quartas-feiras.`;
  } else if (occupancyRate >= 30) {
    p1Score = 10;
    p1Status = 'ATENCAO';
    p1Diag = `Ocupação em alerta (${occupancyRate.toFixed(1)}%). Grande perda de faturamento por horários ociosos.`;
  }
  totalScore += p1Score;

  // PILAR 2: Retenção & Clientes Inativos (Peso 20 pts)
  let p2Score = 6;
  let p2Status: 'EXCELENTE' | 'BOM' | 'ATENCAO' | 'CRITICO' = 'CRITICO';
  let p2Diag = 'Alto percentual de clientes sem retornar (> 25%). Risco elevado de abandono de base.';
  if (inactiveRatePercent < 15 && (answers?.q11_doesReactivationCampaigns || activeClients > 0)) {
    p2Score = 20;
    p2Status = 'EXCELENTE';
    p2Diag = `Excelente retenção. Apenas ${inactiveRatePercent.toFixed(1)}% da base está ausente.`;
  } else if (inactiveRatePercent <= 25) {
    p2Score = 14;
    p2Status = 'BOM';
    p2Diag = `Retenção saudável (${inactiveRatePercent.toFixed(1)}% inativos), com oportunidade de reativação rápida.`;
  } else if (inactiveRatePercent <= 35) {
    p2Score = 10;
    p2Status = 'ATENCAO';
    p2Diag = `Atenção: ${inactiveClients} clientes (${inactiveRatePercent.toFixed(1)}%) ultrapassaram o ciclo normal.`;
  }
  totalScore += p2Score;

  // PILAR 3: Ticket Médio & Faturamento (Peso 20 pts)
  let p3Score = 6;
  let p3Status: 'EXCELENTE' | 'BOM' | 'ATENCAO' | 'CRITICO' = 'CRITICO';
  let p3Diag = 'Ticket médio abaixo do benchmark de mercado (R$ 35,00). Espaço para combos e adicionais.';
  if (ticket >= 55) {
    p3Score = 20;
    p3Status = 'EXCELENTE';
    p3Diag = `Excelente ticket médio (R$ ${ticket.toFixed(2)}). Forte valor percebido por atendimento.`;
  } else if (ticket >= 42) {
    p3Score = 15;
    p3Status = 'BOM';
    p3Diag = `Ticket médio saudável (R$ ${ticket.toFixed(2)}). Pode ser ampliado com venda de produtos na bancada.`;
  } else if (ticket >= 30) {
    p3Score = 10;
    p3Status = 'ATENCAO';
    p3Diag = `Ticket médio mediano (R$ ${ticket.toFixed(2)}). Necessário trabalhar barboterapia e combos.`;
  }
  totalScore += p3Score;

  // PILAR 4: Gestão Financeira & Custos (Peso 20 pts)
  let p4Score = 4;
  const trackPayables = answers?.q7_trackPayables ?? realMetrics?.hasAccountsPayable ?? false;
  const knowsCost = answers?.q9_knowsMonthlyCost ?? realMetrics?.hasRecurringExpenses ?? false;
  const knowsBreakEven = answers?.q10_knowsBreakEven ?? false;
  const tracksNetProfit = answers?.q14_tracksNetProfit ?? false;

  let finCount = (trackPayables ? 1 : 0) + (knowsCost ? 1 : 0) + (knowsBreakEven ? 1 : 0) + (tracksNetProfit ? 1 : 0);
  if (finCount === 4) {
    p4Score = 20;
  } else if (finCount === 3) {
    p4Score = 15;
  } else if (finCount === 2) {
    p4Score = 10;
  } else if (finCount === 1) {
    p4Score = 6;
  }
  let p4Status: 'EXCELENTE' | 'BOM' | 'ATENCAO' | 'CRITICO' =
    p4Score >= 18 ? 'EXCELENTE' : p4Score >= 14 ? 'BOM' : p4Score >= 9 ? 'ATENCAO' : 'CRITICO';
  let p4Diag =
    p4Score >= 18
      ? 'Controle financeiro rigoroso com acompanhamento de custos, ponto de equilíbrio e lucro.'
      : p4Score >= 12
      ? 'Controle financeiro intermediário. Recomenda-se apurar ponto de equilíbrio mensal com precisão.'
      : 'Controle financeiro frágil. Risco de despesas crescerem sem percepção do gestor.';
  totalScore += p4Score;

  // PILAR 5: Fluxo de Caixa & Contas a Pagar (Peso 10 pts)
  let p5Score = 2;
  const trackReceivables = answers?.q8_trackReceivables ?? realMetrics?.hasAccountsReceivable ?? false;
  const upcomingPayables = realMetrics?.upcomingPayables7d || 0;
  const upcomingReceivables = realMetrics?.upcomingReceivables7d || 0;

  if (upcomingPayables > 0 && upcomingPayables > upcomingReceivables * 1.5) {
    p5Score = 4; // Atenção ao fluxo de caixa
  } else if (trackPayables && trackReceivables) {
    p5Score = 10;
  } else if (trackPayables || trackReceivables) {
    p5Score = 6;
  }
  let p5Status: 'EXCELENTE' | 'BOM' | 'ATENCAO' | 'CRITICO' =
    p5Score >= 8 ? 'EXCELENTE' : p5Score >= 6 ? 'BOM' : p5Score >= 4 ? 'ATENCAO' : 'CRITICO';
  let p5Diag =
    p5Score >= 8
      ? 'Fluxo de caixa sob acompanhamento com previsão equilibrada de entradas e saídas.'
      : upcomingPayables > 0 && upcomingPayables > upcomingReceivables
      ? 'Atenção ao fluxo de caixa nos próximos 7 dias: contas a pagar superiores às entradas previstas.'
      : 'Necessidade de acompanhamento preventivo do fluxo de caixa e conciliação bancária.';
  totalScore += p5Score;

  // PILAR 6: Metas & Rotinas de Acompanhamento (Peso 10 pts)
  let p6Score = 2;
  const hasMonthlyGoal = answers?.q13_hasMonthlyGoal ?? realMetrics?.hasGoalsConfigured ?? false;
  const tracksOccupancy = answers?.q12_tracksOccupancyRate ?? false;
  const doesReactivation = answers?.q11_doesReactivationCampaigns ?? false;

  let goalCount = (hasMonthlyGoal ? 1 : 0) + (tracksOccupancy ? 1 : 0) + (doesReactivation ? 1 : 0);
  if (goalCount === 3) {
    p6Score = 10;
  } else if (goalCount === 2) {
    p6Score = 7;
  } else if (goalCount === 1) {
    p6Score = 4;
  }
  let p6Status: 'EXCELENTE' | 'BOM' | 'ATENCAO' | 'CRITICO' =
    p6Score >= 8 ? 'EXCELENTE' : p6Score >= 6 ? 'BOM' : p6Score >= 4 ? 'ATENCAO' : 'CRITICO';
  let p6Diag =
    p6Score >= 8
      ? 'Rotina de metas ativas e acompanhamento de indicadores operacionais consolidada.'
      : p6Score >= 5
      ? 'Metas parciais. Recomenda-se desdobrar metas de faturamento em metas diárias por barbeiro.'
      : 'Ausência de metas claras de faturamento e campanhas regulares de reativação.';
  totalScore += p6Score;

  // 4. Categorização do Score (0 a 100)
  const healthScore = Math.min(100, Math.max(0, Math.round(totalScore)));
  let healthCategory: HealthCategory = 'CRITICO';
  if (healthScore >= 80) {
    healthCategory = 'EXCELENTE';
  } else if (healthScore >= 60) {
    healthCategory = 'SAUDAVEL';
  } else if (healthScore >= 40) {
    healthCategory = 'ATENCAO';
  }

  // 5. Maior Problema Apontado
  const biggestProblem = answers?.q15_biggestProblem || (
    p1Status === 'CRITICO' ? 'Encher horários vazios' :
    p2Status === 'CRITICO' ? 'Fazer clientes voltarem' :
    p3Status === 'CRITICO' ? 'Aumentar faturamento' :
    p4Status === 'CRITICO' ? 'Controlar despesas' :
    'Aumentar faturamento'
  );

  // 6. Geração do Painel "🎯 O que fazer hoje?" (Top 3 Prioridades)
  const candidates: Array<{ rankWeight: number; item: DailyPriority }> = [];

  // Candidato Reativação
  if (inactiveClients > 0 || inactiveRatePercent > 20 || biggestProblem === 'Fazer clientes voltarem') {
    candidates.push({
      rankWeight: 100 + (inactiveClients || 10),
      item: {
        id: 'prio-reativacao',
        rank: 1,
        category: 'CLIENTES_FIDELIZACAO',
        title: 'Reativar Clientes Ausentes',
        description:
          inactiveClients > 0
            ? `Você possui ${inactiveClients} clientes sem retorno acima do ciclo habitual.`
            : 'Envie uma mensagem de WhatsApp para clientes ausentes há mais de 30 dias.',
        actionLabel: 'Abrir Recorrência',
        actionUrl: '/recorrencia',
        badge: 'URGENTE',
      },
    });
  }

  // Candidato Horários Vazios / Ocupação
  if (occupancyRate < 60 || biggestProblem === 'Encher horários vazios') {
    candidates.push({
      rankWeight: 90 + (100 - occupancyRate),
      item: {
        id: 'prio-ocupacao',
        rank: 2,
        category: 'OPERACAO',
        title: 'Otimizar Horários Vazios da Semana',
        description: `Sua ocupação estimada está em ${occupancyRate.toFixed(0)}%. Crie combos para terça e quarta.`,
        actionLabel: 'Abrir Agenda',
        actionUrl: '/agenda',
        badge: occupancyRate < 45 ? 'URGENTE' : 'ALTA',
      },
    });
  }

  // Candidato Financeiro / Contas a Pagar
  if (!trackPayables || (upcomingPayables > 0 && upcomingPayables > upcomingReceivables) || biggestProblem === 'Controlar despesas') {
    candidates.push({
      rankWeight: 85,
      item: {
        id: 'prio-financeiro',
        rank: 3,
        category: 'FINANCAS',
        title: 'Acompanhar Fluxo de Caixa e Vencimentos',
        description:
          upcomingPayables > 0
            ? `Existem R$ ${upcomingPayables.toFixed(2)} em contas vencendo nos próximos 7 dias.`
            : 'Revise os lançamentos de receitas e despesas para garantir saldo positivo.',
        actionLabel: 'Abrir Gestão Financeira',
        actionUrl: '/gestao-financeira',
        badge: 'ALTA',
      },
    });
  }

  // Candidato Ticket Médio / Cardápio
  if (ticket < 48 || biggestProblem === 'Aumentar faturamento' || biggestProblem === 'Melhorar lucro') {
    candidates.push({
      rankWeight: 80 + (50 - Math.min(50, ticket)),
      item: {
        id: 'prio-ticket',
        rank: 4,
        category: 'FINANCAS',
        title: 'Criar Combos para Elevar Ticket Médio',
        description: `Seu ticket médio é de R$ ${ticket.toFixed(2)}. Incluir barboterapia ou produto eleva o lucro por corte.`,
        actionLabel: 'Ver Tabela de Serviços',
        actionUrl: '/servicos',
        badge: 'MEDIA',
      },
    });
  }

  // Candidato Marketing / Google Maps
  if (biggestProblem === 'Atrair clientes' || biggestProblem === 'Melhorar marketing') {
    candidates.push({
      rankWeight: 88,
      item: {
        id: 'prio-marketing',
        rank: 5,
        category: 'MARKETING_VENDAS',
        title: 'Atrair Novos Clientes pelo Google Maps',
        description: 'Peça avaliações no Google Maps e publique fotos semanais da barbearia.',
        actionLabel: 'Abrir Academia Marketing',
        actionUrl: '/academia?category=MARKETING_VENDAS',
        badge: 'ALTA',
      },
    });
  }

  // Ordenar candidatos e limitar a no máximo 3
  const priorities: DailyPriority[] = candidates
    .sort((a, b) => b.rankWeight - a.rankWeight)
    .slice(0, 3)
    .map((c, idx) => ({
      ...c.item,
      rank: idx + 1,
    }));

  // 7. Geração do Plano de Ação Estruturado com Recomendações da Academia
  const actionPlans: ActionPlanItemBlueprint[] = [];

  // Ação 1: Ocupação / Horários Vazios
  if (occupancyRate < 65 || biggestProblem === 'Encher horários vazios') {
    actionPlans.push({
      id: 'plan-ocupacao-semana',
      title: 'Plano de Ocupação de Terça e Quarta-Feira',
      problem: 'Baixa ocupação da capacidade produtiva no início e meio da semana.',
      whyItMatters:
        'Cadeiras ociosas representam custo fixo consumido sem gerar receita. Preencher esses horários aumenta o lucro líquido sem aumentar o aluguel.',
      action: 'Criar campanha de combos especiais (ex: Corte + Barba) exclusivos para terça e quarta-feira.',
      howTo:
        '1) Cadastre o serviço "Combo Terça/Quarta" com preço promocional.\n2) Avise sua base no WhatsApp na segunda-feira à noite.\n3) Incentive a equipe com bonificação por agendamento nos dias fracos.',
      deadlineDays: 7,
      indicator: 'Atingir ocupação mínima de 60% de terça a quinta-feira.',
      recommendedCategory: 'OPERACAO',
      recommendedContentIds: [
        'trilha-m7-otimizacao-agenda-ocupacao',
        'gestao-sebrae-aprender-empreender',
        'gestao-senai-desvendando-produtividade',
      ],
      recommendedToolId: 'calc-taxa-ocupacao',
      recommendedChecklistId: 'chk-padrao-atendimento',
      priority: 'ALTA',
    });
  }

  // Ação 2: Reativação de Clientes
  if (inactiveRatePercent > 18 || inactiveClients > 5 || biggestProblem === 'Fazer clientes voltarem') {
    actionPlans.push({
      id: 'plan-reativacao-base',
      title: 'Campanha de Recuperação de Clientes Inativos',
      problem: 'Existe uma quantidade relevante de clientes que não retornaram no tempo ideal.',
      whyItMatters:
        'Conquistar um novo cliente custa até 7 vezes mais caro do que manter um cliente existente. A maioria esquece de agendar por falta de contato proativo.',
      action: 'Executar disparos humanizados de WhatsApp com oferta de retorno acolhedora.',
      howTo:
        '1) Acesse a aba Recorrência no BarberFlow e filtre clientes com +30 dias sem visita.\n2) Use o Gerador de Mensagens de Reativação da Academia.\n3) Envie 15 mensagens personalizadas por dia de manhã.',
      deadlineDays: 5,
      indicator: `Reativar pelo menos 20% dos ${inactiveClients || 15} clientes ausentes nos próximos 7 dias.`,
      recommendedCategory: 'CLIENTES_FIDELIZACAO',
      recommendedContentIds: [
        'trilha-m5-fidelizacao-recorrencia',
        'gestao-sebrae-qualidade-atendimento',
      ],
      recommendedToolId: 'calc-retencao-churn',
      recommendedChecklistId: 'chk-marketing-semanal',
      priority: 'ALTA',
    });
  }

  // Ação 3: Ticket Médio & Precificação
  if (ticket < 50 || biggestProblem === 'Aumentar faturamento' || biggestProblem === 'Melhorar lucro') {
    actionPlans.push({
      id: 'plan-ticket-combos',
      title: 'Elevação de Ticket Médio com Serviços Agregados e Produtos',
      problem: 'Existe oportunidade de aumentar o valor médio gasto por cliente em cada atendimento.',
      whyItMatters:
        'Aumentar R$ 10 no ticket médio em 300 atendimentos mensais gera R$ 3.000 a mais de faturamento direto no caixa.',
      action: 'Oferecer barboterapia, sobrancelha e pomadas na bancada na etapa de finalização.',
      howTo:
        '1) Treine a equipe para aplicar e demonstrar a pomada ou óleo no corte.\n2) Use a Calculadora de Preço de Venda da Academia para revisar margens.\n3) Crie o hábito de oferecer o serviço adicional enquanto o cliente está na cadeira.',
      deadlineDays: 10,
      indicator: `Elevar o ticket médio de R$ ${ticket.toFixed(2)} para pelo menos R$ ${(ticket + 10).toFixed(2)}.`,
      recommendedCategory: 'FINANCAS',
      recommendedContentIds: [
        'trilha-m3-formacao-de-preco',
        'financas-sebrae-preco-venda',
        'trilha-m8-como-vender-produtos-bancada',
      ],
      recommendedToolId: 'calc-preco-venda',
      recommendedChecklistId: 'chk-financeiro',
      priority: 'MEDIA',
    });
  }

  // Ação 4: Gestão Financeira & Ponto de Equilíbrio
  if (!knowsBreakEven || !trackPayables || biggestProblem === 'Controlar despesas') {
    actionPlans.push({
      id: 'plan-gestao-financeira',
      title: 'Estruturação de Ponto de Equilíbrio e Controle de Despesas',
      problem: 'Necessidade de controle rigoroso de custos fixos e apuração do lucro real.',
      whyItMatters:
        'Faturamento sem controle de custos gera ilusão de caixa. Saber o ponto de equilíbrio blinda a barbearia contra surpresas financeiras.',
      action: 'Listar todas as contas fixas e apurar a meta mínima de atendimentos no mês.',
      howTo:
        '1) Registre suas despesas fixas e variáveis no módulo de Gestão Financeira do BarberFlow.\n2) Use a Calculadora de Ponto de Equilíbrio da Academia.\n3) Separe rigorosamente a conta bancária da barbearia do pró-labore pessoal.',
      deadlineDays: 7,
      indicator: '100% das despesas e ponto de equilíbrio mapeados e registrados.',
      recommendedCategory: 'FINANCAS',
      recommendedContentIds: [
        'trilha-m2-controle-financeiro-basico',
        'financas-sebrae-fluxo-caixa',
        'financas-artigo-ponto-equilibrio',
      ],
      recommendedToolId: 'calc-ponto-equilibrio',
      recommendedChecklistId: 'chk-fechamento-semanal',
      priority: 'ALTA',
    });
  }

  // Ação 5: Marketing Local & Google Maps
  if (biggestProblem === 'Atrair clientes' || biggestProblem === 'Melhorar marketing') {
    actionPlans.push({
      id: 'plan-marketing-maps',
      title: 'Domínio do Google Maps e Atração de Novos Clientes',
      problem: 'Dificuldade em manter um fluxo constante de novos clientes da região.',
      whyItMatters:
        'Mais de 70% das buscas por barbearia começam no Google Maps ("barbearia perto de mim"). Ter um perfil com fotos e avaliações 5 estrelas é gratuito e altamente conversor.',
      action: 'Otimizar o perfil no Google Meu Negócio e pedir avaliações aos clientes satisfeitos.',
      howTo:
        '1) Adicione fotos de alta qualidade da fachada, espaço interno e equipe no Google Maps.\n2) Inclua o link de agendamento online do BarberFlow.\n3) Envie o link do Google para os 10 clientes mais fiéis pedindo avaliação com 5 estrelas.',
      deadlineDays: 14,
      indicator: 'Conquistar pelo menos 15 novas avaliações 5 estrelas no Google Maps.',
      recommendedCategory: 'MARKETING_VENDAS',
      recommendedContentIds: [
        'trilha-m4-marketing-iniciante',
        'gestao-sebrae-qualidade-atendimento',
      ],
      recommendedToolId: 'calc-roi-marketing',
      recommendedChecklistId: 'chk-marketing-semanal',
      priority: 'MEDIA',
    });
  }


  return {
    healthScore,
    healthCategory,
    pillars: {
      ocupacao: {
        name: 'Ocupação & Capacidade',
        weight: 20,
        score: p1Score,
        maxScore: 20,
        status: p1Status,
        diagnosis: p1Diag,
      },
      retencao: {
        name: 'Retenção & Recorrência',
        weight: 20,
        score: p2Score,
        maxScore: 20,
        status: p2Status,
        diagnosis: p2Diag,
      },
      ticket: {
        name: 'Ticket Médio & Faturamento',
        weight: 20,
        score: p3Score,
        maxScore: 20,
        status: p3Status,
        diagnosis: p3Diag,
      },
      financas: {
        name: 'Gestão Financeira & Margem',
        weight: 20,
        score: p4Score,
        maxScore: 20,
        status: p4Status,
        diagnosis: p4Diag,
      },
      fluxo: {
        name: 'Fluxo de Caixa & Contas a Pagar',
        weight: 10,
        score: p5Score,
        maxScore: 10,
        status: p5Status,
        diagnosis: p5Diag,
      },
      metas: {
        name: 'Metas & Rotinas de Gestão',
        weight: 10,
        score: p6Score,
        maxScore: 10,
        status: p6Status,
        diagnosis: p6Diag,
      },
    },
    priorities,
    actionPlans,
    biggestProblemIdentified: biggestProblem,
    effectiveMetrics: {
      barbersCount: barbers,
      monthlyRevenue: revenue,
      monthlyAppointments: appointments,
      avgTicket: ticket,
      activeClientsCount: activeClients,
      inactiveClientsCount: inactiveClients,
      occupancyRate,
      inactiveRatePercent,
      dataSource,
    },
  };
}

/**
 * Recupera os conteúdos oficiais da Academia recomendados por um plano de ação
 */
export function getRecommendedContents(contentIds: string[]): EducationContentItem[] {
  if (!contentIds || !Array.isArray(contentIds)) return [];
  return ACADEMIA_CONTENTS.filter((c) => contentIds.includes(c.id));
}

/**
 * Consulta o banco de dados do tenant para extrair métricas reais agregadas
 */
export async function fetchTenantRealMetrics(
  prismaClient: any,
  barbershopId: string
): Promise<TenantRealMetrics> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thirtyFiveDaysAgo = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    appointmentsMonth,
    barbersCount,
    customers,
    recentCompletedAppointments,
    financialTransactions,
    upcomingPayables,
    upcomingReceivables,
    recurringRulesCount,
    moneyOnTheTableCount,
  ] = await Promise.all([
    prismaClient.appointment.count({
      where: {
        barbershopId,
        scheduledAt: { gte: thirtyDaysAgo },
        status: { in: ['CONCLUIDO', 'CONFIRMADO', 'AGENDADO'] },
      },
    }).catch(() => 0),
    prismaClient.barber.count({
      where: { barbershopId, isActive: true },
    }).catch(() => 1),
    prismaClient.customer.findMany({
      where: { barbershopId },
      select: {
        id: true,
        appointments: {
          take: 1,
          orderBy: { scheduledAt: 'desc' },
          select: { scheduledAt: true },
        },
      },
    }).catch(() => []),
    prismaClient.appointment.findMany({
      where: {
        barbershopId,
        scheduledAt: { gte: thirtyDaysAgo },
        status: 'CONCLUIDO',
      },
      select: {
        price: true,
      },
    }).catch(() => []),
    prismaClient.financialTransaction.findMany({
      where: {
        barbershopId,
        createdAt: { gte: thirtyDaysAgo },
        status: { in: ['CONFIRMADO', 'PAGO', 'RECEBIDO'] },
      },
      select: {
        type: true,
        amount: true,
      },
    }).catch(() => []),
    prismaClient.financialTransaction.findMany({
      where: {
        barbershopId,
        type: 'EXPENSE',
        dueDate: { gte: now, lte: next7Days },
        status: 'PENDENTE',
      },
      select: {
        amount: true,
      },
    }).catch(() => []),
    prismaClient.financialTransaction.findMany({
      where: {
        barbershopId,
        type: 'INCOME',
        dueDate: { gte: now, lte: next7Days },
        status: 'PENDENTE',
      },
      select: {
        amount: true,
      },
    }).catch(() => []),
    prismaClient.financialRecurringRule.count({
      where: { barbershopId, isActive: true },
    }).catch(() => 0),
    prismaClient.moneyOnTheTableRecovery.count({
      where: { barbershopId, status: 'PENDING' },
    }).catch(() => 0),
  ]);

  // Faturamento por agendamentos concluídos
  const appointmentRevenue = (recentCompletedAppointments || []).reduce(
    (acc: number, app: any) => acc + (app.price || 0),
    0
  );

  // Faturamento e despesas financeiras
  const finIncomes = (financialTransactions || [])
    .filter((t: any) => t.type === 'INCOME')
    .reduce((acc: number, t: any) => acc + (t.amount || 0), 0);
  const finExpenses = (financialTransactions || [])
    .filter((t: any) => t.type === 'EXPENSE')
    .reduce((acc: number, t: any) => acc + (t.amount || 0), 0);

  const monthlyRevenue = Math.max(appointmentRevenue, finIncomes);
  const monthlyAppointments = appointmentsMonth || (recentCompletedAppointments || []).length || 0;
  const avgTicket =
    recentCompletedAppointments && recentCompletedAppointments.length > 0
      ? appointmentRevenue / recentCompletedAppointments.length
      : monthlyAppointments > 0 && monthlyRevenue > 0
      ? monthlyRevenue / monthlyAppointments
      : 0;

  // Clientes ativos e inativos
  const customerList = customers || [];
  const inactiveCount = customerList.filter((c: any) => {
    if (!c.appointments || c.appointments.length === 0) return false;
    return new Date(c.appointments[0].scheduledAt) < thirtyFiveDaysAgo;
  }).length;
  const activeCount = Math.max(0, customerList.length - inactiveCount);

  // Ocupação estimada
  const effectiveBarbers = Math.max(1, barbersCount || 1);
  const maxMonthlyCapacity = effectiveBarbers * 25 * 10 * 1.5;
  const occupancyRate =
    maxMonthlyCapacity > 0 && monthlyAppointments > 0
      ? Math.min(100, (monthlyAppointments / maxMonthlyCapacity) * 100)
      : 0;

  const upcomingPayablesSum = (upcomingPayables || []).reduce(
    (acc: number, t: any) => acc + (t.amount || 0),
    0
  );
  const upcomingReceivablesSum = (upcomingReceivables || []).reduce(
    (acc: number, t: any) => acc + (t.amount || 0),
    0
  );

  return {
    barbersCount: effectiveBarbers,
    monthlyRevenue: Number(monthlyRevenue.toFixed(2)),
    monthlyAppointments,
    avgTicket: Number(avgTicket.toFixed(2)),
    activeClientsCount: activeCount,
    inactiveClientsCount: inactiveCount,
    occupancyRate: Number(occupancyRate.toFixed(1)),
    monthlyExpenses: Number(finExpenses.toFixed(2)),
    upcomingPayables7d: Number(upcomingPayablesSum.toFixed(2)),
    upcomingReceivables7d: Number(upcomingReceivablesSum.toFixed(2)),
    hasAccountsPayable: finExpenses > 0 || (upcomingPayables && upcomingPayables.length > 0),
    hasAccountsReceivable: finIncomes > 0 || (upcomingReceivables && upcomingReceivables.length > 0),
    hasRecurringExpenses: recurringRulesCount > 0,
    hasGoalsConfigured: monthlyRevenue > 0,
    moneyOnTheTableOpportunities: moneyOnTheTableCount,
  };
}

