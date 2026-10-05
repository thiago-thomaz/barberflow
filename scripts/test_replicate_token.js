const fs = require('fs');
const path = require('path');

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
const tok = getToken();
console.log('Token exists:', !!tok, 'Length:', tok.length, 'Prefix:', tok.slice(0, 5));
