/* global Buffer, fetch */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const apiPort = Number(process.env['API_PORT'] ?? 3000);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

async function proxyApi(request, response) {
  const body = request.method === 'GET' || request.method === 'HEAD'
    ? undefined
    : Buffer.concat(await (async () => {
        const chunks = [];
        for await (const chunk of request) chunks.push(chunk);
        return chunks;
      })());
  const upstream = await fetch(`http://127.0.0.1:${apiPort}${request.url ?? '/'}`, {
    method: request.method,
    headers: {
      ...(request.headers.cookie ? { cookie: request.headers.cookie } : {}),
      ...(request.headers['content-type'] ? { 'content-type': request.headers['content-type'] } : {}),
      ...(request.headers['x-csrf-token'] ? { 'x-csrf-token': request.headers['x-csrf-token'] } : {}),
    },
    body,
  });
  const headers = {};
  upstream.headers.forEach((value, key) => {
    if (key !== 'transfer-encoding' && key !== 'connection') headers[key] = value;
  });
  response.writeHead(upstream.status, headers);
  response.end(Buffer.from(await upstream.arrayBuffer()));
}

const server = createServer(async (request, response) => {
  const requestPath = request.url?.split('?')[0] ?? '/';
  if (requestPath === '/health' || requestPath.startsWith('/api/')) {
    try {
      await proxyApi(request, response);
    } catch {
      response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: { code: 'API_UNAVAILABLE', message: 'API is unavailable' } }));
    }
    return;
  }
  const safe = normalize(requestPath === '/' ? '/index.html' : requestPath);
  if (safe.includes('..')) {
    response.writeHead(403);
    response.end();
    return;
  }
  try {
    const file = await readFile(join(root, safe));
    response.writeHead(200, { 'Content-Type': types[extname(safe)] ?? 'application/octet-stream' });
    response.end(file);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

server.listen(Number(process.env['WEB_PORT'] ?? 4173), '0.0.0.0', () =>
  console.log(`Business OS web listening on ${process.env['WEB_PORT'] ?? 4173}`),
);
