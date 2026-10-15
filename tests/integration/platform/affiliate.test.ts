import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import {
  createPostgresPersistence,
  PostgresAffiliateRepository,
} from '@business-os/persistence-postgres';
import { AffiliateAccessError, AffiliateRuntime } from '@business-os/sales-crm-runtime';

const databaseUrl = process.env['DATABASE_URL'];
const suite = databaseUrl ? describe : describe.skip;
const ORG_A = '10000000-0000-0000-0000-000000000001';
const ORG_B = '10000000-0000-0000-0000-000000000002';
const USER_A = '00000000-0000-0000-0000-000000000001';
const suffix = Date.now().toString(36);

suite('Affiliate PostgreSQL security and commission behavior', () => {
  const persistence = createPostgresPersistence({ connectionString: databaseUrl });
  const runtime = new AffiliateRuntime(new PostgresAffiliateRepository(persistence));
  const owner = { organizationId: ORG_A, principalId: USER_A, role: 'owner' as const };
  const member = { organizationId: ORG_A, principalId: USER_A, role: 'member' as const };
  const otherOrganization = { organizationId: ORG_B, principalId: USER_A, role: 'owner' as const };
  let partnerId: string;
  let fixedRuleId: string;
  let percentageRuleId: string;

  beforeAll(async () => {
    const partner = await runtime.createPartner(owner, {
      name: 'Integration Partner',
      email: 'affiliate@example.com',
      code: `integration-${suffix}`,
    });
    partnerId = partner.partnerId;
    fixedRuleId = (
      await runtime.createRule(owner, {
        name: 'Fixed commission',
        model: 'fixed',
        value: '25',
        currency: 'USD',
      })
    ).ruleId;
    percentageRuleId = (
      await runtime.createRule(owner, {
        name: 'Percentage commission',
        model: 'percentage',
        value: '10',
        currency: 'USD',
      })
    ).ruleId;
  });
  afterAll(async () => persistence.close());

  it('allows active members to read but only managers to change Affiliate records', async () => {
    await expect(runtime.listPartners(member)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ partnerId })]),
    );
    await expect(
      Promise.resolve().then(() =>
        runtime.createPartner(member, {
          name: 'Denied',
          email: 'denied@example.com',
          code: `denied-${suffix}`,
        }),
      ),
    ).rejects.toMatchObject<AffiliateAccessError>({ code: 'PERMISSION_DENIED' });
  });

  it('keeps organization-scoped reads isolated', async () => {
    await expect(runtime.listPartners(otherOrganization)).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ partnerId })]),
    );
  });

  it('creates fixed and percentage commissions on conversion', async () => {
    const fixedReferral = await runtime.createReferral(owner, {
      partnerId,
      ruleId: fixedRuleId,
      referredName: 'Fixed Customer',
      currency: 'USD',
    });
    const fixed = await runtime.convertReferral(owner, fixedReferral.referralId, {
      revenueAmount: '125.00',
    });
    expect(fixed.commission.amount).toBe('25.00');

    const percentageReferral = await runtime.createReferral(owner, {
      partnerId,
      ruleId: percentageRuleId,
      referredName: 'Percentage Customer',
      currency: 'USD',
    });
    const percentage = await runtime.convertReferral(owner, percentageReferral.referralId, {
      revenueAmount: '125.00',
    });
    expect(percentage.commission.amount).toBe('12.50');
    expect(percentage.commission.status).toBe('pending');
  });

  it('fails closed for direct runtime-role reads without organization context', async () => {
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    const result = await client.query('select count(*)::int as count from affiliate_partners');
    expect(result.rows[0]?.count).toBe(0);
    await client.end();
  });
});
