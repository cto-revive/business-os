import { describe, expect, it } from 'vitest';
import {
  approvalBindingHash,
  assertApprovalBinding,
  assertFencingToken,
  canonicalize,
  idempotencyRequestHash,
  retryDelayMs,
} from '@business-os/execution-contracts';

describe('G-004 execution contracts', () => {
  it('canonicalizes object keys deterministically', () => {
    expect(canonicalize({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
    expect(canonicalize({ a: [true, null, 'x'] })).toBe('{"a":[true,null,"x"]}');
  });

  it('rejects non-finite canonical values', () => {
    expect(() => canonicalize(Number.NaN)).toThrow('non-finite');
  });

  it('produces stable distinct hashes for idempotency and approval bindings', () => {
    const request = idempotencyRequestHash({
      operationType: 'job.create',
      operationVersion: 1,
      organizationId: 'org-a',
      targetIds: ['target-a'],
      request: { b: 2, a: 1 },
    });
    expect(request).toBe(
      idempotencyRequestHash({
        operationType: 'job.create',
        operationVersion: 1,
        organizationId: 'org-a',
        targetIds: ['target-a'],
        request: { a: 1, b: 2 },
      }),
    );
    expect(request).not.toBe(
      approvalBindingHash({
        actionType: 'job.create',
        actionVersion: 1,
        organizationId: 'org-a',
        input: { a: 1, b: 2 },
        targetIds: ['target-a'],
        resourceVersions: {},
        policyVersion: 'v1',
        authorizationEpoch: 1,
      }),
    );
  });

  it('rejects changed approval bindings and stale fencing tokens', () => {
    expect(() => assertApprovalBinding('expected', 'changed')).toThrow('new approval');
    expect(() => assertFencingToken(2, 1)).toThrow('Stale');
    expect(() => assertFencingToken(2, 2)).not.toThrow();
  });

  it('calculates bounded exponential retry delay with jitter', () => {
    expect(
      retryDelayMs(
        {
          version: 1,
          maxAttempts: 5,
          maxDelayMs: 1000,
          baseDelayMs: 100,
          jitterRatio: 0,
          maxElapsedMs: 10000,
        },
        4,
        0,
      ),
    ).toBe(800);
    expect(
      retryDelayMs(
        {
          version: 1,
          maxAttempts: 5,
          maxDelayMs: 1000,
          baseDelayMs: 100,
          jitterRatio: 0.2,
          maxElapsedMs: 10000,
        },
        8,
        1,
      ),
    ).toBe(1000);
  });
});
