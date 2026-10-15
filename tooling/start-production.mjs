import { spawn } from 'node:child_process';

const apiPort = process.env['API_PORT'] ?? '3001';
const webPort = process.env['PORT'] ?? process.env['WEB_PORT'] ?? '3000';
const baseEnv = { ...process.env, NODE_ENV: process.env['NODE_ENV'] ?? 'production' };
let shuttingDown = false;

const api = spawn(process.execPath, ['packages/api-edge/dist/main.js'], {
  env: { ...baseEnv, PORT: apiPort },
  stdio: 'inherit',
});
const web = spawn(process.execPath, ['apps/web/server.mjs'], {
  env: { ...baseEnv, API_PORT: apiPort, WEB_PORT: webPort },
  stdio: 'inherit',
});

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  api.kill(signal);
  web.kill(signal);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

for (const child of [api, web]) {
  child.once('error', (error) => {
    console.error('Production process failed to start:', error);
    shutdown('SIGTERM');
    process.exitCode = 1;
  });
  child.once('exit', (code, signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    const reason = signal ? `signal ${signal}` : `exit code ${code ?? 1}`;
    console.error(`Production process stopped with ${reason}`);
    api.kill('SIGTERM');
    web.kill('SIGTERM');
    process.exitCode = code ?? 1;
  });
}
