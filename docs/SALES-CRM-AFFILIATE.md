# Sales & CRM — Affiliate MVP

## Boundary

Affiliate is the first bounded Sales & CRM application slice. It owns affiliate partners, referral links, referral attribution, commission rules, and the commission ledger. It does not own users, organization membership, permissions, payments, payout execution, communication channels, or external affiliate-network connections.

The module is internal-user-only in this MVP. All records carry `organization_id`; queries use the existing organization context and PostgreSQL RLS. The module uses platform identity and membership contracts and does not create a second identity system.

## Permissions

- `sales-crm.affiliate.read`: available to active organization members.
- `sales-crm.affiliate.manage`: available to organization owners and admins for create and state-changing operations.

The API evaluates the active session and membership on the server. Client role claims and hidden controls are not authorization mechanisms.

## Data model

`affiliate_partners` identifies a partner and its organization-local referral code. `affiliate_links` maps a partner to a destination URL and code. `affiliate_commission_rules` stores either a fixed monetary value or a percentage value in an explicit currency. `affiliate_referrals` stores attribution and conversion revenue. `affiliate_commissions` is an append-oriented ledger entry for a converted referral; one referral may produce at most one commission in this MVP.

Commission amounts are returned as decimal strings to avoid floating-point money errors. A fixed rule uses its `value` directly; a percentage rule calculates `revenue_amount * value / 100`, rounded to two decimal places using decimal arithmetic in PostgreSQL.

## API

All routes require the existing `bos_session` cookie and are organization-scoped:

- `GET /api/v1/crm/affiliates/partners`
- `POST /api/v1/crm/affiliates/partners` — owner/admin
- `GET /api/v1/crm/affiliates/links`
- `POST /api/v1/crm/affiliates/links` — owner/admin
- `GET /api/v1/crm/affiliates/rules`
- `POST /api/v1/crm/affiliates/rules` — owner/admin
- `GET /api/v1/crm/affiliates/referrals`
- `POST /api/v1/crm/affiliates/referrals` — owner/admin
- `POST /api/v1/crm/affiliates/referrals/:id/convert` — owner/admin
- `GET /api/v1/crm/affiliates/commissions`
- `POST /api/v1/crm/affiliates/commissions/:id/status` — owner/admin

Conversion accepts `revenueAmount` and uses the selected referral rule. Commission status transitions support `pending`, `approved`, `rejected`, and `paid`; the API does not transfer money.
