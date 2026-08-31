const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const key = process.env.GEMINI_API_KEY || '';

  const script = `
async function run() {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${key}';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { text: 'Generate an image of a handsome man with a Low Fade haircut and clean beard, photorealistic studio portrait.' }
        ]
      }]
    })
  });
  const data = await res.json();
  console.log('IMAGE_STATUS:', res.status);
  console.log('IMAGE_PARTS:', JSON.stringify(data.candidates?.[0]?.content?.parts || data).slice(0, 300));
}
run().catch(console.error);
`;

  const ps = await runRemoteCommand("docker ps | grep 7ho00 | awk '{print $NF}'");
  const container = ps.stdout.trim();
  await runRemoteCommand(`cat <<'EOF' > /tmp/test_image_gen.js\n${script}\nEOF`);
  await runRemoteCommand(`docker cp /tmp/test_image_gen.js ${container}:/app/test_image_gen.js`);
  const res = await runRemoteCommand(`docker exec ${container} node /app/test_image_gen.js`);
  console.log(res.stdout || res.stderr);
}

main().catch(console.error);
