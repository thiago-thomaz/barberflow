const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const nodeScript = `
const fs = require('fs');
const file = '/app/dist/dashboard/_nuxt/ngXhB-8l.js';
let c = fs.readFileSync(file, 'utf8');

if (c.includes('a[l]=r,this.save(a)')) {
  c = c.replace('a[l]=r,this.save(a)', 'a[l]={id:i,...r},this.save(a)');
  fs.writeFileSync(file, c, 'utf8');
  console.log('PATCHED ngXhB-8l.js successfully!');
} else {
  console.log('Pattern not found or already patched.');
}
`;

  await runRemoteCommand(`cat <<'EOF' > /tmp/patch.js\n${nodeScript}\nEOF`);
  await runRemoteCommand(`docker cp /tmp/patch.js kfqib7khsae0hnnurptry6bu-191415430307:/tmp/patch.js`);
  const res = await runRemoteCommand(`docker exec kfqib7khsae0hnnurptry6bu-191415430307 node /tmp/patch.js`);
  console.log(res.stdout || res.stderr);
}

main().catch(console.error);
