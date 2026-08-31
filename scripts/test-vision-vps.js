const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const key = process.env.GEMINI_API_KEY || '';

  const script = `
async function run() {
  // Test Vision Analysis
  const sample1x1Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { text: 'Você é um consultor visagista. Analise a foto desta pessoa e identifique o formato de rosto e características visagistas em formato JSON.' },
          { inline_data: { mime_type: 'image/png', data: sample1x1Png } }
        ]
      }]
    })
  });
  const data = await res.json();
  console.log('VISION_STATUS:', res.status);
  console.log('VISION_ANSWER:', data.candidates?.[0]?.content?.parts?.[0]?.text);
}
run().catch(console.error);
`;

  const ps = await runRemoteCommand("docker ps | grep 7ho00 | awk '{print $NF}'");
  const container = ps.stdout.trim();
  await runRemoteCommand(`cat <<'EOF' > /tmp/test_vision.js\n${script}\nEOF`);
  await runRemoteCommand(`docker cp /tmp/test_vision.js ${container}:/app/test_vision.js`);
  const res = await runRemoteCommand(`docker exec ${container} node /app/test_vision.js`);
  console.log(res.stdout || res.stderr);
}

main().catch(console.error);
