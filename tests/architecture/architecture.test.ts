import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';

describe('architecture checks', () => {
  it('passes the repository architecture validator', () => {
    expect(() =>
      execFileSync(process.execPath, ['tooling/architecture-check.mjs'], { stdio: 'pipe' }),
    ).not.toThrow();
  });
});
