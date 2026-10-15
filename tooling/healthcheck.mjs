/* global AbortSignal, fetch */

const port = process.env['PORT'] ?? '3000';
const path = process.env['HEALTH_PATH'] ?? '/health';
const url = `http://127.0.0.1:${port}${path}`;

try {
  const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.status !== 'ok') {
    console.error(`Health check failed: ${response.status} ${url}`);
    process.exit(1);
  }
  console.log(`Health check passed: ${url}`);
} catch (error) {
  console.error('Health check failed:', error);
  process.exit(1);
}
