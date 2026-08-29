const { Client } = require('ssh2');

const config = {
  host: '72.62.13.62',
  port: 22,
  username: 'root',
  password: process.env.VPS_PASSWORD || 'Temp181285-().&@?\'#',
  readyTimeout: 20000,
};

function runRemoteCommand(cmd) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdout = '';
    let stderr = '';

    conn.on('ready', () => {
      conn.exec(cmd, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        stream.on('close', (code, signal) => {
          conn.end();
          resolve({ code, signal, stdout, stderr });
        }).on('data', (data) => {
          stdout += data.toString();
        }).stderr.on('data', (data) => {
          stderr += data.toString();
        });
      });
    }).on('error', (err) => {
      reject(err);
    }).connect(config);
  });
}

if (require.main === module) {
  const cmd = process.argv.slice(2).join(' ') || 'docker ps';
  console.log(`[VPS] Running: ${cmd}`);
  runRemoteCommand(cmd)
    .then(res => {
      if (res.stdout) console.log(res.stdout);
      if (res.stderr) console.error(res.stderr);
      process.exit(res.code || 0);
    })
    .catch(err => {
      console.error('[VPS Error]:', err.message);
      process.exit(1);
    });
}

module.exports = { runRemoteCommand };
