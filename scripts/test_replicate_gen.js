const fs = require('fs');
const sharp = require('sharp');

function getToken() {
  if (process.env.REPLICATE_API_TOKEN) return process.env.REPLICATE_API_TOKEN;
  const envPaths = ['.env', '.env.local'];
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      const c = fs.readFileSync(p, 'utf8');
      const m = c.match(/^REPLICATE_API_TOKEN=(.+)$/m);
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  return '';
}

async function testReplicateGeneration() {
  const token = getToken();
  console.log('Using token:', token.slice(0, 6) + '...');

  const origBuf = fs.readFileSync('storage/test_replicate_lowfade.jpg');
  const maskBuf = fs.readFileSync('storage/test_improved_mask.png');

  // Resize both to 768x1024 to speed up and ensure crisp aspect ratio
  const resizedOrig = await sharp(origBuf).resize(768, 1024, { fit: 'fill' }).jpeg({ quality: 90 }).toBuffer();
  const resizedMask = await sharp(maskBuf).resize(768, 1024, { fit: 'fill' }).png().toBuffer();

  const base64Image = `data:image/jpeg;base64,${resizedOrig.toString('base64')}`;
  const base64Mask = `data:image/png;base64,${resizedMask.toString('base64')}`;

  const prompt = "Men's clean low fade haircut, short neat faded sides, sharp crisp hairline lineup, stylish textured top, authentic professional barbershop haircut, high definition photograph";

  console.log('Sending prediction to Replicate FLUX Fill Dev...');
  const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-fill-dev/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'wait',
    },
    body: JSON.stringify({
      input: {
        image: base64Image,
        mask: base64Mask,
        prompt: prompt,
        guidance: 3.0,
        num_inference_steps: 28,
        output_format: 'jpg',
        output_quality: 95,
      },
    }),
  });

  if (!res.ok) {
    console.error('Replicate error:', res.status, await res.text());
    return;
  }

  let data = await res.json();
  console.log('Prediction status:', data.status, 'ID:', data.id);

  let attempts = 0;
  while (data.status !== 'succeeded' && data.status !== 'failed' && data.status !== 'canceled' && attempts < 30) {
    if (!data.urls?.get) break;
    await new Promise(r => setTimeout(r, 2000));
    attempts++;
    const pollRes = await fetch(data.urls.get, { headers: { Authorization: `Bearer ${token}` } });
    data = await pollRes.json();
    console.log(`Poll ${attempts}: status = ${data.status}`);
  }

  if (data.status === 'succeeded' && data.output) {
    const outputUrl = typeof data.output === 'string' ? data.output : data.output[0];
    console.log('Output URL:', outputUrl);
    const imgRes = await fetch(outputUrl);
    const outBuf = Buffer.from(await imgRes.arrayBuffer());
    fs.writeFileSync('storage/test_replicate_out_v2.jpg', outBuf);
    console.log('Saved storage/test_replicate_out_v2.jpg, bytes:', outBuf.length);
  } else {
    console.error('Failed or incomplete:', data);
  }
}

testReplicateGeneration().catch(console.error);
