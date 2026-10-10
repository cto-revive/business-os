# Business OS — Product Readiness Milestone Decision

**Decision:** Final authorization for bounded milestone / pre-implementation checks required
**Milestone:** Product Readiness and First Usable Screen
**Approval source:** Project-owner instruction received 2026-10-11
**Baseline:** `docs/CURRENT-STATUS-REPORT.md` and `docs/PRODUCT-READINESS-PLAN.md`

## 1. Approval and authority

The project owner approved the proposed Product Readiness and First Usable Screen milestone in principle, subject to the controls and boundaries recorded below.

This record authorizes work only within the first protected Home-screen milestone. It does not authorize G-005 executable plugin work or any G-006 through G-010 implementation. It does not select a production authentication provider, provider SDK, external callback model, or production deployment topology.

The project owner subsequently resolved the milestone decisions in the final authorization instruction received 2026-10-11. Implementation may proceed only within this bounded scope and only after the pre-implementation checks in Section 8 are complete.

## 2. Exact approved milestone scope

The approved milestone is a first functioning, authenticated, organization-scoped Business OS Home screen with automated security tests, documented local setup, and a verified standard-infrastructure staging deployment path.

The milestone includes only:

1. Provider-neutral identity contracts and normalized authentication/session boundaries.
2. Internal user identity persistence and external-identity linkage contracts.
3. Organization persistence and explicit organization membership.
4. Membership lifecycle, role assignment, permission evaluation, authorization epoch, and revocation behavior.
5. Server-side tenant context propagation and PostgreSQL RLS enforcement using the non-owner runtime role.
6. A protected, read-only `GET /api/v1/home` API contract and implementation.
7. A minimum frontend Home route that displays authenticated user, active organization, membership role, and approved organization-scoped workspace data.
8. Deterministic local development identity/session fixtures that cannot be enabled in production.
9. PostgreSQL-backed migration, integration, security, negative authorization, tenant-isolation, and end-to-end tests.
10. Local setup documentation and a standard-infrastructure staging deployment path.

The milestone excludes all product applications beyond the Home/workspace shell, write-oriented business workflows, external business integrations, AI, automation, file storage, marketplace behavior, plugins, and later gated work.

## 3. Mandatory controls

The implementation must:

- Preserve the approved G-002 identity and authorization contract.
- Keep identity and infrastructure interfaces provider-neutral.
- Avoid production authentication-provider selection unless authorized under G-007 or an explicit recorded amendment.
- Use server-side authentication, organization selection, membership checks, and authorization.
- Enforce deny-by-default behavior.
- Enforce organization isolation in repositories and PostgreSQL RLS.
- Use the non-owner runtime database role for application access.
- Keep migrations version-controlled and repository-owned.
- Keep the modular-monolith package boundaries intact.
- Remain operable with standard Node.js, pnpm, PostgreSQL, and standard infrastructure without Manus runtime services.
- Require PostgreSQL-backed integration and security tests to execute in the milestone validation environment.
- Report skipped tests as skipped; a skipped test cannot count as passing.
- Report each phase’s changes, tests, security evidence, and remaining blockers.
- Claim milestone completion only after every acceptance criterion passes.

## 4. Dependency order authorized for planning and, after Section 6 is resolved, implementation

1. Resolve the decisions in Section 6.
2. Implement framework-free identity, organization, membership, role, permission, session, and Home contracts.
3. Implement repository-owned identity, organization, membership, and minimum Home persistence migrations through G-003 boundaries.
4. Implement provider-neutral authentication/session composition and the development-only identity fixture.
5. Implement server-side authorization, authorization epoch, revocation, and organization-context propagation.
6. Implement protected `GET /api/v1/home`.
7. Implement the minimum frontend Home route and error states.
8. Add and execute PostgreSQL-backed integration, security, negative authorization, tenant-isolation, and end-to-end tests.
9. Document local setup and standard-infrastructure staging deployment prerequisites.
10. Validate the complete milestone and record evidence before declaring completion.

## 5. Governance exclusions

The following remain explicitly outside this authorization:

- G-005 plugin contracts, plugin runtime, plugin migrations, plugin SDK, executable plugins, and marketplace functionality.
- G-006 AI runtime or model-provider work.
- G-007 integrations and business-provider credential storage. Production authentication-provider selection remains a G-007 decision unless separately amended.
- G-008 storage/files work.
- G-009 production deployment topology and production operations beyond the standard-infrastructure staging path required for this milestone.
- G-010 entitlements, application installation, templates, themes, and marketplace governance.
- CRM, Commerce, Finance, Marketing, Operations, People, Work, Service, Automation, and AI product modules.
- Any competing authorization, audit, persistence, queue, scheduler, or plugin execution system.

## 6. Final decisions recorded before coding

The final project-owner authorization resolved the milestone decisions as follows:

| Decision area | Authorized choice |
|---|---|
| Frontend architecture | Separate `apps/web` application in the repository; the first slice uses a framework-free static surface unless a dependency change is separately documented. |
| Home API | Versioned `GET /api/v1/home` with `organization: { id, name }`, `viewer: { userId, displayName, role }`, and `workspace: { itemCount, items }`. |
| Home data | Deterministic repository-owned development seed data plus a proper empty state; `itemCount` represents the total number of returned items; the initial item shape is limited to the fields required by the screen, initially `id` and `title`. |
| Error contract | Stable machine-readable errors: `401` for no valid session, `403` for missing membership or permission, and `500` for unexpected server failure; safe messages only. |
| Roles | `owner`, `admin`, and `member`; all active members may read Home only through the server-side `platform.home.read` permission. |
| Membership lifecycle | `active`, `suspended`, and `revoked`; only active memberships may authorize access. |
| Sessions | Opaque server-side sessions using secure cookies, with appropriate SameSite policy, CSRF protection, login/switch rotation, logout, revocation, and authorization-epoch invalidation. |
| Development authentication | Deterministic development-only identity/session fixture, impossible to enable in staging or production through an accidental default. |
| Staging/production authentication | Deferred to G-007 or an explicit recorded governance amendment; no provider, SDK, callback model, or production authentication implementation is selected by this milestone. |

These choices are the implementation baseline. Non-critical details may follow repository conventions when documented before introduction and when they do not expand the approved scope or weaken the security controls.

## 7. Acceptance evidence required

Before milestone completion is declared, the repository must contain and CI must execute evidence for:

- Authenticated and unauthenticated Home access.
- Missing-membership and insufficient-permission denial.
- Suspended/revoked membership denial.
- Authorization-epoch invalidation.
- Cross-organization read and write denial.
- Missing and mismatched organization-context denial.
- Forced RLS behavior under the non-owner runtime role.
- Migration application and clean-schema verification.
- Deterministic fixture setup and reset.
- Protected API response contract.
- Frontend success, loading, empty, unauthorized, and failure states.
- Local startup from documented standard tools.
- Staging deployment path, if staging authentication is separately authorized.

## 8. Current status

- Approval: **granted in principle, subject to controls**.
- Exact milestone scope: **recorded**.
- G-005 and later-gate exclusions: **recorded**.
- Documentation reconciliation: **complete**.
- Implementation authorization: **granted for the bounded milestone; pre-implementation checks required**.
- Product source implementation: **not started**.

## 9. Final authorization addendum

The final project-owner authorization confirms the following decisions:

- Frontend architecture: `apps/web` as a separate repository application.
- Home API: versioned `GET /api/v1/home` with `organization`, `viewer`, and `workspace` fields as specified in this record.
- Roles: `owner`, `admin`, and `member`; all active members may read Home through the `platform.home.read` permission.
- Membership lifecycle: `active`, `suspended`, and `revoked`.
- Sessions: opaque server-side sessions using secure cookies, with rotation, CSRF protection, revocation, and authorization-epoch handling.
- Authentication: deterministic development-only identity/session fixture; production and staging provider selection remain deferred to G-007 or an explicit governance amendment.
- PostgreSQL integration, RLS, runtime-role, security, and tenant-isolation tests must execute for milestone acceptance; skipped tests do not count as passing.

For the first slice, non-critical implementation details may follow repository conventions if documented before introduction. The frontend implementation will use a framework-free static `apps/web` surface unless a dependency change is separately documented; the Home item sub-schema will be limited to the fields required by the approved screen and versioned contract.

The milestone is authorized within these boundaries. It must not be described as production-ready while staging/production authentication remains deferred.
