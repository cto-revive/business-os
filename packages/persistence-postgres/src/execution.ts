import type {
  ApprovalBinding,
  EventEnvelope,
  FailureClass,
  Lease,
  OutboxRecord,
  QueueMessage,
} from '@business-os/execution-contracts';
import { approvalBindingHash as calculateApprovalBindingHash } from '@business-os/execution-contracts';
import type { PersistenceScope } from '@business-os/persistence-contracts';
import { sql } from 'kysely';
import type { PostgresPersistence, PostgresScope } from './index.js';
import { createUuidV7, withOrganizationPostgresScope, withPlatformPostgresScope } from './index.js';

interface ExecutionQueueRow {
  message_id: string;
  job_id: string;
  message_type: string;
  message_version: number;
  organization_id: string | null;
  principal_id: string;
  principal_kind: QueueMessage['scope']['principalKind'];
  authorization_epoch: number | null;
  idempotency_key: string;
  payload: Readonly<Record<string, unknown>>;
  attempt: number;
  available_at: Date;
  leased_until: Date;
  fencing_token: number;
  correlation_id: string;
}

interface ExecutionEventRow {
  event_id: string;
  event_type: string;
  event_version: number;
  occurred_at: Date;
  organization_id: string | null;
  actor_id: string;
  actor_kind: EventEnvelope['actorKind'];
  authorization_epoch: number | null;
  aggregate_type: string;
  aggregate_id: string;
  aggregate_sequence: number | null;
  correlation_id: string;
  causation_id: string | null;
  payload: Readonly<Record<string, unknown>>;
  available_at: Date;
  attempt: number;
  fencing_token: number;
}

interface IdempotencyRow {
  request_hash: string;
  state: string;
}

export class PostgresExecutionQueueRepository {
  public constructor(private readonly persistence: PostgresPersistence) {}

  public async enqueue(scope: PostgresScope, message: QueueMessage): Promise<void> {
    const organizationId = 'organizationId' in scope.context ? scope.context.organizationId : null;
    await scope.db
      .insertInto('execution_queue_messages')
      .values({
        message_id: message.messageId,
        job_id: message.jobId,
        message_type: message.messageType,
        message_version: message.messageVersion,
        organization_id: organizationId,
        principal_id: message.scope.principalId,
        principal_kind: message.scope.principalKind,
        authorization_epoch:
          'organizationId' in message.scope ? message.scope.authorizationEpoch : null,
        idempotency_key: message.idempotencyKey,
        payload: message.payload,
        state: 'ready',
        attempt: message.attempt,
        available_at: message.availableAt,
        leased_until: null,
        lease_owner: null,
        fencing_token: 0,
        correlation_id: message.scope.correlationId,
        causation_id: null,
        last_error: null,
      })
      .execute();
  }

  public async claim(
    scope: PostgresScope,
    ownerId: string,
    now: Date,
    leaseMs: number,
  ): Promise<{ message: QueueMessage; lease: Lease } | null> {
    const result = await sql<ExecutionQueueRow>`
      WITH candidate AS (
        SELECT message_id
        FROM execution_queue_messages
        WHERE state IN ('ready', 'retryable_failure')
          AND available_at <= ${now}
          AND (leased_until IS NULL OR leased_until <= ${now})
        ORDER BY available_at, message_id
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE execution_queue_messages q
      SET state = 'leased', lease_owner = ${ownerId}, leased_until = ${new Date(now.getTime() + leaseMs)},
          fencing_token = q.fencing_token + 1, attempt = q.attempt + 1
      FROM candidate
      WHERE q.message_id = candidate.message_id
      RETURNING q.*
    `.execute(scope.db);
    const row = result.rows[0];
    if (!row) return null;
    const lease: Lease = {
      messageId: row.message_id,
      ownerId,
      fencingToken: Number(row.fencing_token),
      expiresAt: new Date(row.leased_until),
    };
    return {
      lease,
      message: {
        messageId: row.message_id,
        jobId: row.job_id,
        messageType: row.message_type,
        messageVersion: row.message_version,
        scope: row.organization_id
          ? {
              organizationId: row.organization_id,
              principalId: row.principal_id,
              principalKind: row.principal_kind,
              membershipOrCredentialId: row.principal_id,
              authorizationEpoch: Number(row.authorization_epoch ?? 0),
              correlationId: row.correlation_id,
              scope: [],
            }
          : {
              principalId: row.principal_id,
              principalKind: row.principal_kind,
              correlationId: row.correlation_id,
              scope: ['platform:execution'],
            },
        idempotencyKey: row.idempotency_key,
        payload: row.payload,
        attempt: Number(row.attempt),
        availableAt: new Date(row.available_at),
      },
    };
  }

  public async heartbeat(
    scope: PostgresScope,
    lease: Lease,
    now: Date,
    leaseMs: number,
  ): Promise<Lease> {
    const expiresAt = new Date(now.getTime() + leaseMs);
    const result = await sql<{ message_id: string; leased_until: Date }>`
      UPDATE execution_queue_messages
      SET leased_until = ${expiresAt}
      WHERE message_id = ${lease.messageId} AND lease_owner = ${lease.ownerId}
        AND fencing_token = ${lease.fencingToken} AND state = 'leased' AND leased_until > ${now}
      RETURNING message_id, leased_until
    `.execute(scope.db);
    if (!result.rows[0]) throw new Error('Stale or superseded lease fencing token');
    return { ...lease, expiresAt };
  }

  public async acknowledge(scope: PostgresScope, lease: Lease, now: Date): Promise<void> {
    const result =
      await sql`UPDATE execution_queue_messages SET state = 'acknowledged', leased_until = NULL
      WHERE message_id = ${lease.messageId} AND lease_owner = ${lease.ownerId}
        AND fencing_token = ${lease.fencingToken} AND state = 'leased' AND leased_until > ${now}`.execute(
        scope.db,
      );
    if (Number(result.numAffectedRows) !== 1)
      throw new Error('Stale or superseded lease fencing token');
  }

  public async retry(
    scope: PostgresScope,
    lease: Lease,
    failure: FailureClass,
    nextAttemptAt: Date,
  ): Promise<void> {
    const result =
      await sql`UPDATE execution_queue_messages SET state = ${failure === 'retryable' ? 'retryable_failure' : 'dead_lettered'}, available_at = ${nextAttemptAt}, leased_until = NULL, lease_owner = NULL, last_error = ${failure}
      WHERE message_id = ${lease.messageId} AND lease_owner = ${lease.ownerId} AND fencing_token = ${lease.fencingToken} AND state = 'leased'`.execute(
        scope.db,
      );
    if (Number(result.numAffectedRows) !== 1)
      throw new Error('Stale or superseded lease fencing token');
  }

  public async deadLetter(scope: PostgresScope, lease: Lease, reason: string): Promise<void> {
    const result =
      await sql`UPDATE execution_queue_messages SET state = 'dead_lettered', leased_until = NULL, lease_owner = NULL, last_error = ${reason}
      WHERE message_id = ${lease.messageId} AND lease_owner = ${lease.ownerId} AND fencing_token = ${lease.fencingToken} AND state = 'leased'`.execute(
        scope.db,
      );
    if (Number(result.numAffectedRows) !== 1)
      throw new Error('Stale or superseded lease fencing token');
  }

  public async requeueExpired(scope: PostgresScope, now: Date): Promise<number> {
    const result =
      await sql`UPDATE execution_queue_messages SET state = 'retryable_failure', leased_until = NULL, lease_owner = NULL, last_error = 'lease_expired'
      WHERE state = 'leased' AND leased_until <= ${now}`.execute(scope.db);
    return Number(result.numAffectedRows);
  }

  public async withOrganizationScope<T>(
    context: Parameters<typeof withOrganizationPostgresScope>[1],
    operation: (scope: PostgresScope) => Promise<T>,
  ): Promise<T> {
    return withOrganizationPostgresScope(this.persistence, context, operation);
  }

  public async withPlatformScope<T>(
    context: Parameters<typeof withPlatformPostgresScope>[1],
    operation: (scope: PostgresScope) => Promise<T>,
  ): Promise<T> {
    return withPlatformPostgresScope(this.persistence, context, operation);
  }
}

export class PostgresOutboxRepository {
  public constructor(private readonly persistence: PostgresPersistence) {}

  public async append(scope: PostgresScope, event: EventEnvelope): Promise<void> {
    const organizationId = 'organizationId' in scope.context ? scope.context.organizationId : null;
    if (event.organizationId !== organizationId)
      throw new Error('Event organization does not match persistence context');
    await scope.db
      .insertInto('execution_events' as never)
      .values({
        event_id: event.eventId,
        event_type: event.eventType,
        event_version: event.eventVersion,
        occurred_at: event.occurredAt,
        organization_id: organizationId,
        actor_id: event.actorId,
        actor_kind: event.actorKind,
        authorization_epoch: event.authorizationEpoch ?? null,
        aggregate_type: event.aggregateType,
        aggregate_id: event.aggregateId,
        aggregate_sequence: event.aggregateSequence ?? null,
        correlation_id: event.correlationId,
        causation_id: event.causationId ?? null,
        payload: event.payload,
        state: 'pending',
        available_at: event.occurredAt,
        attempt: 0,
        leased_until: null,
        fencing_token: 0,
      } as never)
      .execute();
  }

  public async claim(
    scope: PostgresScope,
    ownerId: string,
    now: Date,
    leaseMs: number,
  ): Promise<OutboxRecord | null> {
    const result = await sql<ExecutionEventRow>`WITH candidate AS (
      SELECT event_id FROM execution_events
      WHERE state IN ('pending', 'retryable_failure') AND available_at <= ${now}
        AND (leased_until IS NULL OR leased_until <= ${now})
      ORDER BY available_at, event_id FOR UPDATE SKIP LOCKED LIMIT 1
    ) UPDATE execution_events e SET state = 'leased', leased_until = ${new Date(now.getTime() + leaseMs)}, fencing_token = e.fencing_token + 1, attempt = e.attempt + 1
      FROM candidate WHERE e.event_id = candidate.event_id RETURNING e.*`.execute(scope.db);
    const row = result.rows[0];
    if (!row) return null;
    return {
      state: 'leased',
      availableAt: new Date(row.available_at),
      attempt: Number(row.attempt),
      fencingToken: Number(row.fencing_token),
      event: {
        eventId: row.event_id,
        eventType: row.event_type,
        eventVersion: Number(row.event_version),
        occurredAt: new Date(row.occurred_at),
        organizationId: row.organization_id,
        actorId: row.actor_id,
        actorKind: row.actor_kind,
        aggregateType: row.aggregate_type,
        aggregateId: row.aggregate_id,
        correlationId: row.correlation_id,
        payload: row.payload,
        ...(row.authorization_epoch === null
          ? {}
          : { authorizationEpoch: Number(row.authorization_epoch) }),
        ...(row.aggregate_sequence === null
          ? {}
          : { aggregateSequence: Number(row.aggregate_sequence) }),
        ...(row.causation_id === null ? {} : { causationId: row.causation_id }),
      },
    };
  }

  public async markPublished(
    scope: PostgresScope,
    eventId: string,
    ownerId: string,
    fencingToken: number,
  ): Promise<void> {
    const result = await sql`UPDATE execution_events SET state = 'published', leased_until = NULL
      WHERE event_id = ${eventId} AND state = 'leased' AND fencing_token = ${fencingToken} AND leased_until > CURRENT_TIMESTAMP`.execute(
      scope.db,
    );
    if (Number(result.numAffectedRows) !== 1)
      throw new Error('Stale or superseded lease fencing token');
  }

  public async markRetryable(
    scope: PostgresScope,
    eventId: string,
    ownerId: string,
    fencingToken: number,
    nextAttemptAt: Date,
    reason: string,
  ): Promise<void> {
    const result =
      await sql`UPDATE execution_events SET state = 'retryable_failure', available_at = ${nextAttemptAt}, leased_until = NULL
      WHERE event_id = ${eventId} AND state = 'leased' AND fencing_token = ${fencingToken}`.execute(
        scope.db,
      );
    if (Number(result.numAffectedRows) !== 1)
      throw new Error(`Stale or superseded lease fencing token: ${reason}`);
  }
}

export class PostgresIdempotencyRepository {
  public async begin(
    scope: PostgresScope,
    operationType: string,
    key: string,
    requestHash: string,
    expiresAt: Date,
  ): Promise<'created' | 'completed' | 'in_progress' | 'conflict'> {
    const organizationId = 'organizationId' in scope.context ? scope.context.organizationId : null;
    const scopeKey = organizationId ?? 'platform';
    const existing = (await scope.db
      .selectFrom('execution_idempotency' as never)
      .selectAll()
      .where('idempotency_key' as never, '=', key as never)
      .where('scope_key' as never, '=', scopeKey as never)
      .where('operation_type' as never, '=', operationType as never)
      .executeTakeFirst()) as IdempotencyRow | undefined;
    if (!existing) {
      await scope.db
        .insertInto('execution_idempotency' as never)
        .values({
          idempotency_key: key,
          scope_key: scopeKey,
          organization_id: organizationId,
          operation_type: operationType,
          request_hash: requestHash,
          state: 'in_progress',
          result: null,
          expires_at: expiresAt,
          created_at: new Date(),
        } as never)
        .execute();
      return 'created';
    }
    if (existing.request_hash !== requestHash) return 'conflict';
    return existing.state === 'completed' ? 'completed' : 'in_progress';
  }

  public async complete(
    scope: PostgresScope,
    operationType: string,
    key: string,
    requestHash: string,
    result: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    const scopeKey = 'organizationId' in scope.context ? scope.context.organizationId : 'platform';
    const updated = await scope.db
      .updateTable('execution_idempotency' as never)
      .set({ state: 'completed', result } as never)
      .where('idempotency_key' as never, '=', key as never)
      .where('scope_key' as never, '=', scopeKey as never)
      .where('operation_type' as never, '=', operationType as never)
      .where('request_hash' as never, '=', requestHash as never)
      .executeTakeFirst();
    if (Number(updated.numUpdatedRows) !== 1)
      throw new Error('Idempotency record is missing or has a conflicting request hash');
  }
}

export class PostgresApprovalRepository {
  public async create(
    scope: PostgresScope,
    request: ApprovalBinding & { approvalRequestId: string; requesterId: string; expiresAt: Date },
  ): Promise<void> {
    const organizationId = 'organizationId' in scope.context ? scope.context.organizationId : null;
    if (request.organizationId !== organizationId)
      throw new Error('Approval organization does not match persistence context');
    await scope.db
      .insertInto('execution_approvals' as never)
      .values({
        approval_request_id: request.approvalRequestId,
        organization_id: organizationId,
        requester_id: request.requesterId,
        action_type: request.actionType,
        action_version: request.actionVersion,
        binding_hash: calculateApprovalBindingHash(request),
        input: JSON.stringify(request.input),
        target_ids: JSON.stringify(request.targetIds),
        resource_versions: JSON.stringify(request.resourceVersions),
        authorization_epoch: request.authorizationEpoch,
        state: 'pending',
        expires_at: request.expiresAt,
        created_at: new Date(),
      } as never)
      .execute();
  }

  public async decide(
    scope: PostgresScope,
    approvalRequestId: string,
    approverId: string,
    decision: 'approved' | 'rejected',
  ): Promise<void> {
    const result = await sql`UPDATE execution_approvals SET state = ${decision}
      WHERE approval_request_id = ${approvalRequestId} AND state = 'pending' AND requester_id <> ${approverId}`.execute(
      scope.db,
    );
    if (Number(result.numAffectedRows) !== 1)
      throw new Error('Approval is not pending or separation of duties failed');
  }

  public async bindExecution(
    scope: PostgresScope,
    approvalRequestId: string,
    executionId: string,
    bindingHash: string,
  ): Promise<void> {
    const result =
      await sql`INSERT INTO execution_records (execution_id, approval_request_id, organization_id, action_type, action_version, binding_hash, idempotency_key, state)
      SELECT ${executionId}, approval_request_id, organization_id, action_type, action_version, binding_hash, approval_request_id::text, 'pending'
      FROM execution_approvals WHERE approval_request_id = ${approvalRequestId} AND state = 'approved' AND binding_hash = ${bindingHash}`.execute(
        scope.db,
      );
    if (Number(result.numAffectedRows) !== 1)
      throw new Error('Approval binding is invalid or no longer approved');
  }
}

function approvalBindingHash(binding: ApprovalBinding): string {
  return [
    binding.actionType,
    binding.actionVersion,
    binding.organizationId,
    binding.input,
    binding.targetIds,
    binding.resourceVersions,
    binding.policyVersion,
    binding.authorizationEpoch,
  ]
    .map(String)
    .join('|');
}

export type ExecutionPersistenceScope = PersistenceScope;
export { createUuidV7 };
