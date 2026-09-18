import { afterAll, describe, expect, it } from 'vitest';
import {
  createPostgresPersistence,
  createUuidV7,
  PostgresAuditRepository,
  PostgresApprovalRepository,
  PostgresExecutionQueueRepository,
  PostgresIdempotencyRepository,
  PostgresOutboxRepository,
  withOrganizationPostgresScope,
} from '@business-os/persistence-postgres';
import type { PostgresScope } from '@business-os/persistence-postgres';
import type { OrganizationContext } from '@business-os/persistence-contracts';
import { approvalBindingHash } from '@business-os/execution-contracts';

const databaseUrl = process.env.DATABASE_URL;
const persistence = databaseUrl
  ? createPostgresPersistence({ connectionString: databaseUrl, max: 4 })
  : null;

const contextA: OrganizationContext = {
  organizationId: createUuidV7(),
  principalId: createUuidV7(),
  principalKind: 'service',
  membershipOrCredentialId: createUuidV7(),
  authorizationEpoch: 3,
  correlationId: `g004-a-${createUuidV7()}`,
  scope: ['execution:enqueue', 'execution:claim'],
};
const contextB: OrganizationContext = {
  ...contextA,
  organizationId: createUuidV7(),
  correlationId: `g004-b-${createUuidV7()}`,
};

function message(context: OrganizationContext) {
  return {
    messageId: createUuidV7(),
    jobId: createUuidV7(),
    messageType: 'g004.test',
    messageVersion: 1,
    scope: context,
    idempotencyKey: `idem-${createUuidV7()}`,
    payload: { organizationId: context.organizationId },
    attempt: 0,
    availableAt: new Date(Date.now() - 1000),
  } as const;
}

async function createJob(scope: PostgresScope, item: ReturnType<typeof message>) {
  await scope.db
    .insertInto('execution_jobs')
    .values({
      job_id: item.jobId,
      job_type: item.messageType,
      job_version: item.messageVersion,
      organization_id: item.scope.organizationId,
      principal_id: item.scope.principalId,
      principal_kind: item.scope.principalKind,
      authorization_epoch: item.scope.authorizationEpoch,
      idempotency_key: item.idempotencyKey,
      state: 'pending',
      payload: item.payload,
      retry_policy: { version: 1, maxAttempts: 3 },
      correlation_id: item.scope.correlationId,
      causation_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .execute();
}

describe.skipIf(!persistence)('PostgreSQL G-004 execution persistence', () => {
  const queue = new PostgresExecutionQueueRepository(persistence!);
  const audit = new PostgresAuditRepository(persistence!);
  const outbox = new PostgresOutboxRepository(persistence!);
  const idempotency = new PostgresIdempotencyRepository();
  const approvals = new PostgresApprovalRepository();

  afterAll(async () => {
    await persistence?.close();
  });

  it('enqueues and claims only within the active organization context', async () => {
    const a = message(contextA);
    const b = message(contextB);
    await queue.withOrganizationScope(contextA, async (scope) => {
      await createJob(scope, a);
      await queue.enqueue(scope, a);
    });
    await queue.withOrganizationScope(contextB, async (scope) => {
      await createJob(scope, b);
      await queue.enqueue(scope, b);
    });

    const claimed = await queue.withOrganizationScope(contextA, (scope) =>
      queue.claim(scope, 'worker-a', new Date(), 30_000),
    );
    expect(claimed?.message.messageId).toBe(a.messageId);
    expect(claimed?.message.scope).toMatchObject({ organizationId: contextA.organizationId });
  });

  it('rejects a forged cross-organization insert through RLS', async () => {
    await expect(
      queue.withOrganizationScope(contextA, async (scope) => {
        await scope.db
          .insertInto('execution_queue_messages')
          .values({
            message_id: createUuidV7(),
            job_id: createUuidV7(),
            message_type: 'forged',
            message_version: 1,
            organization_id: contextB.organizationId,
            principal_id: contextA.principalId,
            principal_kind: contextA.principalKind,
            authorization_epoch: contextA.authorizationEpoch,
            idempotency_key: `forged-${createUuidV7()}`,
            payload: {},
            state: 'ready',
            attempt: 0,
            available_at: new Date(),
            leased_until: null,
            lease_owner: null,
            fencing_token: 0,
            correlation_id: contextA.correlationId,
            causation_id: null,
            last_error: null,
          })
          .execute();
      }),
    ).rejects.toThrow();
  });

  it('rejects stale fencing tokens and recovers expired leases', async () => {
    const queued = message(contextA);
    await queue.withOrganizationScope(contextA, async (scope) => {
      await createJob(scope, queued);
      await queue.enqueue(scope, queued);
    });
    const claimed = await queue.withOrganizationScope(contextA, (scope) =>
      queue.claim(scope, 'worker-fence', new Date(), 1),
    );
    expect(claimed).not.toBeNull();
    const stale = { ...claimed!.lease, fencingToken: claimed!.lease.fencingToken - 1 };
    await expect(
      queue.withOrganizationScope(contextA, (scope) => queue.acknowledge(scope, stale, new Date())),
    ).rejects.toThrow('Stale');
    const recovered = await queue.withOrganizationScope(contextA, (scope) =>
      queue.requeueExpired(scope, new Date(Date.now() + 10)),
    );
    expect(recovered).toBeGreaterThanOrEqual(1);
  });

  it('persists an outbox event and claims it with a fenced lease', async () => {
    const event = {
      eventId: createUuidV7(),
      eventType: 'g004.test',
      eventVersion: 1,
      occurredAt: new Date(),
      organizationId: contextA.organizationId,
      actorId: contextA.principalId,
      actorKind: contextA.principalKind,
      authorizationEpoch: contextA.authorizationEpoch,
      aggregateType: 'test',
      aggregateId: createUuidV7(),
      correlationId: contextA.correlationId,
      payload: { test: true },
    } as const;
    const claimed = await queue.withOrganizationScope(contextA, async (scope) => {
      await outbox.append(scope, event);
      return outbox.claim(scope, 'outbox-worker', new Date(), 30_000);
    });
    expect(claimed?.event.eventId).toBe(event.eventId);
    await queue.withOrganizationScope(contextA, (scope) =>
      outbox.markPublished(scope, event.eventId, 'outbox-worker', claimed!.fencingToken!),
    );
  });

  it('rolls back audit and outbox writes together', async () => {
    const correlationId = `atomic-${createUuidV7()}`;
    const event = {
      eventId: createUuidV7(),
      eventType: 'g004.atomic',
      eventVersion: 1,
      occurredAt: new Date(),
      organizationId: contextA.organizationId,
      actorId: contextA.principalId,
      actorKind: contextA.principalKind,
      authorizationEpoch: contextA.authorizationEpoch,
      aggregateType: 'test',
      aggregateId: createUuidV7(),
      correlationId,
      payload: { atomic: true },
    } as const;
    const auditEvent = {
      eventId: createUuidV7(),
      occurredAt: new Date(),
      organizationId: contextA.organizationId,
      actorId: contextA.principalId,
      actorKind: contextA.principalKind,
      action: 'g004.atomic',
      resourceType: 'test',
      targetId: null,
      authorizationOutcome: 'allow' as const,
      policyBasis: 'test',
      outcome: 'success',
      correlationId,
      payload: { atomic: true },
    };
    await expect(
      queue.withOrganizationScope(contextA, async (scope) => {
        await audit.appendInScope(scope, auditEvent);
        await outbox.append(scope, event);
        throw new Error('force atomic rollback');
      }),
    ).rejects.toThrow('force atomic rollback');
    const counts = await queue.withOrganizationScope(contextA, async (scope) => ({
      audit: await scope.db
        .selectFrom('audit_events')
        .selectAll()
        .where('correlation_id', '=', correlationId)
        .execute(),
      outbox: await scope.db
        .selectFrom('execution_events' as never)
        .selectAll()
        .where('correlation_id' as never, '=', correlationId as never)
        .execute(),
    }));
    expect(counts.audit).toHaveLength(0);
    expect(counts.outbox).toHaveLength(0);
  });

  it('rejects idempotency key reuse with a different request hash', async () => {
    const key = `idempotency-${createUuidV7()}`;
    const first = await queue.withOrganizationScope(contextA, (scope) =>
      idempotency.begin(scope, 'g004.test', key, 'hash-a', new Date(Date.now() + 60_000)),
    );
    const conflict = await queue.withOrganizationScope(contextA, (scope) =>
      idempotency.begin(scope, 'g004.test', key, 'hash-b', new Date(Date.now() + 60_000)),
    );
    expect(first).toBe('created');
    expect(conflict).toBe('conflict');
  });

  it('requires a different approver and preserves the approval binding', async () => {
    const request = {
      approvalRequestId: createUuidV7(),
      requesterId: contextA.principalId,
      actionType: 'g004.test',
      actionVersion: 1,
      organizationId: contextA.organizationId,
      input: { amount: 1 },
      targetIds: [createUuidV7()],
      resourceVersions: { version: '1' },
      policyVersion: 'v1',
      authorizationEpoch: contextA.authorizationEpoch,
      expiresAt: new Date(Date.now() + 60_000),
    } as const;
    const binding = approvalBindingHash(request);
    await queue.withOrganizationScope(contextA, async (scope) => {
      await approvals.create(scope, request);
      await expect(
        approvals.decide(scope, request.approvalRequestId, request.requesterId, 'approved'),
      ).rejects.toThrow('separation');
      await approvals.decide(scope, request.approvalRequestId, createUuidV7(), 'approved');
      await approvals.bindExecution(scope, request.approvalRequestId, createUuidV7(), binding);
    });
  });
});
