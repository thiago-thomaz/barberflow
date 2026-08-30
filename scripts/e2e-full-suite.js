const BASE_URL = 'https://barber.projetosunion.cloud/api/webhooks/whatsapp';
const TEST_PHONE = '5514999887766';
const TENANT = 'barbearia-imperial';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sendMsg(text, messageId) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: TEST_PHONE,
      text,
      tenantSlug: TENANT,
      messageId: messageId || `e2e_${Date.now()}_${Math.random()}`
    })
  });
  const data = await res.json();
  return { status: res.status, ...data.result };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`   ✅ PASS: ${message}`);
}

async function runE2E() {
  console.log('===============================================================');
  console.log('🚀 BARBERFLOW — SUITE DE TESTES DE PONTA A PONTA (E2E)');
  console.log('===============================================================\n');

  // -------------------------------------------------------------
  // TEST 0: DEDUPLICATION / ANTI-DUPLO DISPARO
  // -------------------------------------------------------------
  const dedupId = `dedup_${Date.now()}`;
  const [resA, resB] = await Promise.all([
    sendMsg('Oi', dedupId),
    sendMsg('Oi', dedupId)
  ]);
  assert(
    (resA.state === 'IDLE' && resB.state === 'DUPLICATE_IGNORED') ||
    (resB.state === 'IDLE' && resA.state === 'DUPLICATE_IGNORED'),
    'Apenas 1 mensagem respondeu e a segunda foi ignorada por deduplicação'
  );
  console.log('');
  await sleep(2100);

  // -------------------------------------------------------------
  // TEST 1: SAUDAÇÃO & MENU PRINCIPAL
  // -------------------------------------------------------------
  console.log('🧪 TEST 1: Saudação e Menu Principal');
  let r = await sendMsg('Menu');
  assert(r.state === 'IDLE', 'Estado inicial IDLE');
  assert(r.reply.includes('Como posso te ajudar hoje?'), 'Menu com opções exibido');
  assert(r.reply.includes('1️⃣ *Agendar horário*'), 'Opção 1 listada');
  console.log('');
  await sleep(500);

  // -------------------------------------------------------------
  // TEST 2: FLUXO COMPLETO DE AGENDAMENTO (Corte + Barbeiro + Data + Horário)
  // -------------------------------------------------------------
  console.log('🧪 TEST 2: Fluxo Completo de Agendamento');
  
  // 2.1 Escolher Agendar
  r = await sendMsg('1');
  assert(r.state === 'SELECTING_SERVICE', 'Transitou para SELECTING_SERVICE');
  assert(r.reply.includes('Qual serviço você deseja agendar?'), 'Pergunta qual serviço');

  // 2.2 Escolher Serviço 1
  r = await sendMsg('1');
  assert(r.state === 'SELECTING_BARBER', 'Transitou para SELECTING_BARBER');
  assert(r.reply.includes('preferência de barbeiro'), 'Pergunta preferência de barbeiro');

  // 2.3 Escolher Barbeiro 1
  r = await sendMsg('1');
  assert(r.state === 'SELECTING_DATE', 'Transitou para SELECTING_DATE');
  assert(r.reply.includes('Para qual data você prefere?'), 'Pergunta a data');

  // 2.4 Escolher Amanhã (Opção 2)
  r = await sendMsg('2');
  assert(r.state === 'SELECTING_TIME', 'Transitou para SELECTING_TIME');
  assert(r.reply.includes('Horários disponíveis'), 'Lista horários disponíveis');

  // 2.5 Escolher Horário 1
  r = await sendMsg('1');
  assert(
    r.state === 'WAITING_CONFIRMATION' || r.state === 'ASKING_NEW_CUSTOMER_NAME',
    'Transitou para confirmação ou solicitação de nome'
  );

  if (r.state === 'ASKING_NEW_CUSTOMER_NAME') {
    r = await sendMsg('Thiago Teste E2E');
    assert(r.state === 'WAITING_CONFIRMATION', 'Nome preenchido e transitou para WAITING_CONFIRMATION');
  }

  assert(r.reply.includes('Confirme seu Horário'), 'Resumo do agendamento apresentado');

  // 2.6 Confirmar Agendamento (Opção 1)
  r = await sendMsg('1');
  assert(r.state === 'IDLE', 'Agendamento concluído e voltou para IDLE');
  assert(r.reply.includes('Agendamento Confirmado!'), 'Mensagem de confirmação enviada com sucesso');
  assert(r.reply.includes('calendar'), 'Link do Google Calendar gerado');
  console.log('');

  // -------------------------------------------------------------
  // TEST 3: CONSULTAR PRÓXIMO HORÁRIO (Opção 2)
  // -------------------------------------------------------------
  console.log('🧪 TEST 3: Consultar Próximo Horário');
  r = await sendMsg('2');
  assert(r.reply.includes('Encontrei seu próximo horário'), 'Agendamento recém-criado foi localizado');
  assert(r.reply.includes('Barbeiro:'), 'Dados do barbeiro exibidos');
  console.log('');

  // -------------------------------------------------------------
  // TEST 4: REMARCAR HORÁRIO (Opção 4)
  // -------------------------------------------------------------
  console.log('🧪 TEST 4: Remarcar Horário');
  r = await sendMsg('4');
  assert(r.state === 'SELECTING_DATE', 'Transitou para SELECTING_DATE para remarcação');
  assert(r.reply.includes('Vamos remarcar seu horário'), 'Mensagem de remarcação exibida');
  
  // Voltar ao menu principal
  r = await sendMsg('Menu');
  assert(r.state === 'IDLE', 'Voltou ao menu principal');
  console.log('');

  // -------------------------------------------------------------
  // TEST 5: CANCELAR AGENDAMENTO (Opção 3)
  // -------------------------------------------------------------
  console.log('🧪 TEST 5: Cancelar Agendamento');
  r = await sendMsg('3');
  assert(r.state === 'CANCELLING', 'Transitou para estado CANCELLING');
  assert(r.reply.includes('cancelar'), 'Pergunta qual agendamento ou pede confirmação');

  // Selecionar / Confirmar cancelamento (Opção 1)
  r = await sendMsg('1');
  if (r.state === 'CANCELLING') {
    r = await sendMsg('1');
  }
  assert(r.state === 'IDLE', 'Transitou para IDLE após cancelamento');
  assert(r.reply.includes('cancelado com sucesso'), 'Confirmação de cancelamento enviada');
  console.log('');

  // -------------------------------------------------------------
  // TEST 6: FALAR COM A BARBEARIA (Opção 5)
  // -------------------------------------------------------------
  console.log('🧪 TEST 6: Falar com a Barbearia / Informações');
  r = await sendMsg('5');
  assert(r.reply.includes('Você pode falar diretamente com nossa equipe'), 'Informações de contato enviadas');
  console.log('');

  // -------------------------------------------------------------
  // TEST 7: ENCERRAR ATENDIMENTO (Opção 0)
  // -------------------------------------------------------------
  console.log('🧪 TEST 7: Encerrar Atendimento');
  r = await sendMsg('0');
  assert(r.state === 'IDLE', 'Estado IDLE');
  assert(r.reply.includes('Atendimento encerrado com sucesso!'), 'Despedida enviada');
  console.log('');

  console.log('===============================================================');
  console.log('🎉 100% DOS TESTES DE PONTA A PONTA PASSARAM COM SUCESSO!');
  console.log('===============================================================');
}

runE2E().catch((err) => {
  console.error('\n❌ ERRO NO TESTE E2E:', err);
  process.exit(1);
});
