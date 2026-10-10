# Business OS — Product Readiness and First Usable Screen Plan

**Status:** AUTHORIZED FOR BOUNDED MILESTONE / PRE-IMPLEMENTATION CHECKS REQUIRED
**Approval record:** `docs/PRODUCT-READINESS-DECISION.md`
**Baseline:** `docs/CURRENT-STATUS-REPORT.md`, assessed 2026-10-11
**Repository:** `cto-revive/business-os`
**Target milestone:** First protected, organization-scoped Business OS Home screen

## 1. Purpose and governance boundary

This document proposes the dependency-ordered work required to move Business OS from a validated foundation to its first usable vertical slice: an authenticated user entering an organization workspace and viewing a protected Business OS Home screen.

This is a planning document, not implementation authorization. No identity provider, identity tables, authorization engine, product module, frontend application, or deployment configuration should be implemented until this plan is reviewed and the required governance approval is recorded.

The existing repository status is:

- G-001: closed for the repository runtime foundation.
- G-002: approved as the identity and authorization contract, but its concrete implementation is not yet present.
- G-003: closed, approved, implemented, and verified for the PostgreSQL persistence foundation.
- G-004: approved, implemented, and verified for durable execution within its decision closure.
- G-005: architecture-approved and implementation-plan-only. No plugin runtime, plugin SDK, plugin migration, executable plugin, or marketplace implementation is in scope.
- G-006 through G-010: pending.

The first Home screen plan must consume the existing G-003 and G-004 boundaries. It must not create a competing authorization, persistence, queue, audit, or plugin system.

## 2. Proposed first-slice outcome

The milestone is complete when a developer can start the standard infrastructure locally, authenticate a test user, select an organization to which that user belongs, and load a Home screen that displays organization-scoped data through a protected API.

The first screen should deliberately be small. It should show:

1. The authenticated user’s identity summary.
2. The active organization’s name and identifier.
3. A small set of organization-scoped workspace facts, such as organization name, membership role, and a count or list of seeded workspace items.
4. Clear loading, empty, unauthorized, and unavailable states.
5. A sign-out action and an organization-switching path only if the user has more than one active membership.

The screen must not imply that CRM, Finance, Automation, AI, Plugins, or other planned applications exist. Navigation may show planned areas as unavailable or omit them entirely.

## 3. Dependency-ordered implementation plan

### Phase 0 — Governance approval and scope lock

Before source implementation begins, the maintainer and dev team should approve:

- This plan and its acceptance criteria.
- The identity-provider integration approach for production. The contract remains OIDC/provider-neutral; provider/vendor selection and external callback details remain deferred to G-007 or require an explicit recorded amendment to the approved decision records.
- The first Home data model and the organization-membership role vocabulary.
- The decision that the first slice is a protected platform/workspace surface, not a business application.
- The migration naming and ownership convention for identity, organization, membership, and Home data.
- The explicit exclusion of G-005 runtime work and all later gated work.

Approval should be recorded in a repository decision record or an explicit maintainer approval entry before Phase 1 starts.

### Phase 1 — Contract and domain design

Define framework-free contracts first. These contracts must not import NestJS, browser libraries, PostgreSQL, Kysely, `pg`, an OIDC SDK, or a concrete frontend framework.

Required concepts:

- `UserIdentity`: stable internal user ID, provider subject reference, display name, email metadata, lifecycle state, and timestamps.
- `Organization`: stable organization ID, name, lifecycle state, and timestamps.
- `OrganizationMembership`: user ID, organization ID, role, membership state, authorization epoch, and timestamps.
- `AuthenticationPrincipal`: normalized provider-neutral principal derived from a validated external identity.
- `RequestIdentityContext`: principal, correlation ID, authentication assurance, and session metadata.
- `OrganizationRequestContext`: authenticated principal plus one selected active organization and membership snapshot.
- `AuthorizationDecision`: allow/deny, policy basis, required permission, and authorization epoch.
- `Permission` and `Role`: stable namespaced permission identifiers and role-to-permission mapping owned by the platform authorization boundary.
- `HomeWorkspaceSummary`: only the fields the Home screen is authorized to display.

Required ports:

- `IdentityProviderPort`: validate a provider-issued identity assertion or session and return normalized subject claims. The port must not expose provider SDK types.
- `SessionPort`: create, validate, rotate, and revoke application sessions without exposing raw provider tokens to domain modules.
- `OrganizationRepository` and `MembershipRepository`: framework-free organization and membership reads/writes.
- `AuthorizationPort`: evaluate an action against the principal, organization, membership, permission, target, and current authorization epoch.
- `HomeWorkspaceQuery`: return the organization-scoped Home summary only after authorization and persistence scope establishment.

Authorization must be deny-by-default. A valid login alone must not authorize access to an organization. An active membership and an explicit permission are required.

### Phase 2 — Identity and organization persistence

Add repository-owned migrations and PostgreSQL adapter implementations for the minimum identity model. The database remains owned by the existing persistence boundary; domain packages must not receive a database handle.

Minimum records:

- `users` or equivalent internal identity table.
- `external_identities` with provider name, immutable subject, user reference, and uniqueness constraints.
- `organizations`.
- `organization_memberships` with user, organization, role, state, and authorization epoch.
- `sessions` or an equivalent revocable session record, if server-side session revocation is selected.
- One minimal Home-owned table or seeded workspace record only if the screen needs persistent organization data.

Required constraints:

- Unique external identity per provider and subject.
- Unique active membership per user and organization.
- Explicit lifecycle states for users, organizations, memberships, and sessions.
- Foreign keys and restrictive deletion behavior for auditability.
- `organization_id` on every organization-owned record.
- No nullable organization scope unless the record is explicitly platform-global and accessed only through platform scope.
- Authorization epoch increments on membership revocation, role change, or other authority invalidation.

Required PostgreSQL behavior:

- Organization-owned tables use forced RLS.
- Tenant policies fail closed when organization context is absent or mismatched.
- Runtime access uses a non-owner application role.
- Organization context is set transaction-locally by the existing G-003 adapter.
- Session and membership reads cannot be used to bypass the active organization scope.

### Phase 3 — Authentication and request-context composition

Implement the authentication composition root at the delivery edge, while keeping identity semantics in framework-free packages.

Production requirements:

- Use a standards-based OIDC/OAuth adapter behind `IdentityProviderPort`. Selecting a production provider/vendor or external callback model requires G-007 authorization or an explicit recorded amendment; this plan does not make that selection.
- Validate issuer, audience, signature, expiry, nonce/state where applicable, and required assurance level.
- Map external subject to an internal user; do not use email as the stable identity key.
- Establish an application session with secure, HttpOnly, SameSite-appropriate cookies or an equivalent documented mechanism.
- Rotate and revoke sessions according to the selected session model.
- Never expose provider refresh tokens, client secrets, or session signing keys to frontend code.
- Establish a correlation ID for every request.

Local development requirements:

- Provide a deterministic development identity/session fixture only under an explicit development configuration.
- Ensure the development fixture cannot be enabled in production through a missing or default environment variable.
- Provide a documented local login path that still passes through the same normalized principal and membership/authorization pipeline.

The request pipeline must resolve, in order:

1. Authentication validity.
2. Internal user identity.
3. Active organization selection.
4. Membership status and role.
5. Current authorization epoch.
6. Required permission for the requested operation.
7. Organization-scoped persistence context.

Missing authentication returns `401`. A valid user without an active membership returns `403`. A missing or invalid organization selection returns `403` or a documented `404` that does not disclose organization existence. Cross-organization access must never fall through to an empty or platform scope.

### Phase 4 — Authorization and protected Home API

Implement one protected, read-only Home query as the first vertical API slice.

Proposed endpoint:

```text
GET /api/v1/home
```

Required behavior:

- Require an authenticated principal.
- Require an explicit active organization context, supplied by a validated session selection or a documented header/route mechanism.
- Resolve membership server-side; never trust a client-provided role or organization name.
- Authorize a stable permission such as `platform.home.read`.
- Open the organization-scoped persistence scope only after authorization context is validated.
- Query only fields required by the Home screen.
- Include correlation metadata in logs and audit records without exposing secrets.
- Return a stable versioned response contract.
- Avoid revealing whether another organization exists when access is denied.

The API must not expose generic table reads, raw SQL, provider claims, internal authorization details, or database error messages.

A successful request should return a response shaped conceptually like:

```json
{
  "organization": {
    "id": "org-id",
    "name": "Example Organization"
  },
  "viewer": {
    "userId": "user-id",
    "displayName": "Example User",
    "role": "owner"
  },
  "workspace": {
    "itemCount": 0,
    "items": []
  }
}
```

For the first slice, `items` will use the minimum documented item shape required by the screen (initially `id` and `title`), and `itemCount` will represent the total number of returned items. The exact response contract must be versioned and documented before the endpoint implementation is introduced.

### Phase 5 — Minimum frontend architecture

Add a frontend experience surface without moving domain rules into the browser.

Proposed shape:

- A new `apps/web` or equivalent web package owned by the experience surface.
- A small browser application using a standard framework selected during approval.
- API client types generated or manually maintained from the versioned public Home contract.
- No direct database access, provider SDK, authorization policy, or secret in the browser.
- Authentication handled through the API/session boundary.
- Organization context displayed from the server response, not inferred from editable client state.
- Components for authenticated loading, unauthorized, empty, error, and success states.
- A minimal organization selector only when the server reports multiple active memberships.

The first implementation will use a framework-free static `apps/web` surface with one route, such as `/home`; it will use browser APIs and repository-owned assets rather than introducing a frontend framework dependency. It should redirect unauthenticated users to the local development login/session flow. It should not implement product navigation or plugin/UI extension points.

### Phase 6 — Automated verification and security acceptance

All new behavior must be covered before the screen is called usable. Tests must run from the repository with standard dependencies and must not require Manus services.

#### Contract and unit tests

- Normalize an external identity into the same internal user on repeated login.
- Reject invalid issuer, audience, signature, expiry, nonce, and missing required claims.
- Reject an identity whose external subject is not linked to an active internal user.
- Resolve an active membership and role deterministically.
- Deny a suspended or revoked membership.
- Increment and enforce authorization epoch after role or membership revocation.
- Confirm role/permission mappings are deny-by-default.
- Confirm Home response contains no provider token, secret, or unauthorized fields.
- Confirm request context cannot be constructed without authentication and organization scope.

#### Negative authorization tests

- Unauthenticated request to `/api/v1/home` returns `401`.
- Authenticated user with no membership returns `403`.
- Authenticated user with membership in organization A requesting organization B is denied.
- Authenticated user with a valid membership but without `platform.home.read` is denied.
- Suspended or revoked membership is denied even if the session remains valid.
- Stale authorization epoch is rejected after membership or role change.
- Client-supplied role, organization name, or permission cannot elevate access.
- A platform-scoped context cannot be used to read organization Home data.

#### Tenant-isolation tests

Use two organizations and at least two users with non-overlapping memberships.

- Organization A cannot read Organization B’s Home data.
- A repository query under organization A returns no organization B rows, including when an attacker changes an ID or filter.
- Missing organization context returns no tenant rows.
- A mismatched organization context fails before the query or returns no data.
- RLS blocks direct cross-tenant reads using the runtime role.
- RLS blocks cross-tenant inserts and updates.
- Organization switching changes the active scope and cannot retain the previous organization’s data.
- Session or membership records cannot be used to enumerate other organizations.

#### Integration and end-to-end tests

- Apply all repository-owned migrations to PostgreSQL 16.
- Seed deterministic users, organizations, memberships, permissions, sessions, and Home records.
- Exercise login/session normalization, organization selection, protected API access, and Home response rendering.
- Test rollback behavior for identity/membership/Home writes where transaction boundaries apply.
- Test audit records for login linkage, membership changes, authorization denial, and protected Home access according to the approved audit policy.
- Run the frontend against the local API and PostgreSQL services in CI or a documented local harness.

### Phase 7 — Local operation and deployment preparation

Local development must be reproducible from a clean clone, standard Node.js/pnpm tooling, and PostgreSQL.

Proposed local prerequisites:

- Node.js `22.13.0`
- pnpm `11.24.0`
- PostgreSQL 16
- Development-only identity/session configuration
- No Manus account, Manus SDK, or Manus runtime service

Proposed local flow after implementation authorization:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm db:migrate
pnpm db:migrate:g004
# apply the approved identity/Home migrations
pnpm seed:dev
pnpm dev:api
pnpm dev:web
```

The exact script names should be added only with the implementation. The documentation must explain database creation, migration order, deterministic seed data, local login, organization switching, test execution, and reset procedures. A real external provider is not required for the local fixture path; staging authentication with a production provider remains blocked until G-007 or an explicit amendment is approved.

Deployment should use standard infrastructure:

- PostgreSQL 16 or a compatible supported PostgreSQL service.
- One Node.js API process initially; the modular monolith remains one deployable unit.
- Static frontend hosting or a standard Node frontend process, depending on the selected frontend architecture.
- TLS termination and a stable HTTPS origin.
- A production OIDC provider configuration approved under G-007 or an explicit recorded amendment to the relevant decision records.
- Secure secret storage for OIDC client secrets, session keys, and database credentials.
- Separate development, staging, and production databases and credentials.
- Repository-owned migrations executed as a controlled release step.
- Non-owner database runtime role with only required privileges.
- Structured logs, correlation IDs, health/readiness checks, backups, and basic alerting.
- No hidden platform configuration required for correctness.

A first deployment may be a single API and frontend environment, but the design must keep API, frontend, database, identity adapter, and persistence adapters replaceable through documented interfaces.

### Phase 8 — Milestone review and controlled release

The first usable screen is ready for team/staging access only when all acceptance criteria in Section 8 pass and the release checklist is approved.

No production deployment should occur merely because the frontend renders. The security boundary is the protected API plus PostgreSQL tenant enforcement, not the visibility of the screen.

## 4. Expected files and directories

### Files changed by the documentation/governance reconciliation

These changes are part of this planning task and do not implement product behavior:

- `README.md`
- `AGENTS.md`
- `docs/DEVELOPMENT.md`
- `docs/IMPLEMENTATION-STATUS.md`
- `docs/CURRENT-STATUS-REPORT.md`
- `docs/PRODUCT-READINESS-PLAN.md`

### Expected future files after approval

The following are proposed implementation locations, not files authorized by this plan:

| Area | Proposed paths | Purpose |
|---|---|---|
| Identity contracts | `packages/identity-contracts/package.json`, `packages/identity-contracts/tsconfig.json`, `packages/identity-contracts/src/index.ts` | Provider-neutral principal, identity, session, and identity-provider ports |
| Authorization contracts | `packages/authorization-contracts/...` | Permission, role, policy, decision, epoch, and authorization ports |
| Platform/domain contracts | `packages/platform-contracts/...` or an approved existing package extension | Organization, membership, workspace summary, and Home query contracts |
| Persistence contracts | `packages/persistence-contracts/src/identity.ts`, `organization.ts`, `authorization.ts` or equivalent approved boundary | Framework-free repositories and unit-of-work contracts |
| PostgreSQL adapters | `packages/persistence-postgres/src/identity.ts`, `organization.ts`, `authorization.ts`, `home.ts` | Kysely/pg implementation, RLS context, and runtime-role access |
| Migrations | `infrastructure/database/migrations/identity/<timestamp>_identity.cjs`, `organization/<timestamp>_membership.cjs`, `home/<timestamp>_home.cjs` | Version-controlled schema evolution |
| API | `packages/api-edge/src/auth.ts`, `context.ts`, `home.ts`, plus public exports | Authentication composition and protected Home endpoint |
| Web | `apps/web/` or the approved equivalent | Home route, API client, session UX, organization selection, and error states |
| Tests | `tests/unit/identity`, `tests/unit/authorization`, `tests/contract`, `tests/integration/identity`, `tests/integration/home`, `tests/security/tenant-isolation`, `tests/e2e/home` | Positive, negative, RLS, and browser-facing coverage |
| CI | `.github/workflows/ci.yml` | PostgreSQL migrations, seeds, API tests, frontend build, and end-to-end checks |
| Docs | `docs/IDENTITY.md`, `docs/AUTHORIZATION.md`, `docs/HOME.md`, `docs/DEPLOYMENT.md` | Operational and architectural documentation for the approved slice |

The exact package names must be confirmed during the contract-design review. Do not create a package solely to satisfy a conceptual directory tree.

## 5. Acceptance criteria

The first usable Home screen is accepted only when:

1. A real or explicitly configured development identity can authenticate through the selected adapter.
2. The external identity maps to a stable internal user without using email as the primary key.
3. A user can access only organizations with an active membership.
4. Membership roles and permissions are evaluated server-side with deny-by-default behavior.
5. Revocation, suspension, role changes, and authorization-epoch changes take effect without trusting stale client state.
6. Every protected Home request carries a validated organization context into the existing persistence boundary.
7. PostgreSQL RLS and repository checks prevent cross-tenant reads and writes using the runtime role.
8. `/api/v1/home` returns only the approved organization-scoped response contract.
9. The frontend displays authenticated, unauthorized, empty, loading, and failure states.
10. No browser code receives database credentials, provider secrets, refresh tokens, or authorization internals.
11. All migrations, seed data, tests, and configuration are repository-owned and reproducible from a clean clone.
12. `pnpm validate` passes, and PostgreSQL integration/security/e2e tests pass rather than being skipped.
13. The API and frontend can run locally using standard Node.js/pnpm/PostgreSQL infrastructure.
14. A staging deployment can be created with a standard PostgreSQL service, standard secret management, TLS, and the selected OIDC adapter.
15. No G-005 plugin runtime code, plugin migration, plugin SDK, executable plugin, marketplace feature, or later gated feature is introduced.

## 6. Security considerations

The principal security property is **server-enforced organization isolation**. The frontend is an untrusted client and must not determine the effective organization, role, permission, or data scope.

The implementation must also address session fixation and revocation, CSRF for cookie-authenticated state-changing requests, secure cookie attributes, redirect URI validation, OIDC issuer/audience validation, nonce/state validation, token and secret redaction, rate limiting on login/session endpoints, safe error responses, audit correlation, authorization epoch invalidation, least-privilege database roles, forced RLS, migration ownership, and dependency/supply-chain review.

Home is read-only in the first slice to reduce side-effect risk. No plugin, AI agent, integration, external webhook, file upload, or durable product automation is needed to reach the milestone.

## 7. Test and validation commands

The current repository commands remain required:

```sh
pnpm install --frozen-lockfile
pnpm validate:config
pnpm format:check
pnpm lint
pnpm typecheck
pnpm architecture:check
pnpm test
pnpm build
```

After the approved implementation exists, CI and local instructions should add commands equivalent to:

```sh
pnpm db:migrate
pnpm db:migrate:g004
pnpm db:migrate:identity
pnpm db:migrate:home
pnpm seed:dev
pnpm test:unit
pnpm test:contract
pnpm test:integration
pnpm test:security
pnpm test:e2e
pnpm build:web
```

The final implementation must ensure integration/security/e2e commands fail clearly when PostgreSQL or required test infrastructure is unavailable; silently skipping the tenant-isolation suite is not sufficient for milestone acceptance.

## 8. Milestone and accessibility definition

### Milestone: First usable Business OS Home screen

The milestone is reached when a team member can open the deployed staging URL over HTTPS, authenticate through the selected OIDC flow, select an organization for which they have an active membership, and see the protected Home screen populated from the organization-scoped API.

The milestone is **not** reached by a static mock, an unprotected route, a frontend-only fixture, a database-owner query, or a screen that accepts organization IDs without server-side membership and RLS enforcement.

The first accessible environment should be **staging**, after the security and release checklist passes. Production access is a separate operational approval and is not implied by this plan.

## 9. Explicit exclusions

This plan does not authorize or schedule:

- G-005 plugin contracts, plugin runtime, plugin migrations, plugin SDKs, executable plugins, or marketplace functionality.
- G-006 AI runtime or model-provider work.
- G-007 integrations, OAuth credential storage, or external provider adapters; production authentication provider selection remains deferred to G-007 or an explicit recorded amendment.
- G-008 storage/files work.
- G-009 production delivery decisions beyond standard-infrastructure prerequisites for a staging deployment.
- G-010 entitlements or later gated implementation.
- CRM, Commerce, Finance, Marketing, Operations, People, Work, Service, Automation, or AI product modules.
- A competing queue, scheduler, authorization system, audit system, persistence package, or plugin execution framework.

## 10. Approval checklist

Before implementation starts, the dev team and maintainer should review and explicitly approve:

- [ ] This dependency order.
- [ ] The internal identity and membership model.
- [ ] The provider-neutral identity ports and selected production OIDC adapter approach.
- [x] The initial role and permission vocabulary: `owner`, `admin`, `member`, and `platform.home.read`.
- [ ] The migration and RLS strategy.
- [x] The protected Home API response and error contract.
- [x] The frontend location (`apps/web`), framework-free first-slice surface, and session UX.
- [ ] The negative authorization and tenant-isolation test matrix.
- [ ] The standard-infrastructure staging deployment prerequisites.
- [ ] The explicit G-005 and later-gate exclusions.
- [ ] Separate implementation authorization for the approved phases.

Until these approvals are recorded, this document should be treated as a proposal only.
