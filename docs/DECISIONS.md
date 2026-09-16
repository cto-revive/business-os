# Business OS Architecture Decisions

## Decision record purpose

This document records the durable architectural decisions that govern Business OS and the decisions that remain intentionally unresolved. A decision is accepted only when it is explicit, reviewable, and compatible with the full product vision. Implementation must not quietly decide an unresolved issue through a framework default or provider constraint.

## Accepted decisions

| ID | Decision | Status | Consequence |
|---|---|---|---|
| ADR-001 | Start as a modular monolith | Accepted | Keep modules explicit; defer microservices until a concrete extraction need exists |
| ADR-002 | Make organization the primary tenant boundary | Accepted | All tenant-owned data and execution paths enforce organization isolation |
| ADR-003 | Make users organization members rather than application-owned users | Accepted | Identity, membership, teams, roles, and permissions are platform capabilities |
| ADR-004 | Provide shared core capabilities | Accepted | Tasks, files, comments, notifications, events, search, and audit logs are reused by applications |
| ADR-005 | Treat apps, plugins, integrations, agents, templates, and themes as distinct extension concepts | Accepted | Their boundaries and governance cannot be collapsed into one generic mechanism |
| ADR-006 | Make AI and automation horizontal capabilities | Accepted | Agents and automations use registered actions, permissions, organization scope, and audit records |
| ADR-007 | Use adapter boundaries for external providers | Accepted | Providers such as WhatsApp remain integrations, not application-owned subsystems |
| ADR-008 | Keep GitHub authoritative and preserve portability | Accepted | Source, migrations, configurations, tests, and documentation stay in the repository; Manus is not required at runtime |
| ADR-009 | Prohibit optional-plugin dependency from core | Accepted | Plugins use documented extension points and cannot modify core source |
| ADR-010 | Version-control all database evolution | Accepted | Schema changes require repository migrations and documented deployment procedures |
| ADR-011 | Define a stack-neutral conceptual repository structure | Accepted | Organize future apps, platform capabilities, execution, extensions, infrastructure, shared contracts, tests, tooling, and documentation by ownership and dependency direction without selecting implementation technologies |
| ADR-012 | Adopt the G-002 identity and authorization contract | Accepted | Establishes provider-neutral identity, authentication, session, membership, principal, authorization, delegation, revocation, and audit semantics without implementing runtime infrastructure |

## Implementation gates

The following choices must be made before the related implementation starts. They are not defects in the architecture; they are deliberately deferred decisions that must not be made implicitly.

| Gate | Decision required | Must precede |
|---|---|---|
| G-001 | Final runtime stack, module layout, build system, and testing strategy | Any application or UI implementation |
| G-002 | Identity, session, membership, role, permission naming, and administrative delegation model | Authentication or authorization implementation |
| G-003 | Database engine, migration framework, identifier strategy, time conventions, and tenancy enforcement design | First database migration or persistent application record |
| G-004 | Reliable event-publication mechanism, event contract format, queue or scheduler approach, and idempotency strategy | Automation, webhooks, or background work |
| G-005 | Plugin package, manifest, isolation, review, versioning, and lifecycle model | Executable or installable plugin support |
| G-006 | AI model-provider policy, provider adapter, retrieval and prompt-data handling, cost controls, and human-approval policy | Production AI-agent execution |
| G-007 | Initial integration contracts, credential storage, OAuth or API-key policy, and webhook verification model | External provider connection |
| G-008 | Storage abstraction, file access policy, retention, export, deletion, and backup or restoration objectives | File handling or tenant-data retention |
| G-009 | Deployment topology, container or artifact strategy, CI/CD, infrastructure-as-code, environment promotion, observability, and incident operations | Production hosting |
| G-010 | Product entitlement, application installation, configuration, template, theme, and marketplace governance model | Application activation or marketplace functionality |

## Gate decisions

### G-001 — Approved implementation stack

**Status: ACCEPTED WITH CONDITIONS.** The maintainer approved the Phase 1 repository runtime foundation. [`G-001-STACK-PROPOSAL.md`](G-001-STACK-PROPOSAL.md) specifies TypeScript on a repository-pinned Node.js LTS runtime, NestJS at delivery/composition edges, pnpm workspaces, TypeScript project references, and Vitest. The accepted conditions require package export maps, explicit workspace dependencies, import-boundary and cycle checks, runtime validation at exposed untrusted boundaries, framework-free domain/application packages, and the exclusions recorded in [`G-001-DECISION-CLOSURE.md`](G-001-DECISION-CLOSURE.md).

This acceptance is limited to the repository runtime foundation. It does not select the database, event transport, queue, scheduler, storage, plugin runtime, AI provider, integration credential model, or production deployment topology. Those choices remain in G-003 through G-010. Product implementation remains blocked by the relevant later gates.

### G-002 — Approved identity and authorization contract

**Gate:** G-002

**Decision:** **APPROVED**

**Approval date:** 2026-09-16

**Maintainer/owner:** Business OS maintainer

**Approved document:** [`G-002-DECISION-CLOSURE.md`](G-002-DECISION-CLOSURE.md)

**Approved document commit:** `48b4f2bd9febba9dffeb98d5f9fa99946b76e213`

The G-002 identity and authorization contract in the approved document is now authoritative for Business OS. It defines provider-neutral OIDC Authorization Code with PKCE semantics, authentication assurance, identity linkage, opaque server-side session semantics, organization membership and switching, deny-by-default authorization, distinct principal kinds, delegation, revocation, separation of duties, and audit requirements.

This approval records governance only. It does not implement authentication, authorization, sessions, memberships, roles, permissions, credentials, providers, schemas, migrations, queues, events, AI, plugins, integrations, storage, or production infrastructure. Implementation remains gated by G-003, G-004, and G-007 where specified in the approved document. **Deviations: NONE.**

### G-003 — Proposed database, persistence, and tenancy architecture

**Status: PENDING maintainer approval.** [`G-003-DECISION-CLOSURE.md`](G-003-DECISION-CLOSURE.md) proposes PostgreSQL 16 or later, SQL-first Kysely repositories with the `pg` adapter, application-generated UUIDv7 identifiers, UTC `timestamptz` values, use-case-owned transactions, repository-enforced organization context, PostgreSQL row-level security as defense in depth, module-owned schemas and migrations, append-oriented audit persistence, and portable `node-pg-migrate` migrations.

The proposal does not create a database, schema, migration, ORM model, persistence package, authentication persistence, application record, or runtime infrastructure. G-004, G-007, G-008, and G-009 remain responsible for their explicitly deferred concerns. G-003 is not accepted until the maintainer explicitly approves the specification.

## Review findings

The architecture contains no unresolved contradiction with the stated product vision. The following tensions are deliberate design constraints that need future detail:

**Shared platform capabilities versus strong application boundaries.** Applications require access to tasks, files, comments, notifications, events, search, and audit logs, but the platform must avoid becoming an unbounded dependency hub. The remedy is small published contracts and explicit ownership rather than direct data access.

**Organization isolation versus multi-organization users and shared services.** A user may belong to several organizations while the platform provides common services. The remedy is an explicit organization context for every access and execution path, never an inferred tenant context.

**Extensibility versus core stability.** Apps, plugins, integrations, automation, and AI agents need to interact, but unrestricted extension would weaken security and data integrity. The remedy is registered objects, events, actions, permissions, and extension points, with no plugin mutation of core source.

**AI autonomy versus accountability.** Agents can perform useful cross-application work, but a model response is not authority. The remedy is tool registration, scoped permission decisions, human approvals for sensitive side effects, and audit records.

**Initial hosting convenience versus portability.** Manus can accelerate development and early hosting, but hidden platform configuration would undermine portability. The remedy is repository-owned source, migrations, configuration templates, and operational definitions that use standard infrastructure interfaces.

## Change process

To add, amend, or supersede a decision, create a new ADR entry with the decision, status, context, consequences, owner, and approval date. Do not rewrite accepted history in a way that obscures why an earlier direction was taken. A proposed implementation that conflicts with an accepted ADR requires explicit approval before work begins.

## References

[1]: ARCHITECTURE.md "Business OS Architecture"
[2]: DATABASE.md "Business OS Database Architecture"
[3]: MULTI-TENANCY.md "Business OS Multi-Tenancy"
[4]: PERMISSIONS.md "Business OS Permissions"
[5]: APPS.md "Business OS Applications"
[6]: PLUGINS.md "Business OS Plugins"
[7]: AI-AGENTS.md "Business OS AI Agents"
[8]: AUTOMATION.md "Business OS Automation"
[9]: INTEGRATIONS.md "Business OS Integrations"
[10]: SECURITY.md "Business OS Security"
[11]: DEPLOYMENT.md "Business OS Deployment"
[12]: REPOSITORY-STRUCTURE.md "Business OS Repository Structure"
