# Affiliate MVP implementation plan

## Scope

Implement the first internal-user-only Sales & CRM Affiliate vertical slice. The module supports organization-scoped affiliate partners, referral links, fixed and percentage commission rules, referrals, and commission lifecycle status. External affiliate portals, payment execution, affiliate-network integrations, automated payouts, and production authentication remain out of scope.

## Implementation approach

The module is a bounded application package under the modular monolith. `@business-os/sales-crm-contracts` owns framework-free public types and repository contracts. `@business-os/sales-crm-runtime` owns validation and use-case authorization. `@business-os/persistence-postgres` receives the infrastructure adapter and uses the existing transaction-local organization context and PostgreSQL RLS. The API edge exposes authenticated organization-scoped endpoints and delegates all state changes to the runtime package.

Partners, links, commission rules, referrals, and commissions are separate organization-owned tables in a Sales & CRM migration. Fixed and percentage rules use a shared decimal value with explicit `model` and `currency`; referral conversion creates a pending commission atomically. Only active organization members may read. Owners and admins may create or change Affiliate records; members are read-only. Payout execution is represented only by commission status and is not connected to money movement.

## Project structure

- `packages/sales-crm-contracts`: Affiliate DTOs, enums, repository contract, and actor context.
- `packages/sales-crm-runtime`: Affiliate validation, role checks, conversion calculation, and lifecycle use cases.
- `packages/persistence-postgres/src/affiliate.ts`: PostgreSQL adapter using organization-scoped transactions.
- `infrastructure/database/migrations/sales_crm`: Affiliate tables, constraints, indexes, and RLS policies.
- `packages/api-edge/src/main.ts`: Authenticated Affiliate HTTP routes.
- `tests/unit/affiliate-runtime.test.ts`: Framework-free rules and authorization tests.
- `tests/integration/platform/affiliate.test.ts`: PostgreSQL/RLS integration coverage where the test database is available.
- `docs/SALES-CRM-AFFILIATE.md`: Domain boundary, API, data, permission, and lifecycle documentation.
