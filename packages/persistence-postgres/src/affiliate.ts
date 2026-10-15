import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import type {
  AffiliateActorContext,
  AffiliateCommission,
  AffiliateCommissionRule,
  AffiliateCommissionStatus,
  AffiliateLink,
  AffiliatePartner,
  AffiliateReferral,
  AffiliateRepository,
  CreateAffiliateLinkInput,
  CreateAffiliatePartnerInput,
  CreateAffiliateReferralInput,
  CreateAffiliateRuleInput,
  ConvertAffiliateReferralInput,
} from '@business-os/sales-crm-contracts';
import type { OrganizationContext } from '@business-os/persistence-contracts';
import { withOrganizationDb, createUuidV7, type PostgresPersistence } from './index.js';

function context(actor: AffiliateActorContext): OrganizationContext {
  return {
    organizationId: actor.organizationId,
    principalId: actor.principalId,
    principalKind: 'human',
    membershipOrCredentialId: actor.principalId,
    authorizationEpoch: 0,
    correlationId: `sales-crm:affiliate:${randomUUID()}`,
    scope: ['sales-crm.affiliate.read', 'sales-crm.affiliate.manage'],
  };
}
function iso(value: Date): string {
  return new Date(value).toISOString();
}
function partner(row: PartnerRow): AffiliatePartner {
  return {
    partnerId: row.partner_id,
    organizationId: row.organization_id,
    name: row.name,
    email: row.email,
    code: row.code,
    status: row.status,
    createdBy: row.created_by,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}
function link(row: LinkRow): AffiliateLink {
  return {
    linkId: row.link_id,
    organizationId: row.organization_id,
    partnerId: row.partner_id,
    code: row.code,
    destinationUrl: row.destination_url,
    status: row.status,
    createdAt: iso(row.created_at),
  };
}
function rule(row: RuleRow): AffiliateCommissionRule {
  return {
    ruleId: row.rule_id,
    organizationId: row.organization_id,
    name: row.name,
    model: row.model,
    value: String(row.value),
    currency: row.currency.trim(),
    active: row.active,
    createdAt: iso(row.created_at),
  };
}
function referral(row: ReferralRow): AffiliateReferral {
  return {
    referralId: row.referral_id,
    organizationId: row.organization_id,
    partnerId: row.partner_id,
    linkId: row.link_id,
    ruleId: row.rule_id,
    externalReference: row.external_reference,
    referredName: row.referred_name,
    referredEmail: row.referred_email,
    status: row.status,
    revenueAmount: String(row.revenue_amount),
    currency: row.currency.trim(),
    convertedAt: row.converted_at ? iso(row.converted_at) : null,
    createdAt: iso(row.created_at),
  };
}
function commission(row: CommissionRow): AffiliateCommission {
  return {
    commissionId: row.commission_id,
    organizationId: row.organization_id,
    referralId: row.referral_id,
    ruleId: row.rule_id,
    amount: String(row.amount),
    currency: row.currency.trim(),
    status: row.status,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

interface PartnerRow {
  partner_id: string;
  organization_id: string;
  name: string;
  email: string;
  code: string;
  status: AffiliatePartner['status'];
  created_by: string;
  created_at: Date;
  updated_at: Date;
}
interface LinkRow {
  link_id: string;
  organization_id: string;
  partner_id: string;
  code: string;
  destination_url: string;
  status: AffiliateLink['status'];
  created_at: Date;
}
interface RuleRow {
  rule_id: string;
  organization_id: string;
  name: string;
  model: AffiliateCommissionRule['model'];
  value: string;
  currency: string;
  active: boolean;
  created_at: Date;
}
interface ReferralRow {
  referral_id: string;
  organization_id: string;
  partner_id: string;
  link_id: string | null;
  rule_id: string;
  external_reference: string | null;
  referred_name: string;
  referred_email: string | null;
  status: AffiliateReferral['status'];
  revenue_amount: string;
  currency: string;
  converted_at: Date | null;
  created_at: Date;
}
interface CommissionRow {
  commission_id: string;
  organization_id: string;
  referral_id: string;
  rule_id: string;
  amount: string;
  currency: string;
  status: AffiliateCommissionStatus;
  created_at: Date;
  updated_at: Date;
}

export class PostgresAffiliateRepository implements AffiliateRepository {
  public constructor(private readonly persistence: PostgresPersistence) {}
  public async listPartners(actor: AffiliateActorContext): Promise<readonly AffiliatePartner[]> {
    const result = await withOrganizationDb(this.persistence, context(actor), (db) =>
      sql<PartnerRow>`select * from affiliate_partners where organization_id = ${actor.organizationId} order by created_at desc`.execute(
        db,
      ),
    );
    return result.rows.map(partner);
  }
  public async createPartner(
    actor: AffiliateActorContext,
    input: CreateAffiliatePartnerInput,
  ): Promise<AffiliatePartner> {
    const id = createUuidV7();
    const result = await withOrganizationDb(this.persistence, context(actor), (db) =>
      sql<PartnerRow>`insert into affiliate_partners (partner_id, organization_id, name, email, code, created_by) values (${id}, ${actor.organizationId}, ${input.name}, ${input.email}, ${input.code}, ${actor.principalId}) returning *`.execute(
        db,
      ),
    );
    return partner(result.rows[0]!);
  }
  public async listLinks(actor: AffiliateActorContext): Promise<readonly AffiliateLink[]> {
    const result = await withOrganizationDb(this.persistence, context(actor), (db) =>
      sql<LinkRow>`select * from affiliate_links where organization_id = ${actor.organizationId} order by created_at desc`.execute(
        db,
      ),
    );
    return result.rows.map(link);
  }
  public async createLink(
    actor: AffiliateActorContext,
    input: CreateAffiliateLinkInput,
  ): Promise<AffiliateLink> {
    const id = createUuidV7();
    const result = await withOrganizationDb(this.persistence, context(actor), (db) =>
      sql<LinkRow>`insert into affiliate_links (link_id, organization_id, partner_id, code, destination_url) select ${id}, ${actor.organizationId}, partner_id, ${input.code}, ${input.destinationUrl} from affiliate_partners where partner_id = ${input.partnerId} and organization_id = ${actor.organizationId} returning affiliate_links.*`.execute(
        db,
      ),
    );
    if (!result.rows[0]) throw new Error('Affiliate partner was not found');
    return link(result.rows[0]);
  }
  public async listRules(
    actor: AffiliateActorContext,
  ): Promise<readonly AffiliateCommissionRule[]> {
    const result = await withOrganizationDb(this.persistence, context(actor), (db) =>
      sql<RuleRow>`select * from affiliate_commission_rules where organization_id = ${actor.organizationId} order by created_at desc`.execute(
        db,
      ),
    );
    return result.rows.map(rule);
  }
  public async createRule(
    actor: AffiliateActorContext,
    input: CreateAffiliateRuleInput,
  ): Promise<AffiliateCommissionRule> {
    const id = createUuidV7();
    const result = await withOrganizationDb(this.persistence, context(actor), (db) =>
      sql<RuleRow>`insert into affiliate_commission_rules (rule_id, organization_id, name, model, value, currency) values (${id}, ${actor.organizationId}, ${input.name}, ${input.model}, ${input.value}, ${input.currency}) returning *`.execute(
        db,
      ),
    );
    return rule(result.rows[0]!);
  }
  public async listReferrals(actor: AffiliateActorContext): Promise<readonly AffiliateReferral[]> {
    const result = await withOrganizationDb(this.persistence, context(actor), (db) =>
      sql<ReferralRow>`select * from affiliate_referrals where organization_id = ${actor.organizationId} order by created_at desc`.execute(
        db,
      ),
    );
    return result.rows.map(referral);
  }
  public async createReferral(
    actor: AffiliateActorContext,
    input: CreateAffiliateReferralInput,
  ): Promise<AffiliateReferral> {
    const id = createUuidV7();
    const result = await withOrganizationDb(this.persistence, context(actor), (db) =>
      sql<ReferralRow>`insert into affiliate_referrals (referral_id, organization_id, partner_id, link_id, rule_id, external_reference, referred_name, referred_email, currency) select ${id}, ${actor.organizationId}, p.partner_id, l.link_id, r.rule_id, ${input.externalReference ?? null}, ${input.referredName}, ${input.referredEmail ?? null}, ${input.currency} from affiliate_partners p join affiliate_commission_rules r on r.rule_id = ${input.ruleId} and r.organization_id = p.organization_id and r.active = true left join affiliate_links l on l.link_id = ${input.linkId ?? null} and l.partner_id = p.partner_id and l.organization_id = p.organization_id where p.partner_id = ${input.partnerId} and p.organization_id = ${actor.organizationId} returning affiliate_referrals.*`.execute(
        db,
      ),
    );
    if (!result.rows[0]) throw new Error('Affiliate partner, link, or active rule was not found');
    return referral(result.rows[0]);
  }
  public async convertReferral(
    actor: AffiliateActorContext,
    referralId: string,
    input: ConvertAffiliateReferralInput,
  ): Promise<{ referral: AffiliateReferral; commission: AffiliateCommission }> {
    const result = await withOrganizationDb(this.persistence, context(actor), async (db) => {
      const updated =
        await sql<ReferralRow>`update affiliate_referrals set status = 'converted', revenue_amount = ${input.revenueAmount}, converted_at = CURRENT_TIMESTAMP where referral_id = ${referralId} and organization_id = ${actor.organizationId} and status = 'lead' returning *`.execute(
          db,
        );
      const row = updated.rows[0];
      if (!row) throw new Error('Referral was not found or is no longer a lead');
      const commissionId = createUuidV7();
      const created =
        await sql<CommissionRow>`insert into affiliate_commissions (commission_id, organization_id, referral_id, rule_id, amount, currency) select ${commissionId}, r.organization_id, r.referral_id, r.rule_id, case when cr.model = 'fixed' then cr.value else round(${input.revenueAmount}::numeric * cr.value / 100, 2) end, r.currency from affiliate_referrals r join affiliate_commission_rules cr on cr.rule_id = r.rule_id and cr.organization_id = r.organization_id where r.referral_id = ${referralId} and r.organization_id = ${actor.organizationId} and cr.active = true returning *`.execute(
          db,
        );
      if (!created.rows[0]) throw new Error('Commission rule was not found or is inactive');
      return { referral: referral(row), commission: commission(created.rows[0]) };
    });
    return result;
  }
  public async listCommissions(
    actor: AffiliateActorContext,
  ): Promise<readonly AffiliateCommission[]> {
    const result = await withOrganizationDb(this.persistence, context(actor), (db) =>
      sql<CommissionRow>`select * from affiliate_commissions where organization_id = ${actor.organizationId} order by created_at desc`.execute(
        db,
      ),
    );
    return result.rows.map(commission);
  }
  public async updateCommissionStatus(
    actor: AffiliateActorContext,
    commissionId: string,
    status: AffiliateCommissionStatus,
  ): Promise<AffiliateCommission> {
    const result = await withOrganizationDb(this.persistence, context(actor), (db) =>
      sql<CommissionRow>`update affiliate_commissions set status = ${status}, updated_at = CURRENT_TIMESTAMP where commission_id = ${commissionId} and organization_id = ${actor.organizationId} returning *`.execute(
        db,
      ),
    );
    if (!result.rows[0]) throw new Error('Commission was not found');
    return commission(result.rows[0]);
  }
}
