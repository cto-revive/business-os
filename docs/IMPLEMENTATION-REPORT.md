# Business OS — First Usable Screen Implementation Report

**Milestone:** Product Readiness and First Usable Screen
**Status:** Bounded milestone implemented, security-reviewed, committed, and browser-verified; production/staging authentication remains deferred to G-007.
**Repository:** `cto-revive/business-os`
**Branch:** `main`
**Commit:** `feat: implement first usable business os home screen`

## Executive result

The repository now contains a functioning local-development Business OS Home slice. A deterministic development identity can sign in through a server-side opaque session, select an organization with an active membership, and receive a protected organization-scoped Home response through `GET /api/v1/home`. The framework-free `apps/web` surface renders the response, supports organization switching, displays empty state, and supports logout.

The implementation uses PostgreSQL 16, repository-owned migrations, the existing persistence/RLS boundary, a non-owner runtime role, deny-by-default authorization, membership lifecycle checks, authorization-epoch invalidation, HttpOnly cookies, CSRF checks for state changes, deterministic repository-owned fixtures, and a same-origin API proxy for local browser operation.

This is not production authentication or production readiness. No OIDC provider, provider SDK, external callback design, or production authentication implementation was selected. Those remain deferred to G-007 or an explicit governance amendment.

## Phase 0 — Governance and scope

The project-owner approval and exact scope are recorded in `docs/PRODUCT-READINESS-DECISION.md` and `docs/DECISIONS.md`. The milestone is limited to identity/session contracts, organization membership authorization, tenant isolation, the protected Home API, the framework-free Home surface, security tests, local setup, and a standard-infrastructure deployment path.

G-005 remains plan-only. G-006 through G-010 remain unimplemented. No production authentication provider, plugin runtime, AI provider, integration, storage system, or Manus runtime dependency was introduced.

The status language in `README.md`, `AGENTS.md`, `docs/DEVELOPMENT.md`, `docs/APPS.md`, and `docs/IMPLEMENTATION-STATUS.md` was reconciled to distinguish the completed bounded Home slice from future production and later-gate work.

## Phase 1 — Contracts and runtime

Added `@business-os/platform-contracts` with provider-neutral contracts for users, organizations, memberships, roles, authorization epochs, opaque sessions, workspace items, Home responses, API errors, and platform repository boundaries.

Added `@business-os/platform-runtime` with server-side use cases for deterministic local login, session lookup and expiry, active-membership enforcement, organization listing and switching, session rotation, CSRF validation, logout/revocation, and organization-scoped Home assembly.

Security behavior is deny-by-default. Only active memberships authorize Home. Roles are constrained to `owner`, `admin`, and `member`. Suspended and revoked memberships are rejected, and stale authorization epochs invalidate sessions.

The development fixture now fails closed unless `NODE_ENV=development` is explicitly set. An unset or staging environment cannot activate the fixture.

## Phase 2 — PostgreSQL persistence and RLS

Added `packages/persistence-postgres/src/platform.ts` and repository-owned migrations:

- `infrastructure/database/migrations/identity/20261011000000_first_screen_identity.cjs`
- `infrastructure/database/migrations/identity/20261011010000_first_screen_runtime_privileges.cjs`

The migrations add users, external identity linkage, organizations, memberships, sessions, and workspace items. They add RLS policies for platform reads, self-membership lookup, sessions, and organization-scoped workspace items. Platform context now propagates `app.principal_id`.

The final review found that the initial runtime-role setup was too broad. The forward privilege migration now removes broad platform write policies. Users, external identities, organizations, memberships, and workspace items are read-only to the runtime role. Sessions retain only select/insert/update access required for session creation, rotation, lookup, and revocation. CI grants were updated accordingly.

The runtime role is not the database owner. Local inspection confirmed these first-screen privileges:

| Table | Runtime-role privileges |
|---|---|
| `users` | `SELECT` |
| `external_identities` | `SELECT` |
| `organizations` | `SELECT` |
| `organization_memberships` | `SELECT` |
| `sessions` | `SELECT`, `INSERT`, `UPDATE` |
| `workspace_items` | `SELECT` |

Added `tooling/seed-first-screen.mjs` for deterministic development users, organizations, memberships, and workspace items.

## Phase 3 — API delivery edge

Added these routes to `@business-os/api-edge`:

| Route | Purpose |
|---|---|
| `GET /health` | Process health |
| `POST /api/v1/dev/login` | Explicit-development-only deterministic login |
| `GET /api/v1/session` | Current session, CSRF token, and active memberships |
| `POST /api/v1/session/organization` | Server-validated organization switch with session rotation |
| `POST /api/v1/logout` | CSRF-protected session revocation |
| `GET /api/v1/home` | Protected organization-scoped Home response |

Cookies are HttpOnly and SameSite Lax. Secure is applied outside local development. The browser receives no database credentials, provider tokens, raw session internals, or authorization internals.

## Phase 4 — Web Home surface

Added framework-free `apps/web` files:

- `apps/web/index.html`
- `apps/web/app.js`
- `apps/web/styles.css`
- `apps/web/server.mjs`

The web server serves static assets and proxies `/api/*` and `/health` to the local API, keeping browser requests same-origin and avoiding cross-origin cookie behavior. `pnpm dev:web` starts the surface on port 4173.

The browser UI includes development access, sign-in, organization selection, viewer role, workspace items, empty state, errors, and logout.

## Automated validation

The final PostgreSQL-backed validation command was:

```sh
DATABASE_URL='postgresql://business_os_app:business_os_app@127.0.0.1:5432/business_os' pnpm validate
```

Results:

- Configuration validation: passed.
- Formatting: passed.
- ESLint: passed.
- TypeScript composite typecheck: passed.
- Architecture validation: passed for 11 packages.
- Test files: **10 passed**.
- Tests: **30 passed, 0 failed**.
- First-screen PostgreSQL/RLS tests: **4 passed**.
- Build: passed.
- Skipped tests in final PostgreSQL-backed validation: **none**.

The dedicated suite is also available as:

```sh
DATABASE_URL='postgresql://business_os_app:business_os_app@127.0.0.1:5432/business_os' \
  pnpm test:integration:first-screen
```

The four first-screen security tests prove that the runtime role fails closed without RLS context, sees only the active organization’s rows, cannot write cross-organization data, and serves Home only through an active membership/current authorization epoch.

## HTTP and browser evidence

Live HTTP checks proved:

- Unauthenticated Home request → `401 AUTHENTICATION_REQUIRED`.
- Missing CSRF token → `403 CSRF_INVALID`.
- Suspended membership → `403 ORGANIZATION_ACCESS_DENIED`.
- Stale authorization epoch → `403 AUTHORIZATION_STALE`.
- Organization switching rotates the session and revalidates membership.

Actual browser verification was performed at:

<https://4173-icw3yalvufilp03xilrql-d29620bd.sg2.manus.computer/>

Verified flows:

1. Initial development-access screen rendered.
2. **Continue as Alice** created a session and rendered Acme Operations with two items.
3. The organization selector switched to Northstar Labs; the browser rendered Alice as a member and only the Northstar workspace item.
4. The Northstar item was temporarily removed and restored; the browser rendered `Your workspace is ready for its first item.` as the empty state.
5. **Sign out** revoked the browser session and returned to development access.
6. The browser exposed no database credentials, provider tokens, session identifiers, or unauthorized cross-tenant records.

## Local startup

```sh
pnpm install --frozen-lockfile
pnpm build

DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/business_os \
  pnpm db:migrate:g004

DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/business_os \
  pnpm seed:first-screen

DATABASE_URL=postgresql://business_os_app:business_os_app@127.0.0.1:5432/business_os \
  NODE_ENV=development PORT=3000 pnpm dev:api

# In a second terminal.
PORT=4173 pnpm dev:web
```

Open `http://localhost:4173/` locally, or the sandbox URL above when using the sandbox public service.

## CI and staging readiness

`.github/workflows/ci.yml` now creates a non-owner PostgreSQL role, runs repository migrations, grants least-privilege access, seeds fixtures, and executes the complete test suite. The workflow uses standard GitHub Actions, Node.js, pnpm, and PostgreSQL only.

The standard staging path is documented and locally exercised through a built API, PostgreSQL migrations, runtime-role grants, HTTPS-capable reverse proxy shape, and the same-origin web surface. No external staging environment was provisioned or deployed in this milestone.

## Remaining blockers and non-goals

1. Production/staging authentication requires a provider decision under G-007 or an explicit governance amendment.
2. Production deployment requires the selected authentication adapter, standard secret management, TLS, operational monitoring, and G-009 deployment approval.
3. Broader platform capabilities such as teams, tasks, files, comments, notifications, search, and richer audit workflows remain future work.
4. CRM, Commerce, Finance, Operations, People, Work, Service, AI, and Automation remain out of scope.
5. No G-005 plugin runtime, SDK, migration, executable plugin, or marketplace implementation was added.
6. No force-push or history rewrite was performed.

## Git result

The reviewed milestone was committed as:

```text
feat: implement first usable business os home screen
```

The final commit is one commit ahead of `origin/main`. The working tree is clean, and no generated `dist/`, `node_modules/`, or build-cache files were committed.

## Completion statement

The bounded first-screen acceptance criteria are met for the local development and PostgreSQL validation environment. The repository must not claim production authentication or production readiness until G-007/G-009 requirements and their corresponding operational evidence are separately approved and completed.
