import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createPostgresPersistence,
  PostgresPlatformRepository,
} from '@business-os/persistence-postgres';
import { PlatformAccessError, PlatformRuntime } from '@business-os/platform-runtime';
const databaseUrl = process.env['DATABASE_URL'];
const suite = databaseUrl ? describe : describe.skip;
const ORG_A = '10000000-0000-0000-0000-000000000001';
const ORG_B = '10000000-0000-0000-0000-000000000002';
const USER_A = '00000000-0000-0000-0000-000000000001';
const USER_B = '00000000-0000-0000-0000-000000000002';
suite('first-screen PostgreSQL security', () => {
  const client = new pg.Client({ connectionString: databaseUrl });
  const persistence = createPostgresPersistence({ connectionString: databaseUrl });
  const runtime = new PlatformRuntime(new PostgresPlatformRepository(persistence));
  beforeAll(async () => {
    await client.connect();
  });
  afterAll(async () => {
    await client.end();
    await persistence.close();
  });
  it('fails closed without an RLS context for the non-owner runtime role', async () => {
    const result = await client.query('select count(*)::int as count from workspace_items');
    expect(result.rows[0]?.count).toBe(0);
  });
  it('allows an organization context to see only its own workspace items', async () => {
    await client.query(
      "select set_config('app.platform_access', 'false', false), set_config('app.organization_id', $1, false)",
      [ORG_A],
    );
    const own = await client.query('select organization_id from workspace_items order by item_id');
    expect(own.rows).toHaveLength(2);
    expect(own.rows.every((row) => row.organization_id === ORG_A)).toBe(true);
    await client.query("select set_config('app.organization_id', $1, false)", [ORG_B]);
    const other = await client.query('select organization_id from workspace_items');
    expect(other.rows).toHaveLength(1);
    expect(other.rows[0]?.organization_id).toBe(ORG_B);
  });
  it('rejects a cross-organization write under the runtime role', async () => {
    await client.query(
      "select set_config('app.platform_access', 'false', false), set_config('app.organization_id', $1, false)",
      [ORG_A],
    );
    await expect(
      client.query(
        "insert into workspace_items (item_id, organization_id, title) values ('20000000-0000-0000-0000-000000000099', $1, 'forbidden')",
        [ORG_B],
      ),
    ).rejects.toThrow();
  });
  it('serves Home only through an active membership and current authorization epoch', async () => {
    await client.query(
      "select set_config('app.platform_access', 'true', false), set_config('app.principal_id', $1, false)",
      [USER_A],
    );
    const session = await runtime.loginDevelopment(USER_A, ORG_A);
    const home = await runtime.home(session.sessionId);
    expect(home.organization.id).toBe(ORG_A);
    expect(home.workspace.itemCount).toBe(2);
    await expect(
      runtime.loginDevelopment(USER_B, ORG_A),
    ).rejects.toMatchObject<PlatformAccessError>({ code: 'ORGANIZATION_ACCESS_DENIED' });
    await client.query("select set_config('app.platform_access', 'true', false)");
  });
});
