const fs = require('fs');

async function testProModel() {
  const token = process.env.REPLICATE_API_TOKEN;
  console.log('Testing flux-fill-pro or warm dev model latency...');

  const startTime = Date.now();
  // Check available models or test flux-fill-pro
  const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-fill-pro', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('flux-fill-pro info status:', res.status);
  if (res.ok) {
    const data = await res.json();
    console.log('flux-fill-pro available:', data.name, 'description:', data.description);
  }
}

testProModel().catch(console.error);
