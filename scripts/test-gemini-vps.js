const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const key = process.env.GEMINI_API_KEY || '';

  const script = `
async function run() {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: 'Atue como visagista profissional de barbearia. Diga em 1 frase curta por que o corte Low Fade combina com rosto Oval.' }]
      }]
    })
  });
  const data = await res.json();
  console.log('STATUS:', res.status);
  console.log('GEMINI_ANSWER:', data.candidates?.[0]?.content?.parts?.[0]?.text);
}
run().catch(console.error);
`;

  const ps = await runRemoteCommand("docker ps | grep 7ho00 | awk '{print $NF}'");
  const container = ps.stdout.trim();
  console.log('Target container:', container);

  await runRemoteCommand(`cat <<'EOF' > /tmp/test_gemini.js\n${script}\nEOF`);
  await runRemoteCommand(`docker cp /tmp/test_gemini.js ${container}:/app/test_gemini.js`);
  const res = await runRemoteCommand(`docker exec ${container} node /app/test_gemini.js`);
  console.log(res.stdout || res.stderr);
}

main().catch(console.error);
