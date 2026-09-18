import { describe, expect, it } from 'vitest';
import type { QueueMessage, Lease } from '@business-os/execution-contracts';
import { DurableExecutionRuntime, SystemClock } from '@business-os/execution-runtime';

const message: QueueMessage = {
  messageId: 'message-1',
  jobId: 'job-1',
  messageType: 'test.action',
  messageVersion: 1,
  scope: {
    organizationId: 'org-1',
    principalId: 'principal-1',
    principalKind: 'service',
    membershipOrCredentialId: 'credential-1',
    authorizationEpoch: 2,
    correlationId: 'correlation-1',
    scope: ['test:execute'],
  },
  idempotencyKey: 'idem-1',
  payload: { value: 1 },
  attempt: 1,
  availableAt: new Date(0),
};

function fakeQueue(result: { mode: 'success' | 'retry' | 'stale' }) {
  const lease: Lease = {
    messageId: message.messageId,
    ownerId: 'worker-1',
    fencingToken: 1,
    expiresAt: new Date(Date.now() + 10000),
  };
  return {
    acknowledged: false,
    retried: false,
    deadLettered: false,
    async claim() {
      return { message, lease };
    },
    async acknowledge() {
      if (result.mode === 'stale') throw new Error('Stale or superseded lease fencing token');
      this.acknowledged = true;
    },
    async retry() {
      this.retried = true;
    },
    async deadLetter() {
      this.deadLettered = true;
    },
    async enqueue() {},
    async heartbeat() {
      return lease;
    },
    async requeueExpired() {
      return 0;
    },
  };
}

describe('G-004 execution runtime', () => {
  it('authorizes immediately before execution and acknowledges success', async () => {
    const queue = fakeQueue({ mode: 'success' });
    let handled = false;
    const runtime = new DurableExecutionRuntime({
      clock: new SystemClock(),
      queue,
      publisher: {
        async publish() {
          return 'accepted';
        },
      },
      authorization: {
        async authorize() {
          return { outcome: 'allow', policyBasis: 'test', authorizationEpoch: 2 };
        },
      },
      handlers: new Map([
        [
          'test.action',
          {
            async handle() {
              handled = true;
            },
          },
        ],
      ]),
    });
    await expect(runtime.claimAndExecute('worker-1', 10000)).resolves.toBe('succeeded');
    expect(handled).toBe(true);
    expect(queue.acknowledged).toBe(true);
  });

  it('fails closed when the authorization epoch is stale', async () => {
    const queue = fakeQueue({ mode: 'success' });
    const runtime = new DurableExecutionRuntime({
      clock: new SystemClock(),
      queue,
      publisher: {
        async publish() {
          return 'accepted';
        },
      },
      authorization: {
        async authorize() {
          return { outcome: 'allow', policyBasis: 'stale', authorizationEpoch: 3 };
        },
      },
      handlers: new Map([
        [
          'test.action',
          {
            async handle() {
              throw new Error('must not execute');
            },
          },
        ],
      ]),
    });
    await expect(runtime.claimAndExecute('worker-1', 10000)).resolves.toBe('terminal_failure');
    expect(queue.deadLettered).toBe(true);
  });
});
