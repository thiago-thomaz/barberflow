const https = require('https');

function sendMsg(from, text, slug = 'barber-shop') {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ from, text, tenantSlug: slug, messageId: `test_full_${Date.now()}` });
    const req = https.request('https://barber.projetosunion.cloud/api/webhooks/whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function testFullBookingCycle() {
  console.log('==================================================');
  console.log('🧪 WHATSAPP END-TO-END BOOKING & CANCELLATION TEST');
  console.log('==================================================\n');

  const testPhone = '5514999990004';
  const slug = 'barber-shop';

  // Step 1: Start
  console.log('Step 1: Enviar "Oi"...');
  await sendMsg(testPhone, 'Oi', slug);

  // Step 2: Select 1 (Agendar)
  console.log('Step 2: Enviar "1" (Agendar)...');
  const resSvc = await sendMsg(testPhone, '1', slug);
  console.log('   Services list:\n' + resSvc.data.result?.reply);

  // Step 3: Choose Service 1 (Corte Tradicional)
  console.log('Step 3: Escolher Serviço "1"...');
  const resBarberOrDate = await sendMsg(testPhone, '1', slug);
  console.log('   Next step reply:\n' + resBarberOrDate.data.result?.reply);

  // Step 4: Choose Date "Hoje"
  console.log('Step 4: Escolher Data "Hoje"...');
  const resSlots = await sendMsg(testPhone, 'Hoje', slug);
  console.log('   Slots reply:\n' + resSlots.data.result?.reply);

  // Step 5: Choose Slot "1"
  console.log('Step 5: Escolher Horário "1"...');
  const resConfOrName = await sendMsg(testPhone, '1', slug);
  console.log('   Reply:\n' + resConfOrName.data.result?.reply);

  let resBooking;
  if (resConfOrName.data.result?.state === 'ASKING_NEW_CUSTOMER_NAME') {
    console.log('Step 5b: Informar Nome "Thiago Teste"...');
    await sendMsg(testPhone, 'Thiago Teste', slug);
    console.log('Step 5c: Confirmar com "1"...');
    resBooking = await sendMsg(testPhone, '1', slug);
  } else {
    console.log('Step 5b: Confirmar com "1"...');
    resBooking = await sendMsg(testPhone, '1', slug);
  }

  console.log('   Booking Confirmation:\n' + resBooking.data.result?.reply);
  if (!resBooking.data.result?.reply.includes('Agendamento Confirmado')) {
    throw new Error('Booking confirmation failed');
  }

  // Step 6: Query "2" (Ver próximo horário)
  console.log('\nStep 6: Enviar "MENU" -> "2" (Ver próximo horário)...');
  await sendMsg(testPhone, 'MENU', slug);
  const resQuery = await sendMsg(testPhone, '2', slug);
  console.log('   Query Reply:\n' + resQuery.data.result?.reply);
  if (!resQuery.data.result?.reply.includes('Encontrei seu próximo horário')) {
    throw new Error('Query next appointment failed');
  }

  // Step 7: Cancel Appointment via "MENU" -> "3" -> "1"
  console.log('\nStep 7: Enviar "MENU" -> "3" (Cancelar) -> "1" (Confirmar Cancelamento)...');
  await sendMsg(testPhone, 'MENU', slug);
  const resCancelMenu = await sendMsg(testPhone, '3', slug);
  console.log('   Cancel Prompt:\n' + resCancelMenu.data.result?.reply);
  const resCancel = await sendMsg(testPhone, '1', slug);
  console.log('   Cancel Reply:\n' + resCancel.data.result?.reply);
  if (!resCancel.data.result?.reply.includes('cancelado com sucesso')) {
    throw new Error('Cancel appointment failed');
  }

  // Step 8: Test Exit command "Encerrar"
  console.log('\nStep 8: Enviar "Encerrar" para finalizar atendimento...');
  const resExit = await sendMsg(testPhone, 'Encerrar', slug);
  console.log('   Exit Reply:\n' + resExit.data.result?.reply);
  if (!resExit.data.result?.reply.includes('Atendimento encerrado')) {
    throw new Error('Exit failed');
  }

  console.log('\n==================================================');
  console.log('🎉 100% COMPLETE BOOKING, CANCEL & EXIT VALIDATED');
  console.log('==================================================');
}

testFullBookingCycle().catch(err => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
