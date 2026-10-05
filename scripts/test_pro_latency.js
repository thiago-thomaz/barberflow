const fs = require('fs');

async function testProLatency() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    console.error('REPLICATE_API_TOKEN not set');
    return;
  }
  
  // Create a minimal 512x512 test image and mask
  const sharp = require('sharp');
  const img = await sharp({ create: { width: 512, height: 512, channels: 3, background: { r: 120, g: 100, b: 90 } } }).jpeg().toBuffer();
  const mask = await sharp({ create: { width: 512, height: 512, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toBuffer();

  const base64Img = `data:image/jpeg;base64,${img.toString('base64')}`;
  const base64Mask = `data:image/png;base64,${mask.toString('base64')}`;

  console.log('Sending prediction to black-forest-labs/flux-fill-pro...');
  const start = Date.now();
  const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-fill-pro/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait'
    },
    body: JSON.stringify({
      input: {
        image: base64Img,
        mask: base64Mask,
        prompt: "A photorealistic portrait photograph of a man with modern fade haircut",
        guidance: 30,
        output_format: 'jpg'
      }
    })
  });

  console.log('Dispatch status:', res.status);
  let data = await res.json();
  console.log('Initial data status:', data.status);

  while (data.status !== 'succeeded' && data.status !== 'failed' && data.status !== 'canceled') {
    await new Promise(r => setTimeout(r, 1000));
    const poll = await fetch(data.urls.get, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    data = await poll.json();
    console.log('Status:', data.status, 'Elapsed:', (Date.now() - start) + 'ms');
  }

  console.log('Final status:', data.status, 'Total time:', (Date.now() - start) + 'ms');
  console.log('Output:', data.output);
}

testProLatency().catch(console.error);
