# Business OS Delivery Outcomes

## Manus-hosted preview of the bounded Home slice — complete

The existing GitHub repository remains authoritative, the Manus preview runs the repository workspace, and the Home slice preserves local development identity, organization membership authorization, PostgreSQL migrations, RLS tenant isolation, the protected Home API, and the framework-free web surface.

## Portable container deployment package — complete

The repository contains a pinned Node.js/pnpm Dockerfile, production API/web supervisor, configurable API proxy port, unauthenticated `/health` probe, Docker health check, and portable deployment documentation. Manus is configured with the repository Dockerfile and `/health` readiness path; publication remains manual.

## Sales & CRM Affiliate MVP database and API — in progress

- Internal organization users are the first consumer; no external affiliate portal is included.
- Affiliate partners, referral links, fixed and percentage commission rules, referrals, and commission records are organization-scoped and protected by PostgreSQL RLS.
- Active organization members can read Affiliate records. Owners and admins can create and change Affiliate records; members are read-only.
- Converting a referral calculates a commission from a fixed or percentage rule and creates a pending commission atomically.
- API contracts, migration, runtime validation, authorization, and tests must remain portable and repository-owned.
- External affiliate networks, payment execution, automated payouts, production authentication, and unrelated CRM domains remain out of scope.
