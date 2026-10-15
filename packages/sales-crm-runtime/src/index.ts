import type { Role } from '@business-os/platform-contracts';
import type {
  AffiliateActorContext,
  AffiliateCommission,
  AffiliateCommissionStatus,
  AffiliateLink,
  AffiliatePartner,
  AffiliateReferral,
  AffiliateRepository,
  AffiliateCommissionRule,
  CreateAffiliateLinkInput,
  CreateAffiliatePartnerInput,
  CreateAffiliateReferralInput,
  CreateAffiliateRuleInput,
  ConvertAffiliateReferralInput,
} from '@business-os/sales-crm-contracts';

export class AffiliateAccessError extends Error {
  public constructor(
    public readonly code: 'PERMISSION_DENIED' | 'VALIDATION_FAILED' | 'NOT_FOUND',
    message: string,
  ) {
    super(message);
    this.name = 'AffiliateAccessError';
  }
}

const MANAGER_ROLES: readonly Role[] = ['owner', 'admin'];
const CURRENCY = /^[A-Z]{3}$/;
const DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

function required(value: string | undefined, field: string): string {
  const normalized = value?.trim() ?? '';
  if (!normalized) throw new AffiliateAccessError('VALIDATION_FAILED', `${field} is required`);
  return normalized;
}
function decimal(value: string | undefined, field: string): string {
  const normalized = required(value, field);
  if (!DECIMAL.test(normalized) || Number(normalized) <= 0)
    throw new AffiliateAccessError(
      'VALIDATION_FAILED',
      `${field} must be a positive decimal with up to two decimals`,
    );
  return normalized;
}
function currency(value: string | undefined): string {
  const normalized = required(value, 'currency').toUpperCase();
  if (!CURRENCY.test(normalized))
    throw new AffiliateAccessError(
      'VALIDATION_FAILED',
      'currency must be a three-letter uppercase code',
    );
  return normalized;
}
function email(value: string | undefined, field: string, optional = false): string | undefined {
  const normalized = value?.trim() ?? '';
  if (!normalized && optional) return undefined;
  if (!normalized || !normalized.includes('@'))
    throw new AffiliateAccessError('VALIDATION_FAILED', `${field} must be a valid email`);
  return normalized;
}
function code(value: string | undefined, field: string): string {
  const normalized = required(value, field).toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{2,39}$/.test(normalized))
    throw new AffiliateAccessError(
      'VALIDATION_FAILED',
      `${field} must be 3-40 lowercase letters, numbers, underscores, or hyphens`,
    );
  return normalized;
}
function manager(actor: AffiliateActorContext): void {
  if (!MANAGER_ROLES.includes(actor.role))
    throw new AffiliateAccessError(
      'PERMISSION_DENIED',
      'Affiliate management requires an owner or admin role',
    );
}

export class AffiliateRuntime {
  public constructor(private readonly repository: AffiliateRepository) {}

  public listPartners(actor: AffiliateActorContext): Promise<readonly AffiliatePartner[]> {
    return this.repository.listPartners(actor);
  }
  public createPartner(
    actor: AffiliateActorContext,
    input: CreateAffiliatePartnerInput,
  ): Promise<AffiliatePartner> {
    manager(actor);
    return this.repository.createPartner(actor, {
      name: required(input.name, 'name'),
      email: email(input.email, 'email') as string,
      code: code(input.code, 'code'),
    });
  }
  public listLinks(actor: AffiliateActorContext): Promise<readonly AffiliateLink[]> {
    return this.repository.listLinks(actor);
  }
  public createLink(
    actor: AffiliateActorContext,
    input: CreateAffiliateLinkInput,
  ): Promise<AffiliateLink> {
    manager(actor);
    const destinationUrl = required(input.destinationUrl, 'destinationUrl');
    if (!/^https?:\/\//.test(destinationUrl))
      throw new AffiliateAccessError('VALIDATION_FAILED', 'destinationUrl must use http or https');
    return this.repository.createLink(actor, {
      partnerId: required(input.partnerId, 'partnerId'),
      code: code(input.code, 'code'),
      destinationUrl,
    });
  }
  public listRules(actor: AffiliateActorContext): Promise<readonly AffiliateCommissionRule[]> {
    return this.repository.listRules(actor);
  }
  public createRule(
    actor: AffiliateActorContext,
    input: CreateAffiliateRuleInput,
  ): Promise<AffiliateCommissionRule> {
    manager(actor);
    const value = decimal(input.value, 'value');
    if (input.model === 'percentage' && Number(value) > 100)
      throw new AffiliateAccessError('VALIDATION_FAILED', 'percentage value cannot exceed 100');
    if (input.model !== 'fixed' && input.model !== 'percentage')
      throw new AffiliateAccessError('VALIDATION_FAILED', 'model must be fixed or percentage');
    return this.repository.createRule(actor, {
      name: required(input.name, 'name'),
      model: input.model,
      value,
      currency: currency(input.currency),
    });
  }
  public listReferrals(actor: AffiliateActorContext): Promise<readonly AffiliateReferral[]> {
    return this.repository.listReferrals(actor);
  }
  public createReferral(
    actor: AffiliateActorContext,
    input: CreateAffiliateReferralInput,
  ): Promise<AffiliateReferral> {
    manager(actor);
    return this.repository.createReferral(actor, {
      partnerId: required(input.partnerId, 'partnerId'),
      linkId: input.linkId?.trim() || undefined,
      ruleId: required(input.ruleId, 'ruleId'),
      externalReference: input.externalReference?.trim() || undefined,
      referredName: required(input.referredName, 'referredName'),
      referredEmail: email(input.referredEmail, 'referredEmail', true),
      currency: currency(input.currency),
    });
  }
  public convertReferral(
    actor: AffiliateActorContext,
    referralId: string,
    input: ConvertAffiliateReferralInput,
  ): Promise<{ referral: AffiliateReferral; commission: AffiliateCommission }> {
    manager(actor);
    return this.repository.convertReferral(actor, required(referralId, 'referralId'), {
      revenueAmount: decimal(input.revenueAmount, 'revenueAmount'),
    });
  }
  public listCommissions(actor: AffiliateActorContext): Promise<readonly AffiliateCommission[]> {
    return this.repository.listCommissions(actor);
  }
  public updateCommissionStatus(
    actor: AffiliateActorContext,
    commissionId: string,
    status: AffiliateCommissionStatus,
  ): Promise<AffiliateCommission> {
    manager(actor);
    if (!['pending', 'approved', 'rejected', 'paid'].includes(status))
      throw new AffiliateAccessError('VALIDATION_FAILED', 'Invalid commission status');
    return this.repository.updateCommissionStatus(
      actor,
      required(commissionId, 'commissionId'),
      status,
    );
  }
}
