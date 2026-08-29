const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const nodeScript = `
const fs = require('fs');
const c = fs.readFileSync('/app/dist/dashboard/_nuxt/CcFJPcw0.js', 'utf8');
const idx = c.indexOf('editServer');
console.log(c.substring(Math.max(0, idx - 200), idx + 400));
`;

  await runRemoteCommand(`cat <<'EOF' > /tmp/inspect.js\n${nodeScript}\nEOF`);
  await runRemoteCommand(`docker cp /tmp/inspect.js kfqib7khsae0hnnurptry6bu-191415430307:/tmp/inspect.js`);
  const res = await runRemoteCommand(`docker exec kfqib7khsae0hnnurptry6bu-191415430307 node /tmp/inspect.js`);
  console.log(res.stdout || res.stderr);
}

main().catch(console.error);
