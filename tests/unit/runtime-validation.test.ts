import { describe, expect, it } from 'vitest';
import { ConfigurationError, optionalPort } from '@business-os/shared-validation';

describe('runtime validation', () => {
  it('uses the configured port', () => {
    expect(optionalPort('PORT', '4310', 3000)).toBe(4310);
  });

  it('rejects invalid ports', () => {
    expect(() => optionalPort('PORT', 'not-a-port', 3000)).toThrow(ConfigurationError);
  });
});
