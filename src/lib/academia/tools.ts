/**
 * BarberFlow — Academia BarberFlow Tools & Calculators Engine
 * 12 Calculadoras + 8 Geradores com IA Determinística + 9 Checklists
 */

export interface CalculatorDefinition {
  id: string;
  name: string;
  category: 'FINANCAS' | 'OPERACAO' | 'MARKETING' | 'VENDAS' | 'CLIENTES';
  description: string;
  inputs: Array<{
    id: string;
    label: string;
    type: 'number' | 'currency' | 'percent' | 'days';
    defaultValue: number;
    helpText?: string;
  }>;
  calculate: (inputs: Record<string, number>) => {
    primaryResult: { label: string; value: string; isPositive?: boolean };
    secondaryMetrics: Array<{ label: string; value: string }>;
    analysis: string;
  };
}

export interface GeneratorDefinition {
  id: string;
  name: string;
  category: 'MARKETING' | 'WHATSAPP' | 'VENDAS' | 'PLANEJAMENTO';
  description: string;
  inputs: Array<{
    id: string;
    label: string;
    type: 'text' | 'select';
    options?: string[];
    placeholder?: string;
    defaultValue?: string;
  }>;
  generate: (inputs: Record<string, string>) => {
    title: string;
    content: string;
    tips: string[];
  };
}

export interface ChecklistDefinition {
  id: string;
  name: string;
  frequency: 'DIARIO' | 'SEMANAL' | 'MENSAL' | 'EVENTUAL';
  description: string;
  items: Array<{
    id: string;
    task: string;
    importance: 'CRITICA' | 'ALTA' | 'MEDIA';
    tips?: string;
  }>;
}

// =========================================================================
// 12 CALCULADORAS INTERATIVAS
// =========================================================================
export const ACADEMIA_CALCULATORS: CalculatorDefinition[] = [
  {
    id: 'calc-preco-venda',
    name: 'Calculadora de Preço de Venda do Serviço',
    category: 'FINANCAS',
    description: 'Calcule o valor ideal a cobrar baseado no tempo de atendimento, custos fixos, comissão e margem de lucro.',
    inputs: [
      { id: 'durationMin', label: 'Duração do Serviço (minutos)', type: 'number', defaultValue: 30 },
      { id: 'fixedCostPerHour', label: 'Custo Fixo por Hora da Loja (R$)', type: 'currency', defaultValue: 25, helpText: 'Aluguel, luz, água divididos pelas horas abertas' },
      { id: 'productCost', label: 'Custo de Produtos Usados (R$)', type: 'currency', defaultValue: 4, helpText: 'Pomada, gola higiênica, lâmina, toalha' },
      { id: 'commissionPercent', label: 'Comissão do Barbeiro (%)', type: 'percent', defaultValue: 50 },
      { id: 'targetProfit', label: 'Lucro Líquido Desejado da Loja (R$)', type: 'currency', defaultValue: 15 },
    ],
    calculate: (val) => {
      const fixedCost = (val.fixedCostPerHour / 60) * val.durationMin;
      const baseCost = fixedCost + val.productCost + val.targetProfit;
      const commissionRate = val.commissionPercent / 100;
      const recommendedPrice = commissionRate >= 1 ? baseCost * 2 : baseCost / (1 - commissionRate);
      const barberCommission = recommendedPrice * commissionRate;
      const shopNet = recommendedPrice - barberCommission - fixedCost - val.productCost;

      return {
        primaryResult: {
          label: 'Preço Recomendado de Venda',
          value: `R$ ${recommendedPrice.toFixed(2).replace('.', ',')}`,
          isPositive: true,
        },
        secondaryMetrics: [
          { label: 'Comissão do Barbeiro', value: `R$ ${barberCommission.toFixed(2).replace('.', ',')}` },
          { label: 'Custo Fixo Absorvido', value: `R$ ${fixedCost.toFixed(2).replace('.', ',')}` },
          { label: 'Lucro Líquido da Loja', value: `R$ ${shopNet.toFixed(2).replace('.', ',')}` },
        ],
        analysis: recommendedPrice > 0
          ? `Cobrando R$ ${recommendedPrice.toFixed(2).replace('.', ',')}, você cobre todos os custos operacionais do tempo de cadeira, remunera o barbeiro em R$ ${barberCommission.toFixed(2).replace('.', ',')} e garante R$ ${shopNet.toFixed(2).replace('.', ',')} de lucro limpo para o caixa da barbearia.`
          : 'Preencha os valores para calcular.',
      };
    },
  },
  {
    id: 'calc-ponto-equilibrio',
    name: 'Calculadora de Ponto de Equilíbrio (Break-Even)',
    category: 'FINANCAS',
    description: 'Descubra quantos atendimentos mensais você precisa realizar para pagar todas as contas fixas da barbearia.',
    inputs: [
      { id: 'totalFixedCosts', label: 'Total de Custos Fixos Mensais (R$)', type: 'currency', defaultValue: 4500, helpText: 'Aluguel, energia, internet, água, contador, pró-labore' },
      { id: 'avgTicket', label: 'Ticket Médio por Atendimento (R$)', type: 'currency', defaultValue: 50 },
      { id: 'avgCommissionPercent', label: 'Comissão Média da Equipe (%)', type: 'percent', defaultValue: 50 },
      { id: 'avgProductCost', label: 'Custo Médio de Produto por Corte (R$)', type: 'currency', defaultValue: 3 },
    ],
    calculate: (val) => {
      const marginPerCut = val.avgTicket * (1 - val.avgCommissionPercent / 100) - val.avgProductCost;
      const cutsNeeded = marginPerCut > 0 ? Math.ceil(val.totalFixedCosts / marginPerCut) : 0;
      const revenueNeeded = cutsNeeded * val.avgTicket;

      return {
        primaryResult: {
          label: 'Atendimentos Necessários por Mês',
          value: `${cutsNeeded} cortes`,
          isPositive: cutsNeeded > 0,
        },
        secondaryMetrics: [
          { label: 'Faturamento Mínimo para não ter Prejuízo', value: `R$ ${revenueNeeded.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
          { label: 'Margem de Contribuição por Corte', value: `R$ ${marginPerCut.toFixed(2).replace('.', ',')}` },
          { label: 'Cortes por Dia (25 dias)', value: `${(cutsNeeded / 25).toFixed(1)} cortes/dia` },
        ],
        analysis: cutsNeeded > 0
          ? `Sua barbearia precisa de exatamente ${cutsNeeded} atendimentos no mês (cerca de ${(cutsNeeded / 25).toFixed(1)} por dia) apenas para zerar as despesas fixas de R$ ${val.totalFixedCosts.toFixed(2).replace('.', ',')}. A partir do corte nº ${cutsNeeded + 1}, todo atendimento gera lucro líquido.`
          : 'Insira custos e preços válidos.',
      };
    },
  },
  {
    id: 'calc-margem-lucro',
    name: 'Calculadora de Margem de Contribuição e Lucro Líquido',
    category: 'FINANCAS',
    description: 'Analise a rentabilidade real de cada serviço do seu cardápio.',
    inputs: [
      { id: 'servicePrice', label: 'Preço Cobrado do Cliente (R$)', type: 'currency', defaultValue: 50 },
      { id: 'commissionPercent', label: 'Comissão Paga ao Barbeiro (%)', type: 'percent', defaultValue: 50 },
      { id: 'productDirectCost', label: 'Insumos Diretos (R$)', type: 'currency', defaultValue: 3 },
      { id: 'taxPercent', label: 'Imposto / Taxa de Cartão (%)', type: 'percent', defaultValue: 5 },
    ],
    calculate: (val) => {
      const commission = val.servicePrice * (val.commissionPercent / 100);
      const tax = val.servicePrice * (val.taxPercent / 100);
      const netProfit = val.servicePrice - commission - val.productDirectCost - tax;
      const marginPercent = val.servicePrice > 0 ? (netProfit / val.servicePrice) * 100 : 0;

      return {
        primaryResult: {
          label: 'Margem Líquida da Barbearia',
          value: `${marginPercent.toFixed(1)}%`,
          isPositive: marginPercent >= 25,
        },
        secondaryMetrics: [
          { label: 'Lucro Líquido em Reais', value: `R$ ${netProfit.toFixed(2).replace('.', ',')}` },
          { label: 'Comissão Paga', value: `R$ ${commission.toFixed(2).replace('.', ',')}` },
          { label: 'Impostos e Taxas', value: `R$ ${tax.toFixed(2).replace('.', ',')}` },
        ],
        analysis: marginPercent >= 25
          ? `Excelente! Cada atendimento deste serviço deixa R$ ${netProfit.toFixed(2).replace('.', ',')} (${marginPercent.toFixed(1)}%) limpos para o caixa da loja pagar despesas fixas e gerar lucro.`
          : `Atenção: Margem de ${marginPercent.toFixed(1)}% é considerada baixa para prestação de serviços. Recomenda-se reavaliar o preço ou negociar comissão.`,
      };
    },
  },
  {
    id: 'calc-taxa-ocupacao',
    name: 'Calculadora de Taxa de Ocupação da Cadeira',
    category: 'OPERACAO',
    description: 'Descubra a porcentagem de tempo que suas cadeiras passam gerando receita vs horários vazios.',
    inputs: [
      { id: 'chairsCount', label: 'Número de Cadeiras / Barbeiros', type: 'number', defaultValue: 2 },
      { id: 'hoursPerDay', label: 'Horas Abertas por Dia', type: 'number', defaultValue: 10 },
      { id: 'daysPerMonth', label: 'Dias de Funcionamento no Mês', type: 'number', defaultValue: 25 },
      { id: 'cutsDoneMonthly', label: 'Total de Atendimentos no Mês', type: 'number', defaultValue: 300 },
      { id: 'avgDurationMin', label: 'Duração Média por Corte (min)', type: 'number', defaultValue: 35 },
    ],
    calculate: (val) => {
      const totalAvailableMinutes = val.chairsCount * val.hoursPerDay * 60 * val.daysPerMonth;
      const totalOccupiedMinutes = val.cutsDoneMonthly * val.avgDurationMin;
      const occupancyRate = totalAvailableMinutes > 0 ? (totalOccupiedMinutes / totalAvailableMinutes) * 100 : 0;
      const emptyHours = Math.max(0, (totalAvailableMinutes - totalOccupiedMinutes) / 60);

      return {
        primaryResult: {
          label: 'Taxa de Ocupação Real',
          value: `${occupancyRate.toFixed(1)}%`,
          isPositive: occupancyRate >= 65,
        },
        secondaryMetrics: [
          { label: 'Horas Ociosas no Mês', value: `${emptyHours.toFixed(0)} horas vazias` },
          { label: 'Capacidade Máxima Teórica', value: `${Math.floor(totalAvailableMinutes / val.avgDurationMin)} cortes` },
        ],
        analysis: occupancyRate >= 65
          ? `Ótima ocupação (${occupancyRate.toFixed(1)}%). O mercado de beleza opera em média entre 55% e 70%.`
          : `Sua barbearia está com ${emptyHours.toFixed(0)} horas vazias no mês (${occupancyRate.toFixed(1)}% de ocupação). Há grande espaço para crescer preenchendo horários de terça a quinta com campanhas de WhatsApp!`,
      };
    },
  },
  {
    id: 'calc-recorrencia-frequencia',
    name: 'Calculadora de Frequência e Impacto da Recorrência',
    category: 'CLIENTES',
    description: 'Calcule o aumento de faturamento se você reduzir o intervalo médio de retorno dos clientes em 7 dias.',
    inputs: [
      { id: 'activeClients', label: 'Base de Clientes Ativos', type: 'number', defaultValue: 250 },
      { id: 'currentIntervalDays', label: 'Intervalo Atual de Retorno (dias)', type: 'days', defaultValue: 30 },
      { id: 'targetIntervalDays', label: 'Intervalo Desejado (dias)', type: 'days', defaultValue: 21 },
      { id: 'avgTicket', label: 'Ticket Médio (R$)', type: 'currency', defaultValue: 50 },
    ],
    calculate: (val) => {
      const currentVisitsYear = val.currentIntervalDays > 0 ? 365 / val.currentIntervalDays : 0;
      const targetVisitsYear = val.targetIntervalDays > 0 ? 365 / val.targetIntervalDays : 0;
      const currentAnnualRevenue = val.activeClients * currentVisitsYear * val.avgTicket;
      const targetAnnualRevenue = val.activeClients * targetVisitsYear * val.avgTicket;
      const revenueGain = targetAnnualRevenue - currentAnnualRevenue;
      const monthlyGain = revenueGain / 12;

      return {
        primaryResult: {
          label: 'Ganho Anual Estimado de Faturamento',
          value: `+ R$ ${revenueGain.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          isPositive: revenueGain > 0,
        },
        secondaryMetrics: [
          { label: 'Ganho Adicional por Mês', value: `+ R$ ${monthlyGain.toFixed(2).replace('.', ',')}` },
          { label: 'Cortes Anuais Atuais por Cliente', value: `${currentVisitsYear.toFixed(1)} visitas/ano` },
          { label: 'Novos Cortes Anuais por Cliente', value: `${targetVisitsYear.toFixed(1)} visitas/ano` },
        ],
        analysis: `Reduzindo o retorno de ${val.currentIntervalDays} para ${val.targetIntervalDays} dias com lembretes automáticos no WhatsApp, você adiciona R$ ${monthlyGain.toFixed(2).replace('.', ',')} por mês no caixa sem gastar 1 real para atrair clientes novos!`,
      };
    },
  },
  {
    id: 'calc-meta-faturamento',
    name: 'Calculadora de Desdobramento de Metas Diárias',
    category: 'VENDAS',
    description: 'Transforme o faturamento mensal desejado em metas práticas de atendimentos por barbeiro por dia.',
    inputs: [
      { id: 'targetMonthlyRevenue', label: 'Meta de Faturamento Mensal (R$)', type: 'currency', defaultValue: 15000 },
      { id: 'barberCount', label: 'Quantidade de Barbeiros na Equipe', type: 'number', defaultValue: 2 },
      { id: 'avgTicket', label: 'Ticket Médio Estimado (R$)', type: 'currency', defaultValue: 50 },
      { id: 'workDays', label: 'Dias de Trabalho no Mês', type: 'number', defaultValue: 25 },
    ],
    calculate: (val) => {
      const dailyRevenueNeeded = val.workDays > 0 ? val.targetMonthlyRevenue / val.workDays : 0;
      const dailyCutsTotal = val.avgTicket > 0 ? Math.ceil(dailyRevenueNeeded / val.avgTicket) : 0;
      const dailyCutsPerBarber = val.barberCount > 0 ? Math.ceil(dailyCutsTotal / val.barberCount) : 0;

      return {
        primaryResult: {
          label: 'Meta por Barbeiro por Dia',
          value: `${dailyCutsPerBarber} atendimentos/dia`,
          isPositive: true,
        },
        secondaryMetrics: [
          { label: 'Faturamento Diário da Loja', value: `R$ ${dailyRevenueNeeded.toFixed(2).replace('.', ',')}/dia` },
          { label: 'Total de Cortes por Dia', value: `${dailyCutsTotal} cortes/dia` },
          { label: 'Total de Cortes no Mês', value: `${dailyCutsTotal * val.workDays} cortes` },
        ],
        analysis: `Para atingir R$ ${val.targetMonthlyRevenue.toLocaleString('pt-BR')}, cada um dos ${val.barberCount} barbeiros só precisa atender ${dailyCutsPerBarber} clientes por dia. Uma meta simples, tangível e fácil de acompanhar no painel diário.`,
      };
    },
  },
  {
    id: 'calc-roi-marketing',
    name: 'Calculadora de ROI de Anúncios e Tráfego Pago',
    category: 'MARKETING',
    description: 'Meça o retorno real sobre o investimento em anúncios locais no Instagram ou panfletagem.',
    inputs: [
      { id: 'adSpend', label: 'Valor Investido em Anúncios (R$)', type: 'currency', defaultValue: 300 },
      { id: 'newClientsAcquired', label: 'Novos Clientes Atraídos', type: 'number', defaultValue: 20 },
      { id: 'avgTicket', label: 'Ticket Médio da Primeira Visita (R$)', type: 'currency', defaultValue: 50 },
      { id: 'estimatedVisitsPerYear', label: 'Estimativa de Visitas no 1º Ano', type: 'number', defaultValue: 8 },
    ],
    calculate: (val) => {
      const initialRevenue = val.newClientsAcquired * val.avgTicket;
      const annualRevenueLtv = val.newClientsAcquired * val.avgTicket * val.estimatedVisitsPerYear;
      const cac = val.newClientsAcquired > 0 ? val.adSpend / val.newClientsAcquired : 0;
      const roiImmediate = val.adSpend > 0 ? ((initialRevenue - val.adSpend) / val.adSpend) * 100 : 0;
      const roiAnnual = val.adSpend > 0 ? ((annualRevenueLtv - val.adSpend) / val.adSpend) * 100 : 0;

      return {
        primaryResult: {
          label: 'Retorno sobre Investimento Anual (ROI)',
          value: `${roiAnnual.toFixed(0)}%`,
          isPositive: roiAnnual > 0,
        },
        secondaryMetrics: [
          { label: 'Custo de Aquisição por Cliente (CAC)', value: `R$ ${cac.toFixed(2).replace('.', ',')}` },
          { label: 'Receita Imediata da 1ª Visita', value: `R$ ${initialRevenue.toFixed(2).replace('.', ',')}` },
          { label: 'Receita Gerada no 1º Ano (LTV)', value: `R$ ${annualRevenueLtv.toFixed(2).replace('.', ',')}` },
        ],
        analysis: `Seu CAC foi de R$ ${cac.toFixed(2).replace('.', ',')}. Como o cliente gasta R$ ${val.avgTicket.toFixed(2).replace('.', ',')} na 1ª visita e volta ${val.estimatedVisitsPerYear} vezes no ano, cada R$ 1 investido em anúncio gerou R$ ${(annualRevenueLtv / (val.adSpend || 1)).toFixed(1)} em vendas.`,
      };
    },
  },
  {
    id: 'calc-capacidade-maxima',
    name: 'Calculadora de Capacidade Produtiva Máxima',
    category: 'OPERACAO',
    description: 'Entenda o teto máximo de faturamento que seu espaço físico atual consegue gerar.',
    inputs: [
      { id: 'chairs', label: 'Número de Cadeiras', type: 'number', defaultValue: 3 },
      { id: 'avgCutTimeMin', label: 'Tempo por Atendimento + Intervalo (min)', type: 'number', defaultValue: 40 },
      { id: 'operatingHours', label: 'Horas Diárias de Funcionamento', type: 'number', defaultValue: 10 },
      { id: 'operatingDays', label: 'Dias de Funcionamento no Mês', type: 'number', defaultValue: 25 },
      { id: 'avgTicket', label: 'Ticket Médio (R$)', type: 'currency', defaultValue: 50 },
    ],
    calculate: (val) => {
      const cutsPerHourPerChair = 60 / val.avgCutTimeMin;
      const maxCutsDay = Math.floor(cutsPerHourPerChair * val.operatingHours * val.chairs);
      const maxCutsMonth = maxCutsDay * val.operatingDays;
      const maxRevenueMonth = maxCutsMonth * val.avgTicket;

      return {
        primaryResult: {
          label: 'Faturamento Máximo Mensal Possível',
          value: `R$ ${maxRevenueMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          isPositive: true,
        },
        secondaryMetrics: [
          { label: 'Capacidade Máxima por Dia', value: `${maxCutsDay} cortes/dia` },
          { label: 'Capacidade Máxima por Mês', value: `${maxCutsMonth} cortes/mês` },
        ],
        analysis: `Com a estrutura atual, o teto da sua barbearia a 100% de ocupação é de R$ ${maxRevenueMonth.toLocaleString('pt-BR')}/mês. Para crescer além disso, você precisará adicionar mais cadeiras, abrir mais dias/horas ou aumentar seu ticket médio com serviços premium.`,
      };
    },
  },
  {
    id: 'calc-custo-atendimento',
    name: 'Calculadora de Custo Real por Atendimento',
    category: 'FINANCAS',
    description: 'Saiba o custo exato de manter a cadeira rodando durante 1 hora de serviço.',
    inputs: [
      { id: 'totalFixedMonthly', label: 'Despesas Fixas da Loja (R$)', type: 'currency', defaultValue: 4000 },
      { id: 'monthlyAppointments', label: 'Média de Atendimentos no Mês', type: 'number', defaultValue: 300 },
      { id: 'disposableCost', label: 'Gasto Médio com Descartáveis (R$)', type: 'currency', defaultValue: 2.5 },
    ],
    calculate: (val) => {
      const fixedPerApp = val.monthlyAppointments > 0 ? val.totalFixedMonthly / val.monthlyAppointments : 0;
      const totalCostPerApp = fixedPerApp + val.disposableCost;

      return {
        primaryResult: {
          label: 'Custo Operacional por Atendimento',
          value: `R$ ${totalCostPerApp.toFixed(2).replace('.', ',')}`,
          isPositive: true,
        },
        secondaryMetrics: [
          { label: 'Parcela de Custo Fixo por Corte', value: `R$ ${fixedPerApp.toFixed(2).replace('.', ',')}` },
          { label: 'Parcela de Insumos Descartáveis', value: `R$ ${val.disposableCost.toFixed(2).replace('.', ',')}` },
        ],
        analysis: `Cada cliente que senta na sua cadeira custa R$ ${totalCostPerApp.toFixed(2).replace('.', ',')} para a barbearia antes de pagar a comissão do barbeiro. Qualquer serviço cobrado abaixo disso dá prejuízo operacional.`,
      };
    },
  },
  {
    id: 'calc-comissao-barbeiro',
    name: 'Simulador de Repasse de Comissão e Salário Líquido',
    category: 'VENDAS',
    description: 'Simule os ganhos de um barbeiro parceiro e o valor retido pela barbearia para diferentes faixas de produção.',
    inputs: [
      { id: 'barberRevenue', label: 'Faturamento Bruto Gerado pelo Barbeiro (R$)', type: 'currency', defaultValue: 6000 },
      { id: 'commissionPercent', label: 'Percentual de Comissão (%)', type: 'percent', defaultValue: 50 },
      { id: 'productDeduction', label: 'Desconto de Produtos/Taxa de Cartão (R$)', type: 'currency', defaultValue: 150 },
    ],
    calculate: (val) => {
      const rawCommission = val.barberRevenue * (val.commissionPercent / 100);
      const netBarberCommission = Math.max(0, rawCommission - val.productDeduction);
      const shopRetention = val.barberRevenue - netBarberCommission;

      return {
        primaryResult: {
          label: 'Comissão Líquida a Pagar ao Barbeiro',
          value: `R$ ${netBarberCommission.toFixed(2).replace('.', ',')}`,
          isPositive: true,
        },
        secondaryMetrics: [
          { label: 'Valor Retido pela Barbearia', value: `R$ ${shopRetention.toFixed(2).replace('.', ',')}` },
          { label: 'Comissão Bruta', value: `R$ ${rawCommission.toFixed(2).replace('.', ',')}` },
        ],
        analysis: `O barbeiro recebe R$ ${netBarberCommission.toFixed(2).replace('.', ',')} e a barbearia retém R$ ${shopRetention.toFixed(2).replace('.', ',')} para cobrir aluguel, luz, recepção e estrutura da loja.`,
      };
    },
  },
  {
    id: 'calc-ticket-medio-meta',
    name: 'Simulador de Alavancagem por Ticket Médio',
    category: 'VENDAS',
    description: 'Veja como aumentar R$ 10 no ticket médio adiciona milhares de reais no faturamento sem novos clientes.',
    inputs: [
      { id: 'monthlyCuts', label: 'Atendimentos Realizados no Mês', type: 'number', defaultValue: 300 },
      { id: 'currentTicket', label: 'Ticket Médio Atual (R$)', type: 'currency', defaultValue: 45 },
      { id: 'targetTicket', label: 'Ticket Médio Desejado (R$)', type: 'currency', defaultValue: 55 },
    ],
    calculate: (val) => {
      const currentRevenue = val.monthlyCuts * val.currentTicket;
      const targetRevenue = val.monthlyCuts * val.targetTicket;
      const difference = targetRevenue - currentRevenue;
      const annualDifference = difference * 12;

      return {
        primaryResult: {
          label: 'Aumento Mensal no Faturamento',
          value: `+ R$ ${difference.toFixed(2).replace('.', ',')}`,
          isPositive: difference > 0,
        },
        secondaryMetrics: [
          { label: 'Impacto Anual no Caixa', value: `+ R$ ${annualDifference.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
          { label: 'Faturamento Atual', value: `R$ ${currentRevenue.toFixed(2).replace('.', ',')}` },
          { label: 'Novo Faturamento Projetado', value: `R$ ${targetRevenue.toFixed(2).replace('.', ',')}` },
        ],
        analysis: `Apenas oferecendo sobrancelha, lavagem especial ou pomadas para elevar o ticket médio de R$ ${val.currentTicket} para R$ ${val.targetTicket}, você adiciona R$ ${annualDifference.toLocaleString('pt-BR')} no ano com o mesmo número de clientes!`,
      };
    },
  },
  {
    id: 'calc-lucro-liquido-mensal',
    name: 'Calculadora Rápida de Lucro Líquido Real do Mês',
    category: 'FINANCAS',
    description: 'Visão consolidada do DRE simplificado para saber se o mês fechou no azul.',
    inputs: [
      { id: 'grossRevenue', label: 'Faturamento Bruto Total (R$)', type: 'currency', defaultValue: 18000 },
      { id: 'totalCommissions', label: 'Total Pago em Comissões (R$)', type: 'currency', defaultValue: 9000 },
      { id: 'totalFixedExpenses', label: 'Total de Despesas Fixas (R$)', type: 'currency', defaultValue: 4500 },
      { id: 'productsPurchased', label: 'Compras de Produtos e Insumos (R$)', type: 'currency', defaultValue: 1200 },
      { id: 'cardFeesTaxes', label: 'Taxas de Cartão e Impostos MEI (R$)', type: 'currency', defaultValue: 800 },
    ],
    calculate: (val) => {
      const totalExpenses = val.totalCommissions + val.totalFixedExpenses + val.productsPurchased + val.cardFeesTaxes;
      const netProfit = val.grossRevenue - totalExpenses;
      const profitMargin = val.grossRevenue > 0 ? (netProfit / val.grossRevenue) * 100 : 0;

      return {
        primaryResult: {
          label: 'Lucro Líquido do Mês',
          value: `R$ ${netProfit.toFixed(2).replace('.', ',')}`,
          isPositive: netProfit > 0,
        },
        secondaryMetrics: [
          { label: 'Margem Líquida Real', value: `${profitMargin.toFixed(1)}%` },
          { label: 'Total de Custos & Despesas', value: `R$ ${totalExpenses.toFixed(2).replace('.', ',')}` },
        ],
        analysis: netProfit > 0
          ? `Mês positivo! A barbearia gerou R$ ${netProfit.toFixed(2).replace('.', ',')} de lucro líquido (${profitMargin.toFixed(1)}% de margem). Sugestão: 50% para reserva de emergência e 50% para pró-labore/reinvestimento.`
          : `Alerta: O mês fechou com prejuízo de R$ ${Math.abs(netProfit).toFixed(2).replace('.', ',')}. É urgente cortar despesas fixas ou rever comissões e precificação.`,
      };
    },
  },
];

// =========================================================================
// 8 GERADORES PRÁTICOS (IA DETERMINÍSTICA / TEMPLATES)
// =========================================================================
export const ACADEMIA_GENERATORS: GeneratorDefinition[] = [
  {
    id: 'gen-instagram-stories',
    name: 'Gerador de Ideias para Stories & Postagens de Barbearia',
    category: 'MARKETING',
    description: 'Crie ideias prontas de Stories interativos e enquetes para movimentar o Instagram da barbearia.',
    inputs: [
      { id: 'dayOfWeek', label: 'Dia da Semana', type: 'select', options: ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'], defaultValue: 'Quinta-feira' },
      { id: 'focus', label: 'Objetivo da Postagem', type: 'select', options: ['Lotar Horários Vazios', 'Mostrar Antes e Depois', 'Vender Pomada/Produto', 'Engajamento e Enquete', 'Apresentar a Equipe'], defaultValue: 'Lotar Horários Vazios' },
      { id: 'barbershopName', label: 'Nome da sua Barbearia', type: 'text', placeholder: 'Ex: Barbearia Imperial', defaultValue: 'Nossa Barbearia' },
    ],
    generate: (val) => {
      return {
        title: `Roteiro de Stories para ${val.dayOfWeek} — Foco: ${val.focus}`,
        content: `📱 **Sequência de 3 Stories Estruturados:**

**Story 1 (Atenção / Gancho):**
Foto nítida da bancada organizada com toalha e tesoura.
Texto: "Preparando a casa para receber você hoje! 💈✨ Quem aí já está com o corte em dia pro fim de semana?"
Enquete interativa: [ Já estou no estilo! 🔥 ] vs [ Preciso urgente! ✂️ ]

**Story 2 (Desejo / Autoridade):**
Vídeo rápido de 5 segundos mostrando um acabamento na navalha ou degradê navalhado perfeito.
Texto: "Qualidade de acabamento e pontualidade que você merece aqui na *${val.barbershopName}*."

**Story 3 (Ação Imediata com Link):**
Foto com a agenda do dia aberta.
Texto: "🚨 *Ainda restam poucas vagas para hoje e amanhã!* Toque no botão abaixo e garanta seu horário em 30 segundos:"
Adesivo de Link: [ Agendar Meu Horário ]`,
        tips: [
          'Poste os stories entre 11h30 e 13h30 ou das 18h às 20h (horários de pico de acesso).',
          'Sempre responda quem votar na enquete no Direct com o link de agendamento.',
        ],
      };
    },
  },
  {
    id: 'gen-whatsapp-reativacao',
    name: 'Gerador de Mensagens de Reativação de Clientes Inativos',
    category: 'WHATSAPP',
    description: 'Mensagens acolhedoras para trazer de volta clientes que não cortam há mais de 35 dias.',
    inputs: [
      { id: 'tone', label: 'Tom de Voz', type: 'select', options: ['Descontraído e Amigável', 'Profissional e Direto', 'Oferta Especial de Retorno'], defaultValue: 'Descontraído e Amigável' },
      { id: 'incentive', label: 'Incentivo Opcional', type: 'select', options: ['Nenhum (Apenas lembrete)', 'Café especial / Cerveja de cortesia', 'Combo Especial com Sobrancelha'], defaultValue: 'Café especial / Cerveja de cortesia' },
      { id: 'shopName', label: 'Nome da Barbearia', type: 'text', defaultValue: 'Barbearia' },
    ],
    generate: (val) => {
      let msg = '';
      if (val.tone === 'Descontraído e Amigável') {
        msg = `Fala, {Nome do Cliente}! Tudo bem por aí? 👋💈\n\nNotei que faz um tempinho que você não passa aqui na *${val.shopName}* para dar aquele talento no visual.\n\nComo está o corte? Se estiver na hora de renovar o degradê ou alinhar a barba, separei alguns horários nesta semana para você!\n\n${val.incentive !== 'Nenhum (Apenas lembrete)' ? `Passando aqui, o ${val.incentive} é por nossa conta! ☕🍺\n\n` : ''}Para escolher seu horário em 30 segundos, basta acessar o link ou me mandar um Oi:\n👉 {Link de Agendamento}`;
      } else {
        msg = `Olá, {Nome do Cliente}! Aqui é da *${val.shopName}*.\n\nPassando para lembrar que seu último corte foi há mais de um mês. Estamos com a agenda aberta para esta semana!\n\n${val.incentive !== 'Nenhum (Apenas lembrete)' ? `Condição especial: ${val.incentive}.\n\n` : ''}Garanta seu horário com antecedência pelo link:\n👉 {Link de Agendamento}`;
      }

      return {
        title: `Modelo de Reativação: ${val.tone}`,
        content: msg,
        tips: [
          'Envie individualmente ou pelo módulo de Recorrência do BarberFlow.',
          'Nunca envie mensagens em tom de cobrança. O foco é cuidado e comodidade.',
        ],
      };
    },
  },
  {
    id: 'gen-campanha-promocional',
    name: 'Gerador de Campanhas Promocionais & Combos',
    category: 'VENDAS',
    description: 'Crie ofertas inteligentes para datas comemorativas ou dias de menor movimento.',
    inputs: [
      { id: 'theme', label: 'Tema da Campanha', type: 'select', options: ['Terça & Quarta do Barbaço', 'Dia dos Pais', 'Black Friday / Black Week', 'Combo Dia do Noivo / Padrinhos', 'Quinta dos Amigos (2 Cortes)'], defaultValue: 'Terça & Quarta do Barbaço' },
      { id: 'shopName', label: 'Nome da Barbearia', type: 'text', defaultValue: 'BarberFlow' },
    ],
    generate: (val) => {
      return {
        title: `Plano de Campanha: ${val.theme}`,
        content: `🎯 **Proposta da Campanha: ${val.theme}**

**1. A Oferta Irresistível:**
Em vez de dar desconto no corte avulso, crie um Combo de Alto Valor:
- *Serviço:* Corte Tradicional + Barboterapia com Toalha Quente + Alinhamento de Sobrancelha.
- *De:* R$ 90,00 por apenas R$ 75,00 (Válido exclusivamente de Terça a Quarta).

**2. Copy para Redes Sociais / WhatsApp:**
"Seu momento de relaxar e renovar o visual no meio da semana! 💈🔥
Aproveite o nosso combo exclusivo *${val.theme}* na *${val.shopName}*.
Vagas limitadas para manter a qualidade de cada atendimento."

**3. Regra de Execução:**
- Exigir agendamento prévio pelo link do BarberFlow.
- Divulgar a partir de domingo à noite nos Stories.`,
        tips: [
          'Combos protegem a sua margem porque aumentam o ticket médio sem que você precise cortar o preço do serviço principal.',
        ],
      };
    },
  },
  {
    id: 'gen-roteiro-reels',
    name: 'Gerador de Roteiro de Reels & TikTok para Barbeiros',
    category: 'MARKETING',
    description: 'Roteiros de 30 segundos com gancho magnético para mostrar transformações e atrair seguidores locais.',
    inputs: [
      { id: 'style', label: 'Estilo do Vídeo', type: 'select', options: ['Transformação Antes/Depois', 'Tira-Dúvidas de Estilo (Visagismo)', 'Bastidores & Higiene', 'Humor Leve do Dia a Dia'], defaultValue: 'Transformação Antes/Depois' },
    ],
    generate: (val) => {
      return {
        title: `Roteiro Viral: ${val.style}`,
        content: `🎬 **Roteiro de 30 Segundos para Reels / TikTok:**

- **0 a 3 seg (Gancho Visual Forte):** Mostre o cliente chegando com o cabelo grande/desalinhado. Texto na tela: *"Ele pediu para mudar totalmente o visual... olha o resultado!"*
- **4 a 15 seg (Processo Rápido / ASMR):** Cortes dinâmicos de 1 segundo: tesoura cortando o topo, máquina passando na lateral, navalha alinhando o pezinho, aplicação de pomada.
- **16 a 25 seg (Revelação com Música em Alta):** Transição com a mão na câmera revelando o corte finalizado com espelho e sorriso de satisfação do cliente.
- **26 a 30 seg (Chamada para Ação):** Texto na tela: *"Gostou do resultado? Agende seu horário no link da bio!"*`,
        tips: [
          'Use músicas que estejam em alta (com a setinha subindo) no Instagram.',
          'Sempre marque a localização da sua cidade e bairro no vídeo.',
        ],
      };
    },
  },
  {
    id: 'gen-plano-acao-5w2h',
    name: 'Gerador de Plano de Ação 5W2H para Metas da Barbearia',
    category: 'PLANEJAMENTO',
    description: 'Transforme qualquer objetivo (aumentar faturamento, treinar equipe, reformar espaço) em plano prático.',
    inputs: [
      { id: 'goal', label: 'Qual é o seu objetivo?', type: 'select', options: ['Aumentar o faturamento em 20%', 'Reduzir o No-Show em 80%', 'Aumentar as avaliações 5 estrelas no Google', 'Organizar as finanças e separar contas'], defaultValue: 'Aumentar o faturamento em 20%' },
    ],
    generate: (val) => {
      return {
        title: `Plano de Ação 5W2H: ${val.goal}`,
        content: `📋 **Plano Estruturado para: ${val.goal}**

1. **O que fazer (What):** Implementar venda ativa de pomadas e reativação semanal de clientes pelo WhatsApp.
2. **Por que fazer (Why):** Elevar o ticket médio e garantir taxa de ocupação acima de 70%.
3. **Onde fazer (Where):** Na bancada da barbearia e via módulo de Recorrência do BarberFlow.
4. **Quem fará (Who):** Todos os barbeiros parceiros + dono no fechamento.
5. **Quando fazer (When):** A partir da próxima segunda-feira, com revisão semanal toda segunda de manhã.
6. **Como fazer (How):** Apresentar a pomada no final do corte explicando como modelar em casa e disparar 10 mensagens de WhatsApp/dia para clientes ausentes.
7. **Quanto vai custar (How Much):** Custo R$ 0,00 (apenas dedicação e alinhamento de rotina).`,
        tips: [
          'Compartilhe este plano com sua equipe para que todos conheçam a meta comum.',
        ],
      };
    },
  },
  {
    id: 'gen-whatsapp-lembrete-manual',
    name: 'Gerador de Mensagem Personalizada de Atendimento',
    category: 'WHATSAPP',
    description: 'Mensagens rápidas para avisos de feriados, mudanças de horário ou boas-vindas.',
    inputs: [
      { id: 'type', label: 'Tipo de Mensagem', type: 'select', options: ['Aviso de Feriado / Funcionamento', 'Boas-Vindas a Cliente Novo', 'Agradecimento Pós-Atendimento'], defaultValue: 'Boas-Vindas a Cliente Novo' },
      { id: 'shopName', label: 'Nome da Barbearia', type: 'text', defaultValue: 'Nossa Barbearia' },
    ],
    generate: (val) => {
      let text = '';
      if (val.type === 'Boas-Vindas a Cliente Novo') {
        text = `Olá, {Nome do Cliente}! Seja muito bem-vindo à *${val.shopName}*! 💈✨\n\nFoi um prazer receber você hoje. Nosso objetivo é que você sempre tenha a melhor experiência e saia com o visual impecável.\n\nSe precisar de qualquer ajuste ou quiser agendar o próximo horário, estamos sempre à disposição por aqui!`;
      } else if (val.type === 'Aviso de Feriado / Funcionamento') {
        text = `🚨 *Aviso de Feriado na ${val.shopName}!*\n\nInformamos que neste feriado estaremos atendendo em horário especial. Como as vagas costumam esgotar rápido, garanta seu horário com antecedência pelo link:\n👉 {Link de Agendamento}`;
      } else {
        text = `Olá, {Nome do Cliente}! Muito obrigado pela visita hoje na *${val.shopName}*! 👍💈\n\nSeu atendimento foi aprovado? Se puder nos avaliar com 5 estrelas no Google, nos ajuda muito:\n⭐ {Link do Google Maps}`;
      }

      return {
        title: `Template: ${val.type}`,
        content: text,
        tips: ['Personalize sempre com o primeiro nome do cliente para criar conexão real.'],
      };
    },
  },
  {
    id: 'gen-oferta-combos',
    name: 'Gerador de Nomes e Estrutura de Serviços Premium',
    category: 'VENDAS',
    description: 'Transforme serviços comuns em experiências atrativas com nomes profissionais que justificam preços maiores.',
    inputs: [
      { id: 'serviceType', label: 'Serviço Base', type: 'select', options: ['Barba Tradicional', 'Corte + Barba', 'Tratamento Capilar / Queda', 'Dia do Noivo'], defaultValue: 'Corte + Barba' },
    ],
    generate: (val) => {
      return {
        title: `Estruturação de Serviço Premium: ${val.serviceType}`,
        content: `💎 **Sugestão de Nome:** *Combo Master Experience* (ou *Ritual da Barba & Cabelo*)

**O que incluir na experiência para cobrar 40% a mais:**
1. Diagnóstico de estilo e formato do rosto (Visagismo rápido de 2 minutos).
2. Lavagem com shampoo refrescante mentolado.
3. Corte com acabamento milimétrico na tesoura e navalha.
4. Barba com toalha quente, óleo pré-barba, massagem facial e loção pós-barba importada.
5. Finalização com pomada matte e spray fixador.

**Precificação sugerida:** Em vez de Corte (R$ 45) + Barba (R$ 35) = R$ 80, posicione o *Ritual Completo* por R$ 95,00 destacando a toalha quente e massagem facial.`,
        tips: ['Clientes não compram o corte; compram como eles se sentem depois do corte.'],
      };
    },
  },
  {
    id: 'gen-calendario-conteudo-mensal',
    name: 'Gerador de Calendário de Conteúdo Mensal (4 Semanas)',
    category: 'MARKETING',
    description: '30 dias de ideias organizadas para você nunca mais ficar sem saber o que postar.',
    inputs: [
      { id: 'nicho', label: 'Foco da Barbearia', type: 'select', options: ['Barbearia Clássica / Tradicional', 'Barbearia Moderna / Cortes Freestyle', 'Barbearia Executiva / Premium'], defaultValue: 'Barbearia Moderna / Cortes Freestyle' },
    ],
    generate: (val) => {
      return {
        title: `Calendário Editorial de 4 Semanas — ${val.nicho}`,
        content: `📅 **Programação Mensal de Publicações:**

**Semana 1: Apresentação & Autoridade**
- Seg: Bastidores da higienização dos equipamentos.
- Qua: Antes e depois de um corte degradê com vídeo dinâmico.
- Sex: Lembrete de vagas para o fim de semana com link nos Stories.

**Semana 2: Dicas Práticas para o Cliente**
- Seg: Como cuidar da barba em casa para não ressecar.
- Qua: Diferença entre pomada matte (fosca) e pomada brilho.
- Sex: Depoimento ou print de avaliação de cliente satisfeito.

**Semana 3: Comunidade & Equipe**
- Seg: Apresentação de um barbeiro da equipe e suas especialidades.
- Qua: Enquete nos stories: Qual estilo você prefere? (Degradê Alto vs Baixo).
- Sex: Chamada para horários de sábado com link de agendamento.

**Semana 4: Oferta & Fim de Mês**
- Seg: Combo da semana para preencher terça e quarta.
- Qua: Transformação marcante (Corte + Barboterapia).
- Sex: Agradecimento aos clientes do mês e agenda do próximo mês aberta.`,
        tips: ['Reserve 30 minutos todo domingo para planejar as fotos e vídeos da semana.'],
      };
    },
  },
];

// =========================================================================
// 9 CHECKLISTS OPERACIONAIS
// =========================================================================
export const ACADEMIA_CHECKLISTS: ChecklistDefinition[] = [
  {
    id: 'check-abertura-diaria',
    name: 'Checklist Diário de Abertura da Barbearia (15 minutos antes)',
    frequency: 'DIARIO',
    description: 'Garante que o espaço físico, recepção e bancadas estejam impecáveis antes do 1º cliente chegar.',
    items: [
      { id: 'ab-1', task: 'Destravar portas e ligar iluminação geral, ar condicionado/ventiladores', importance: 'ALTA' },
      { id: 'ab-2', task: 'Conferir o fundo de troco em dinheiro no caixa (mínimo R$ 50 a R$ 100 em notas e moedas)', importance: 'CRITICA' },
      { id: 'ab-3', task: 'Preparar café fresco e conferir água gelada na recepção', importance: 'MEDIA' },
      { id: 'ab-4', task: 'Ligar som ambiente em volume agradável (música selecionada)', importance: 'MEDIA' },
      { id: 'ab-5', task: 'Conferir se o espelho e bancadas estão 100% limpos e desinfetados', importance: 'CRITICA' },
      { id: 'ab-6', task: 'Abrir a Agenda do BarberFlow e visualizar todos os agendamentos do dia', importance: 'CRITICA' },
      { id: 'ab-7', task: 'Conferir esterilizador/álcool 70% e estoque de lâminas descartáveis e toalhas limpas', importance: 'CRITICA' },
    ],
  },
  {
    id: 'check-fechamento-diario',
    name: 'Checklist Diário de Fechamento de Caixa e Segurança',
    frequency: 'DIARIO',
    description: 'Rotina de fechamento de caixa, conferência de sangrias e segurança do espaço.',
    items: [
      { id: 'fc-1', task: 'Concluir ou marcar status de todos os agendamentos do dia no BarberFlow', importance: 'CRITICA' },
      { id: 'fc-2', task: 'Executar o Fechamento de Caixa no módulo Gestão Financeira conferindo Dinheiro, Pix e Cartão', importance: 'CRITICA' },
      { id: 'fc-3', task: 'Realizar a sangria do dinheiro excedente guardando em cofre ou local seguro', importance: 'CRITICA' },
      { id: 'fc-4', task: 'Recolher toalhas usadas para lavagem e descartar lâminas usadas no coletor perfurocortante', importance: 'CRITICA' },
      { id: 'fc-5', task: 'Limpar chão, bancadas, lavar a máquina de café e retirar o lixo', importance: 'ALTA' },
      { id: 'fc-6', task: 'Desligar ar-condicionado, som, lâmpadas e trancar todas as janelas e portas', importance: 'CRITICA' },
    ],
  },
  {
    id: 'check-semanal-operacao',
    name: 'Checklist Semanal de Operação e Alinhamento (Toda Segunda-feira)',
    frequency: 'SEMANAL',
    description: 'Alinhamento com a equipe de barbeiros, conferência de insumos e plano de vendas.',
    items: [
      { id: 'sem-1', task: 'Reunião rápida de 15 minutos com a equipe: celebrar resultados da semana anterior e alinhar metas', importance: 'ALTA' },
      { id: 'sem-2', task: 'Verificar estoque de produtos (pomadas, lâminas, papel gola, shampoos) e emitir lista de compras', importance: 'CRITICA' },
      { id: 'sem-3', task: 'Analisar no BarberFlow os clientes em risco de abandono e disparar reativações', importance: 'CRITICA' },
      { id: 'sem-4', task: 'Programar postagens e stories no Instagram para terça e quarta-feira', importance: 'ALTA' },
      { id: 'sem-5', task: 'Conferir comissões da equipe do período para garantir transparência total', importance: 'CRITICA' },
    ],
  },
  {
    id: 'check-mensal-financeiro',
    name: 'Checklist Mensal de Fechamento Financeiro e DRE',
    frequency: 'MENSAL',
    description: 'Conferência de contas a pagar, faturamento consolidado, pagamento do DAS/MEI e pró-labore.',
    items: [
      { id: 'mes-1', task: 'Emitir o relatório DRE no BarberFlow e apurar o Lucro Líquido Real do mês', importance: 'CRITICA' },
      { id: 'mes-2', task: 'Conferir o pagamento de todos os boletos fixos (Aluguel, Energia, Internet, Água, Contador)', importance: 'CRITICA' },
      { id: 'mes-3', task: 'Emitir e pagar a guia DAS do MEI ou impostos do Simples Nacional no portal gov.br', importance: 'CRITICA' },
      { id: 'mes-4', task: 'Separar o Pró-labore dos sócios transferindo da conta PJ para a conta Física', importance: 'CRITICA' },
      { id: 'mes-5', task: 'Destinar 30% a 50% do lucro líquido restante para a reserva de segurança da barbearia', importance: 'ALTA' },
      { id: 'mes-6', task: 'Definir a meta de faturamento e ocupação para o mês seguinte', importance: 'ALTA' },
    ],
  },
  {
    id: 'check-marketing-redes',
    name: 'Checklist Semanal de Marketing e Google Meu Negócio',
    frequency: 'SEMANAL',
    description: 'Mantenha sua presença digital ativa para continuar recebendo novos clientes no piloto automático.',
    items: [
      { id: 'mkt-1', task: 'Responder 100% das novas avaliações recebidas no Google Maps agradecendo pelo nome', importance: 'CRITICA' },
      { id: 'mkt-2', task: 'Postar pelo menos 3 fotos de alta qualidade de cortes recentes no perfil do Google', importance: 'ALTA' },
      { id: 'mkt-3', task: 'Publicar no mínimo 2 Reels com transformações ou cortes dinâmicos no Instagram', importance: 'ALTA' },
      { id: 'mkt-4', task: 'Postar stories diários com enquetes e caixas de perguntas nos horários de pico', importance: 'MEDIA' },
      { id: 'mkt-5', task: 'Conferir se o link da bio do Instagram está funcionando e abrindo a página de agendamento', importance: 'CRITICA' },
    ],
  },
  {
    id: 'check-atendimento-cliente',
    name: 'Checklist de Atendimento de Alto Padrão (Por Cliente)',
    frequency: 'DIARIO',
    description: 'O passo a passo que transforma um atendimento comum em uma experiência inesquecível.',
    items: [
      { id: 'at-1', task: 'Cumprimentar o cliente pelo nome com sorriso e aperto de mão firme ao entrar', importance: 'CRITICA' },
      { id: 'at-2', task: 'Oferecer café, água ou bebida de cortesia antes de sentar na cadeira', importance: 'ALTA' },
      { id: 'at-3', task: 'Fazer 1 minuto de consulta de estilo: ouvir o que o cliente deseja e sugerir melhorias', importance: 'CRITICA' },
      { id: 'at-4', task: 'Usar capa e gola higiênica novas e lâmina descartável aberta na frente do cliente', importance: 'CRITICA' },
      { id: 'at-5', task: 'Finalizar com toalha refrescante ou loção de qualidade explicando o produto usado', importance: 'ALTA' },
      { id: 'at-6', task: 'Convidar para o próximo agendamento antes de liberar o cliente no balcão', importance: 'ALTA' },
    ],
  },
  {
    id: 'check-equipe-parceira',
    name: 'Checklist de Gestão e Segurança Jurídica da Equipe',
    frequency: 'EVENTUAL',
    description: 'Documentação e alinhamentos contratuais da Lei do Salão Parceiro.',
    items: [
      { id: 'eq-1', task: 'Contrato de Barbeiro Parceiro assinado e arquivado com firma reconhecida/digital', importance: 'CRITICA' },
      { id: 'eq-2', task: 'Conferir se o CNPJ MEI do barbeiro parceiro está ativo e regular na Receita Federal', importance: 'CRITICA' },
      { id: 'eq-3', task: 'Emitir mensalmente o extrato de comissões e retenções com assinatura das partes', importance: 'ALTA' },
      { id: 'eq-4', task: 'Realizar feedback individual mensal sobre pontualidade, higiene e retenção de clientes', importance: 'ALTA' },
    ],
  },
  {
    id: 'check-estoque-suprimentos',
    name: 'Checklist Quinzenal de Estoque e Compras',
    frequency: 'SEMANAL',
    description: 'Evite ficar sem gola higiênica ou lâminas na sexta-feira à tarde.',
    items: [
      { id: 'est-1', task: 'Contar estoque físico de lâminas (mínimo de segurança: 100 lâminas por barbeiro)', importance: 'CRITICA' },
      { id: 'est-2', task: 'Contar rolos de gola higiênica e caixas de luvas descartáveis', importance: 'CRITICA' },
      { id: 'est-3', task: 'Contar estoque de pomadas para revenda (manter pelo menos 5 unidades de cada tipo)', importance: 'ALTA' },
      { id: 'est-4', task: 'Conferir validade de cosméticos, shampoos, óleos de barba e loções', importance: 'ALTA' },
      { id: 'est-5', task: 'Cotar preços com pelo menos 2 fornecedores antes de fechar pedidos grandes', importance: 'MEDIA' },
    ],
  },
  {
    id: 'check-seguranca-digital',
    name: 'Checklist de Segurança Digital e Proteção de Dados (LGPD)',
    frequency: 'MENSAL',
    description: 'Proteja a barbearia contra fraudes, perda de senhas e vazamentos de dados.',
    items: [
      { id: 'seg-1', task: 'Ativar a Verificação em Duas Etapas (PIN de 6 dígitos) no WhatsApp Business da barbearia', importance: 'CRITICA' },
      { id: 'seg-2', task: 'Usar senhas fortes (letras, números e símbolos) e nunca compartilhar a senha do BarberFlow', importance: 'CRITICA' },
      { id: 'seg-3', task: 'Conferir se os aparelhos celulares da loja possuem bloqueio por biometria ou senha', importance: 'ALTA' },
      { id: 'seg-4', task: 'Garantir que a lista de telefones de clientes nunca seja exportada ou compartilhada com terceiros', importance: 'CRITICA' },
      { id: 'seg-5', task: 'Executar backup mensal dos dados através do script de backup do sistema', importance: 'CRITICA' },
    ],
  },
];
