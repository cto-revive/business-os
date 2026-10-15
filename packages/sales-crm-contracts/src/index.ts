import type { Role } from '@business-os/platform-contracts';

export type AffiliatePartnerStatus = 'pending' | 'active' | 'paused' | 'archived';
export type AffiliateLinkStatus = 'active' | 'paused';
export type AffiliateCommissionModel = 'fixed' | 'percentage';
export type AffiliateReferralStatus = 'lead' | 'converted' | 'rejected';
export type AffiliateCommissionStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface AffiliateActorContext {
  readonly organizationId: string;
  readonly principalId: string;
  readonly role: Role;
}

export interface AffiliatePartner {
  readonly partnerId: string;
  readonly organizationId: string;
  readonly name: string;
  readonly email: string;
  readonly code: string;
  readonly status: AffiliatePartnerStatus;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AffiliateLink {
  readonly linkId: string;
  readonly organizationId: string;
  readonly partnerId: string;
  readonly code: string;
  readonly destinationUrl: string;
  readonly status: AffiliateLinkStatus;
  readonly createdAt: string;
}

export interface AffiliateCommissionRule {
  readonly ruleId: string;
  readonly organizationId: string;
  readonly name: string;
  readonly model: AffiliateCommissionModel;
  readonly value: string;
  readonly currency: string;
  readonly active: boolean;
  readonly createdAt: string;
}

export interface AffiliateReferral {
  readonly referralId: string;
  readonly organizationId: string;
  readonly partnerId: string;
  readonly linkId: string | null;
  readonly ruleId: string;
  readonly externalReference: string | null;
  readonly referredName: string;
  readonly referredEmail: string | null;
  readonly status: AffiliateReferralStatus;
  readonly revenueAmount: string;
  readonly currency: string;
  readonly convertedAt: string | null;
  readonly createdAt: string;
}

export interface AffiliateCommission {
  readonly commissionId: string;
  readonly organizationId: string;
  readonly referralId: string;
  readonly ruleId: string;
  readonly amount: string;
  readonly currency: string;
  readonly status: AffiliateCommissionStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateAffiliatePartnerInput {
  readonly name: string;
  readonly email: string;
  readonly code: string;
}
export interface CreateAffiliateLinkInput {
  readonly partnerId: string;
  readonly code: string;
  readonly destinationUrl: string;
}
export interface CreateAffiliateRuleInput {
  readonly name: string;
  readonly model: AffiliateCommissionModel;
  readonly value: string;
  readonly currency: string;
}
export interface CreateAffiliateReferralInput {
  readonly partnerId: string;
  readonly linkId?: string | undefined;
  readonly ruleId: string;
  readonly externalReference?: string | undefined;
  readonly referredName: string;
  readonly referredEmail?: string | undefined;
  readonly currency: string;
}
export interface ConvertAffiliateReferralInput {
  readonly revenueAmount: string;
}

export interface AffiliateRepository {
  listPartners(actor: AffiliateActorContext): Promise<readonly AffiliatePartner[]>;
  createPartner(
    actor: AffiliateActorContext,
    input: CreateAffiliatePartnerInput,
  ): Promise<AffiliatePartner>;
  listLinks(actor: AffiliateActorContext): Promise<readonly AffiliateLink[]>;
  createLink(actor: AffiliateActorContext, input: CreateAffiliateLinkInput): Promise<AffiliateLink>;
  listRules(actor: AffiliateActorContext): Promise<readonly AffiliateCommissionRule[]>;
  createRule(
    actor: AffiliateActorContext,
    input: CreateAffiliateRuleInput,
  ): Promise<AffiliateCommissionRule>;
  listReferrals(actor: AffiliateActorContext): Promise<readonly AffiliateReferral[]>;
  createReferral(
    actor: AffiliateActorContext,
    input: CreateAffiliateReferralInput,
  ): Promise<AffiliateReferral>;
  convertReferral(
    actor: AffiliateActorContext,
    referralId: string,
    input: ConvertAffiliateReferralInput,
  ): Promise<{ referral: AffiliateReferral; commission: AffiliateCommission }>;
  listCommissions(actor: AffiliateActorContext): Promise<readonly AffiliateCommission[]>;
  updateCommissionStatus(
    actor: AffiliateActorContext,
    commissionId: string,
    status: AffiliateCommissionStatus,
  ): Promise<AffiliateCommission>;
}
