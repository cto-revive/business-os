import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool, type PoolConfig } from 'pg';
import { v7 as uuidv7 } from 'uuid';
import {
  assertOrganizationContext,
  assertPlatformContext,
  type AuditEvent,
  type OrganizationContext,
  type PlatformContext,
  type PersistenceScope,
  type PersistenceTransaction,
} from '@business-os/persistence-contracts';

export interface AuditEventsTable {
  event_id: string;
  occurred_at: Date;
  organization_id: string | null;
  actor_id: string;
  actor_kind: string;
  action: string;
  resource_type: string;
  target_id: string | null;
  authorization_outcome: string;
  policy_basis: string;
  outcome: string;
  error_category: string | null;
  correlation_id: string;
  causation_id: string | null;
  payload: Record<string, unknown> | null;
}

export interface ExecutionQueueMessagesTable {
  message_id: string;
  job_id: string;
  message_type: string;
  message_version: number;
  organization_id: string | null;
  principal_id: string;
  principal_kind: string;
  authorization_epoch: number | null;
  idempotency_key: string;
  payload: Record<string, unknown>;
  state: string;
  attempt: number;
  available_at: Date;
  leased_until: Date | null;
  lease_owner: string | null;
  fencing_token: number;
  correlation_id: string;
  causation_id: string | null;
  last_error: string | null;
}

export interface PersistenceDatabase {
  audit_events: AuditEventsTable;
  execution_queue_messages: ExecutionQueueMessagesTable;
}

export interface PostgresPersistence {
  readonly db: Kysely<PersistenceDatabase>;
  readonly pool: Pool;
  close(): Promise<void>;
}

export interface PostgresScope extends PersistenceScope {
  readonly db: Kysely<PersistenceDatabase>;
}

export function createUuidV7(): string {
  return uuidv7();
}

export function createPostgresPersistence(config: PoolConfig): PostgresPersistence {
  const pool = new Pool(config);
  const db = new Kysely<PersistenceDatabase>({ dialect: new PostgresDialect({ pool }) });
  return {
    db,
    pool,
    async close(): Promise<void> {
      await db.destroy();
    },
  };
}

export async function withOrganizationPostgresScope<T>(
  persistence: PostgresPersistence,
  context: OrganizationContext,
  operation: (scope: PostgresScope) => Promise<T>,
): Promise<T> {
  const trusted = assertOrganizationContext(context);
  return persistence.db.transaction().execute(async (transaction) => {
    await setOrganizationRlsContext(transaction, trusted);
    return operation({ context: trusted, transactionId: createUuidV7(), db: transaction });
  });
}

export async function withPlatformPostgresScope<T>(
  persistence: PostgresPersistence,
  context: PlatformContext,
  operation: (scope: PostgresScope) => Promise<T>,
): Promise<T> {
  const trusted = assertPlatformContext(context);
  return persistence.db.transaction().execute(async (transaction) => {
    await setPlatformRlsContext(transaction, trusted);
    return operation({ context: trusted, transactionId: createUuidV7(), db: transaction });
  });
}

async function setOrganizationRlsContext(
  db: Kysely<PersistenceDatabase>,
  context: OrganizationContext,
): Promise<void> {
  const trusted = assertOrganizationContext(context);
  await sql`select set_config('app.organization_id', ${trusted.organizationId}, true),
    set_config('app.authorization_epoch', ${String(trusted.authorizationEpoch)}, true),
    set_config('app.correlation_id', ${trusted.correlationId}, true),
    set_config('app.platform_access', 'false', true)`.execute(db);
}

async function setPlatformRlsContext(
  db: Kysely<PersistenceDatabase>,
  context: PlatformContext,
): Promise<void> {
  const trusted = assertPlatformContext(context);
  await sql`select set_config('app.organization_id', '', true),
    set_config('app.authorization_epoch', '', true),
    set_config('app.principal_id', ${trusted.principalId}, true),
    set_config('app.correlation_id', ${trusted.correlationId}, true),
    set_config('app.platform_access', 'true', true)`.execute(db);
}

export async function withOrganizationTransaction<T>(
  persistence: PostgresPersistence,
  context: OrganizationContext,
  operation: (transaction: PersistenceTransaction) => Promise<T>,
): Promise<T> {
  const trusted = assertOrganizationContext(context);
  return persistence.db.transaction().execute(async (transaction) => {
    await setOrganizationRlsContext(transaction, trusted);
    const handle: PersistenceTransaction = {
      handle: { organizationContext: trusted, platformContext: null },
      run: async <R>(
        nested: (tx: {
          organizationContext: OrganizationContext | null;
          platformContext: PlatformContext | null;
        }) => Promise<R>,
      ): Promise<R> => nested(handle.handle),
    };
    return operation(handle);
  });
}

export async function withOrganizationDb<T>(
  persistence: PostgresPersistence,
  context: OrganizationContext,
  operation: (db: Kysely<PersistenceDatabase>) => Promise<T>,
): Promise<T> {
  return withOrganizationPostgresScope(persistence, context, ({ db }) => operation(db));
}

export async function withPlatformTransaction<T>(
  persistence: PostgresPersistence,
  context: PlatformContext,
  operation: (transaction: PersistenceTransaction) => Promise<T>,
): Promise<T> {
  const trusted = assertPlatformContext(context);
  return persistence.db.transaction().execute(async (transaction) => {
    await setPlatformRlsContext(transaction, trusted);
    const handle: PersistenceTransaction = {
      handle: { organizationContext: null, platformContext: trusted },
      run: async <R>(
        nested: (tx: {
          organizationContext: OrganizationContext | null;
          platformContext: PlatformContext | null;
        }) => Promise<R>,
      ): Promise<R> => nested(handle.handle),
    };
    return operation(handle);
  });
}

export async function readAuthorizationEpoch(db: Kysely<PersistenceDatabase>): Promise<number> {
  const result = await sql<{
    epoch: string;
  }>`select current_setting('app.authorization_epoch') as epoch`.execute(db);
  return Number(result.rows[0]?.epoch ?? '-1');
}

export async function withPlatformDb<T>(
  persistence: PostgresPersistence,
  context: PlatformContext,
  operation: (db: Kysely<PersistenceDatabase>) => Promise<T>,
): Promise<T> {
  return withPlatformPostgresScope(persistence, context, ({ db }) => operation(db));
}

export class PostgresAuditRepository {
  public constructor(private readonly persistence: PostgresPersistence) {}

  public async append(
    context: OrganizationContext | PlatformContext,
    event: AuditEvent,
  ): Promise<void> {
    if ('organizationId' in context) {
      const trusted = assertOrganizationContext(context);
      if (event.organizationId !== trusted.organizationId)
        throw new Error('Audit organization does not match the active persistence context');
      await withOrganizationDb(this.persistence, trusted, async (db) =>
        this.insert(db, event, trusted.organizationId),
      );
      return;
    }
    const trusted = assertPlatformContext(context);
    if (event.organizationId !== null)
      throw new Error('Platform audit events must not carry organization scope');
    await withPlatformDb(this.persistence, trusted, async (db) => this.insert(db, event, null));
  }

  public async appendInScope(scope: PostgresScope, event: AuditEvent): Promise<void> {
    const organizationId = 'organizationId' in scope.context ? scope.context.organizationId : null;
    if (event.organizationId !== organizationId)
      throw new Error('Audit organization does not match the active persistence context');
    await this.insert(scope.db, event, organizationId);
  }

  private async insert(
    db: Kysely<PersistenceDatabase>,
    event: AuditEvent,
    organizationId: string | null,
  ): Promise<void> {
    await db
      .insertInto('audit_events')
      .values({
        event_id: event.eventId,
        occurred_at: event.occurredAt,
        organization_id: organizationId,
        actor_id: event.actorId,
        actor_kind: event.actorKind,
        action: event.action,
        resource_type: event.resourceType,
        target_id: event.targetId,
        authorization_outcome: event.authorizationOutcome,
        policy_basis: event.policyBasis,
        outcome: event.outcome,
        error_category: event.errorCategory ?? null,
        correlation_id: event.correlationId,
        causation_id: event.causationId ?? null,
        payload: event.payload ?? null,
      })
      .execute();
  }
}

export {
  PostgresApprovalRepository,
  PostgresExecutionQueueRepository,
  PostgresIdempotencyRepository,
  PostgresOutboxRepository,
} from './execution.js';

export { PostgresPlatformRepository } from './platform.js';
export { PostgresAffiliateRepository } from './affiliate.js';
