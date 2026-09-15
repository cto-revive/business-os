import { access } from 'node:fs/promises';

const required = ['package.json', 'pnpm-workspace.yaml', 'tsconfig.json', 'tsconfig.base.json'];
const missing = [];

for (const file of required) {
  try {
    await access(file);
  } catch {
    missing.push(file);
  }
}

if (missing.length) {
  console.error(`Missing required repository files: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('Configuration validation passed.');
