import { describe, expect, it } from 'vitest';
import type { HealthSnapshot } from '@business-os/shared-contracts';

describe('public contracts', () => {
  it('represents a health snapshot without provider-specific types', () => {
    const snapshot: HealthSnapshot = {
      status: 'ok',
      service: 'business-os',
      version: '0.1.0',
      checkedAt: new Date().toISOString(),
    };
    expect(snapshot.status).toBe('ok');
  });
});
