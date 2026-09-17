# Business OS Development

## Current status

G-001, G-002, and G-003 are approved. The repository contains the Phase 1 runtime foundation and the G-003 persistence foundation only. G-004 through G-010 remain pending, so this guide intentionally documents no authentication provider, product module, durable execution, AI, plugin, integration, storage, or production deployment workflow.

The canonical foundation uses Node.js `22.13.0`, pnpm `11.24.0`, strict TypeScript, pnpm workspaces, TypeScript project references, NestJS at the delivery edge, and Vitest. The exact versions are represented in `package.json` and the committed lockfile.

The foundation packages are deliberately small:

| Package                              | Ownership               | Purpose                                                                           |
| ------------------------------------ | ----------------------- | --------------------------------------------------------------------------------- |
| `@business-os/shared-contracts`      | Platform foundation     | Stable cross-package health and logging contracts                                 |
| `@business-os/shared-validation`     | Platform foundation     | Replaceable boundary/configuration validation primitives                          |
| `@business-os/runtime-config`        | Platform foundation     | Portable environment-based process configuration                                  |
| `@business-os/api-edge`              | API delivery edge       | Minimal NestJS process and `/health` endpoint                                     |
| `@business-os/worker-edge`           | Worker delivery edge    | Minimal process-startup proof without durable work                                |
| `@business-os/persistence-contracts` | Platform foundation     | Framework-free organization, platform, audit, and transaction contracts           |
| `@business-os/persistence-postgres`  | Database infrastructure | Kysely/pg adapter, UUIDv7, transaction boundaries, RLS context, and audit adapter |

No package implements product behavior or a later implementation gate.

## Prerequisites

Install Node.js `22.13.0`, pnpm `11.24.0`, and PostgreSQL `16` for persistence integration tests. Corepack may be used to provide the repository-pinned pnpm version. No Manus account, service, SDK, managed database, queue, storage system, or provider credential is required.

## Installation

From a clean clone of GitHub, run:

```sh
corepack enable
pnpm install --frozen-lockfile
```

The repository has no required secret environment variables. The safe `.env.example` remains the reference for future configuration. Phase 1 accepts optional `SERVICE_NAME`, `APP_VERSION`, `PORT`, and `LOG_LEVEL` values; defaults are used when they are absent.

For G-003 integration tests, provide a standard PostgreSQL connection through `DATABASE_URL`. Run migrations with `pnpm db:migrate`; the migration directory is `infrastructure/database/migrations/g003`. The application test role must not own the tables and must receive only the privileges required by its repository adapters. Reset a disposable test database and rerun the migration rather than editing migration history.

## Canonical validation commands

The following commands are repository-owned and work without Manus:

| Command                   | Purpose                                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pnpm validate:config`    | Checks required repository configuration files                                                             |
| `pnpm format`             | Formats Phase 1 source, tooling, tests, and root configuration                                             |
| `pnpm format:check`       | Checks those files without modifying them                                                                  |
| `pnpm lint`               | Runs ESLint over repository source and tooling                                                             |
| `pnpm typecheck`          | Runs a clean TypeScript composite project build                                                            |
| `pnpm architecture:check` | Checks package exports, workspace declarations, forbidden imports, dependency cycles, and package metadata |
| `pnpm test`               | Runs unit, contract, architecture, integration, and end-to-end foundation test projects                    |
| `pnpm build`              | Builds all referenced TypeScript projects with `tsc --build`                                               |
| `pnpm validate`           | Runs configuration, formatting, lint, typecheck, architecture, tests, and build checks                     |
| `pnpm db:migrate`         | Applies repository-owned G-003 migrations using `DATABASE_URL`                                             |
| `pnpm db:migrate:down`    | Rolls back the latest G-003 migration in a disposable database                                             |

`pnpm install:check` is available as a named frozen-install command for CI-equivalent dependency installation. The `dev:api` and `dev:worker` scripts require a prior `pnpm build`.

## Local process startup

Build first:

```sh
pnpm build
```

Start the minimal API edge:

```sh
PORT=3000 pnpm dev:api
```

The API exposes only `GET /health` as a process-health proof. It contains no product routes.

Start the minimal worker edge:

```sh
pnpm dev:worker
```

The worker prints a startup record and exits. It is not a queue consumer or durable worker. G-004 must be resolved before durable worker behavior is added.

## Architecture enforcement

`pnpm architecture:check` mechanically validates the current package graph. It requires package export maps and ownership metadata, requires internal package dependencies to use the `workspace:` protocol, rejects deep/private package imports, rejects cross-package relative imports, rejects undeclared workspace dependencies, detects cycles, and prohibits framework/database/provider imports from framework-free packages. PostgreSQL driver access is permitted only in the infrastructure adapter package.

The checker is intentionally repository-owned and independent of NestJS. It is a foundation check, not a substitute for runtime authorization, tenant isolation, migration, or integration tests that belong to later gates.

## CI

`.github/workflows/ci.yml` runs the same essential pipeline on standard GitHub-hosted infrastructure, including a PostgreSQL 16 service for the real integration tests:

```text
frozen install → configuration validation → format check → lint → typecheck
→ architecture checks → PostgreSQL migration → tests → build
```

The workflow uses only standard GitHub Actions, PostgreSQL, Node.js, pnpm, and repository commands. It does not use Manus services, variables, SDKs, managed databases, queues, storage, or conversation state.

## Later-gate boundary

Do not add product or platform behavior to make the foundation appear complete. G-002 owns identity and authorization semantics. G-003 owns the implemented database, migrations, identifiers, transactions, and tenancy foundation. G-004 still owns durable events, queues, jobs, retries, idempotency, and workers. G-005 through G-010 retain ownership of plugins, AI, integrations, storage, deployment, and entitlements as recorded in `docs/DECISIONS.md`.

## Remaining guide contents after G-003

The completed guide must document prerequisites, dependency installation, environment-variable setup, local development, database creation and migrations, deterministic seed or test data, unit/integration/contract/end-to-end tests, formatting, linting, type checking, builds, debugging, CI, deployment, and contribution workflow.

It must identify which commands are safe to run locally, which require external services, how to run tests without Manus, and how to reset local state. It must link each operational command to the repository-owned configuration and source that implements it.

## Development rules

All required development behavior must be reproducible from a clone of GitHub plus documented standard dependencies and environment variables. Do not rely on Manus conversation history, hidden project configuration, hosted builder state, or provider-specific local tooling.

New modules must document their ownership, public contracts, organization-isolation strategy, permissions, events, migrations, adapters, audit behavior, and tests. Changes that establish an architectural behavior must update the relevant documentation and, where material, `docs/DECISIONS.md`.

## AI coding agent workflow

An AI coding agent should read `AGENTS.md`, `README.md`, the relevant documents in `docs/`, and the module-local documentation before editing code. It should inspect existing source and tests, make the smallest coherent change, run the documented validation commands, update documentation, and report what is implemented and what remains unimplemented. It must not claim that a documented boundary is a working feature.

Agents must preserve organization isolation, centralized authorization, provider adapters, public module contracts, source-controlled migrations, and Manus independence. If implementation exposes a conflict or missing decision, the agent must document the discrepancy and stop before silently redesigning the architecture.

## References

[1]: ../AGENTS.md 'Business OS Contributor Guidance'
[2]: README.md 'Business OS Repository Overview'
[3]: ARCHITECTURE.md 'Business OS Architecture'
[4]: REPOSITORY-STRUCTURE.md 'Business OS Repository Structure'
[5]: DECISIONS.md 'Business OS Architecture Decisions'
[6]: IMPLEMENTATION-STATUS.md 'Business OS Implementation Status'
