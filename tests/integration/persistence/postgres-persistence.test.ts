import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createPostgresPersistence,
  createUuidV7,
  PostgresAuditRepository,
  readAuthorizationEpoch,
  withOrganizationDb,
  withPlatformDb,
} from '@business-os/persistence-postgres';
import type {
  AuditEvent,
  OrganizationContext,
  PlatformContext,
} from '@business-os/persistence-contracts';

const databaseUrl = process.env.DATABASE_URL;
const persistence = databaseUrl
  ? createPostgresPersistence({ connectionString: databaseUrl, max: 4 })
  : null;

const organizationA = createUuidV7();
const organizationB = createUuidV7();
const principalA = createUuidV7();
const membershipA = createUuidV7();

const contextA: OrganizationContext = {
  organizationId: organizationA,
  principalId: principalA,
  principalKind: 'human',
  membershipOrCredentialId: membershipA,
  authorizationEpoch: 1,
  correlationId: `test-${createUuidV7()}`,
  scope: ['audit:write', 'audit:read'],
};

function event(organizationId: string, correlationId = `event-${createUuidV7()}`): AuditEvent {
  return {
    eventId: createUuidV7(),
    occurredAt: new Date(),
    organizationId,
    actorId: principalA,
    actorKind: 'human',
    action: 'persistence.test',
    resourceType: 'audit_event',
    targetId: null,
    authorizationOutcome: 'allow',
    policyBasis: 'integration-test',
    outcome: 'success',
    correlationId,
    payload: { synthetic: true },
  };
}

describe.skipIf(!persistence)('PostgreSQL G-003 persistence foundation', () => {
  const audit = new PostgresAuditRepository(persistence!);

  beforeAll(async () => {
    await audit.append(contextA, event(organizationA));
    await audit.append(contextA, event(organizationA));
  });

  afterAll(async () => {
    await persistence?.close();
  });

  it('requires organization context for repository operations', async () => {
    await expect(
      audit.append({ ...contextA, organizationId: '' }, event(organizationA)),
    ).rejects.toThrow('complete organization context');
  });

  it('enforces repository organization scoping and prevents forged organization writes', async () => {
    await expect(audit.append(contextA, event(organizationB))).rejects.toThrow(
      'does not match the active persistence context',
    );

    await expect(
      withOrganizationDb(persistence!, contextA, async (db) =>
        db
          .insertInto('audit_events')
          .values({
            event_id: createUuidV7(),
            occurred_at: new Date(),
            organization_id: organizationB,
            actor_id: principalA,
            actor_kind: 'human',
            action: 'forged.write',
            resource_type: 'audit_event',
            target_id: null,
            authorization_outcome: 'allow',
            policy_basis: 'negative-test',
            outcome: 'must-deny',
            error_category: null,
            correlation_id: `forged-${createUuidV7()}`,
            causation_id: null,
            payload: null,
          })
          .execute(),
      ),
    ).rejects.toThrow();
  });

  it('returns only the active organization rows through RLS', async () => {
    const count = await withOrganizationDb(persistence!, contextA, async (db) =>
      db
        .selectFrom('audit_events')
        .select(({ fn }) => fn.countAll<number>().as('count'))
        .executeTakeFirstOrThrow(),
    );
    expect(Number(count.count)).toBeGreaterThanOrEqual(2);
  });

  it('propagates the authorization epoch and permits only explicit platform scope', async () => {
    const epoch = await withOrganizationDb(persistence!, contextA, (db) =>
      readAuthorizationEpoch(db),
    );
    expect(epoch).toBe(1);

    const platformContext: PlatformContext = {
      principalId: principalA,
      principalKind: 'service',
      correlationId: `platform-${createUuidV7()}`,
      scope: ['platform:audit:read'],
    };
    await audit.append(platformContext, { ...event(''), organizationId: null });
    const platformRows = await withPlatformDb(persistence!, platformContext, async (db) =>
      db
        .selectFrom('audit_events')
        .select('event_id')
        .where('organization_id', 'is', null)
        .execute(),
    );
    expect(platformRows.length).toBeGreaterThanOrEqual(1);
  });

  it('enforces duplicate event identifiers as a database constraint', async () => {
    const duplicate = event(organizationA);
    await audit.append(contextA, duplicate);
    await expect(audit.append(contextA, duplicate)).rejects.toThrow();
  });

  it('rolls back transaction-local writes on failure', async () => {
    const marker = `rollback-${createUuidV7()}`;
    await expect(
      withOrganizationDb(persistence!, contextA, async (db) => {
        await db
          .insertInto('audit_events')
          .values({
            event_id: createUuidV7(),
            occurred_at: new Date(),
            organization_id: organizationA,
            actor_id: principalA,
            actor_kind: 'human',
            action: 'transaction.rollback',
            resource_type: 'audit_event',
            target_id: null,
            authorization_outcome: 'allow',
            policy_basis: 'integration-test',
            outcome: 'rollback',
            error_category: null,
            correlation_id: marker,
            causation_id: null,
            payload: null,
          })
          .execute();
        throw new Error('force rollback');
      }),
    ).rejects.toThrow('force rollback');

    const result = await withOrganizationDb(persistence!, contextA, async (db) =>
      db
        .selectFrom('audit_events')
        .select('event_id')
        .where('correlation_id', '=', marker)
        .execute(),
    );
    expect(result).toHaveLength(0);
  });
});
