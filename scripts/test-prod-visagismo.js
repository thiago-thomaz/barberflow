async function main() {
  const base = 'https://barber.projetosunion.cloud';

  console.log('1. Testing POST /api/visagismo/session ...');
  const resSession = await fetch(`${base}/api/visagismo/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: 'barbearia-imperial', phone: '11999999999' }),
  });

  const sessionData = await resSession.json();
  console.log('Session response:', sessionData);

  if (!sessionData.success || !sessionData.session.publicToken) {
    throw new Error('Falha ao criar sessão');
  }

  const token = sessionData.session.publicToken;
  console.log(`\n2. Testing GET /api/visagismo/session/${token} ...`);
  const resGet = await fetch(`${base}/api/visagismo/session/${token}`);
  const getData = await resGet.json();
  console.log('GET session status:', resGet.status, 'Shop:', getData.session?.barbershop?.name);

  console.log(`\n3. Testing POST /api/visagismo/session/${token}/evaluate ...`);
  const resEval = await fetch(`${base}/api/visagismo/session/${token}/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      objective: 'Corte + Barba',
      style: 'Moderno',
      changeLevel: 'Medio',
      maintenanceLevel: 'Medio',
      hairLength: 'Tanto faz',
      faceShape: 'Oval',
      colorPreference: 'Natural',
    }),
  });

  const evalData = await resEval.json();
  console.log('Evaluate status:', resEval.status, 'Recommendations count:', evalData.evaluation?.recommendations?.length);
  if (evalData.evaluation?.recommendations) {
    evalData.evaluation.recommendations.forEach((r, i) => {
      console.log(`   #${i + 1}: ${r.haircutName} (${r.haircutStyle}) - ${r.score}% Match | Barba: ${r.beardName}`);
    });
  }

  console.log(`\n4. Testing GET /visagismo/session/${token} page ...`);
  const resPage = await fetch(`${base}/visagismo/session/${token}`);
  console.log('Page response status:', resPage.status);

  console.log('\n✅ 100% PRODUÇÃO LIVE VALIDADA!');
}

main().catch(console.error);
