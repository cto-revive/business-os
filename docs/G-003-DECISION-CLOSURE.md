# G-003 Database, Persistence, and Tenancy Decision Closure

## 1. Status

**Status: PROPOSED — PENDING MAINTAINER APPROVAL.**

This document is an implementation-ready persistence architecture proposal. It closes the G-003 decisions required before the first database migration or persistent application record. It does not create a database, schema, migration, ORM model, database package, authentication persistence, or application record.

G-001 is closed and G-002 is approved. This proposal must preserve the G-002 identity and authorization contract. G-003 owns storage semantics; it must not change G-002 security semantics. G-004 through G-010 remain separate gates.

## 2. Scope

G-003 defines the baseline for:

- The production relational database engine and support policy.
- SQL-first persistence and repository boundaries.
- Identifier and foreign-key conventions.
- Time and clock conventions.
- Transactions, consistency, concurrency, uniqueness, and idempotency at persistence boundaries.
- Organization isolation and database-level defense in depth.
- Schema ownership and cross-module access.
- Lifecycle, archival, deletion, and audit persistence.
- Sensitive-field and secret-reference rules.
- Version-controlled migrations.
- Portable local and test databases.
- Durability and recovery boundary with G-009.

This decision applies to platform, application, and future extension persistence. It does not authorize implementation of any of those modules.

## 3. Non-goals

G-003 does not implement or select:

- Authentication, authorization, sessions, memberships, roles, permissions, or identity infrastructure. Their semantics are governed by approved G-002.
- Durable events, queues, schedulers, jobs, retries, idempotent event processing, reliable publication, or durable approval execution. These belong to G-004.
- Plugin runtime or isolation. This belongs to G-005.
- AI providers, retrieval, prompt-data policy, model execution, cost controls, or human approval policy. These belong to G-006.
- External identity-provider/vendor implementation, provider SDKs, OAuth/API-key handling, integration credentials, or provider callbacks. These belong to G-007.
- File storage, object storage, retention, export, deletion, or restoration implementation. These belong to G-008.
- Production deployment topology, database operations, backups, disaster recovery, observability, incident response, or production secret delivery. These belong to G-009.
- Entitlements, application installation, marketplace governance, templates, or themes. These belong to G-010.
- Any production database package, schema, migration, ORM model, or application record during this decision-closure phase.

## 4. Decision summary

| Concern | Proposed decision | Classification |
|---|---|---|
| Database engine | PostgreSQL 16 or later, using the current supported major version within the repository support window | **DECIDED** |
| Portability | Independently deployable PostgreSQL; no Manus-managed database dependency | **DECIDED** |
| Persistence approach | SQL-first repositories using Kysely as a type-safe query builder and `pg` as the PostgreSQL adapter; no domain ORM entities | **DECIDED** |
| Domain/persistence separation | Framework-free domain/application code depends on repository contracts, never Kysely, `pg`, or PostgreSQL types | **DECIDED** |
| Migration runner | `node-pg-migrate` with repository-owned plain SQL migration files and reviewable migration metadata | **DECIDED** |
| Identifiers | Application-generated UUIDv7 values stored in PostgreSQL `uuid` columns | **DECIDED** |
| Time | UTC instants stored as PostgreSQL `timestamptz`; microsecond database precision; RFC 3339 UTC at boundaries | **DECIDED** |
| Baseline transaction isolation | PostgreSQL `READ COMMITTED`, with explicit locks or stronger isolation for contention-sensitive operations | **DECIDED** |
| Tenancy enforcement | Mandatory application organization context plus PostgreSQL row-level security on organization-owned tables | **DECIDED** |
| Cross-organization access | Prohibited by default; no general cross-organization query primitive | **DECIDED** |
| Schema ownership | The owning module owns tables, repositories, migrations, permissions, and lifecycle; consumers use public contracts | **DECIDED** |
| Soft deletion | No universal soft-delete column; lifecycle and archival are domain-specific; audit records are append-oriented | **DECIDED** |
| Audit persistence | Append-oriented, organization-scoped where applicable, indexed, and transactionally coupled to audited state changes | **DECIDED** |
| Secret storage | Store references or one-way protected session identifiers; never store passwords or raw tokens; external secret storage remains G-007/G-009 | **DECIDED / DEFERRED TO SPECIFIC LATER GATES** |
| Backup and recovery | G-003 requires durable committed storage and backup-compatible database behavior; G-009 owns production backup, restore, and disaster-recovery operations | **DEFERRED TO A SPECIFIC LATER GATE** |
| Open conceptual blockers | None within G-003 scope | **DECIDED** |

## 5. Compatibility with G-001 and G-002

### 5.1 G-001 compatibility

The persistence implementation must remain inside the approved G-001 boundaries:

- PostgreSQL and its adapters belong in infrastructure or persistence packages, not shared foundation, domain, or application contracts.
- Kysely, `pg`, migration tooling, and PostgreSQL-specific types must not leak into framework-free domain/application code.
- Repository contracts are explicit public module boundaries.
- NestJS may compose delivery and infrastructure adapters, but it does not own domain persistence semantics.
- Migrations, configuration, tests, and operational definitions remain repository-owned and portable.
- No Manus API, runtime service, database, storage, environment variable, or hidden configuration is required.

### 5.2 G-002 compatibility

The storage design preserves the approved G-002 contract:

| G-002 semantic | G-003 persistence consequence |
|---|---|
| Globally unique immutable user identity | User identity records use immutable UUIDv7 identifiers; email and provider subjects are attributes or qualified links, not authorization keys |
| Globally unique organization | Organization records use immutable UUIDv7 identifiers |
| Membership uniqueness | Enforce uniqueness for `(user_identity_id, organization_id)`; membership lifecycle is represented explicitly rather than by deleting history |
| Membership lifecycle | Status transitions are constrained by module-owned commands and audited state changes |
| Authorization epochs | Epoch values are updated atomically with membership, grant, or security changes and checked before sensitive actions |
| Opaque server-side sessions | Session records store a one-way protected token identifier or equivalent non-replayable representation; raw session tokens are never persisted |
| Session revocation | Revocation state and relevant epoch references are persisted and checked by the session boundary |
| Role and grant persistence | Roles and grants are organization-scoped records owned by the authorization module; G-003 supplies storage only |
| Distinct principal kinds | Principal kind is explicit and constrained; no human privilege is inferred for service, integration, automation, or AI principals |
| Delegation | Delegations have explicit organization, principal, scope, expiry, revocation, and one-hop fields owned by the authorization module |
| Credential references | Persistence stores references and lifecycle metadata, not raw external secrets; G-007/G-009 own external secret handling |
| Audit records | Audit records carry actor, organization or explicit platform scope, action, target, policy basis, outcome, and correlation data |
| Organization switching | Session context is replaced and authorization is re-evaluated; persisted session and membership scope cannot be reused across organizations |
| Deny-by-default authorization | Database constraints and RLS reduce leakage but never replace the G-002 application authorization decision |

If a future implementation cannot preserve one of these semantics, implementation must stop and produce an explicit architecture amendment. A database limitation is not permission to weaken G-002.

## 6. Database engine

### 6.1 PostgreSQL baseline

The baseline production database is **PostgreSQL 16 or later**. The supported version policy is the current PostgreSQL major version used in production plus the two preceding supported majors, subject to dependency and extension compatibility. The repository CI and test matrix must exercise at least the minimum supported major and the production major.

The application may use PostgreSQL-specific infrastructure features such as `timestamptz`, `uuid`, transactional DDL where appropriate, and row-level security. Those features must remain behind persistence boundaries. Domain and application contracts must not require PostgreSQL types or syntax.

PostgreSQL fits the modular monolith because it provides strong transactional consistency, foreign keys, unique constraints, mature indexing, expressive SQL, row-level security, and a portable standard deployment shape. It supports shared platform modules and applications in one database while preserving module ownership through schemas, tables, repositories, migrations, and contracts.

### 6.2 Local development

Local development uses an independently runnable PostgreSQL instance supplied through standard infrastructure. Docker or Podman may be used by a developer or CI environment, but no hosted vendor or Manus service is required. The repository will document the required PostgreSQL version, connection variables, health check, migration command, reset command, and test command when implementation begins.

This decision does not add a container file or local database configuration. Those artifacts require implementation work after G-003 approval and must remain portable.

### 6.3 Test database

Integration tests use a real PostgreSQL database, not an in-memory substitute or SQLite compatibility mode. Tests may use a disposable PostgreSQL container, a standard CI service container, or an independently provisioned test database. The selected mechanism must exercise constraints, transactions, RLS, indexes, and migrations that production relies on.

Unit tests may use repository fakes only for domain behavior that does not depend on SQL semantics. A fake must not be presented as evidence of tenancy isolation, transaction safety, constraint behavior, migration correctness, or RLS enforcement.

### 6.4 Operational dependencies

A production deployment requires a PostgreSQL service with encrypted transport, durable storage, connection limits, role management, migration execution, monitoring, and backup capability. The choice of host, managed service, containers, storage class, backup provider, and operational runbook is deferred to G-009.

G-003 selects the database technology and persistence semantics. It does not select a hosted database vendor.

## 7. Persistence and data-access layer

### 7.1 SQL-first repository approach

The baseline persistence approach is SQL-first. Kysely is the type-safe query builder, and `pg` is the PostgreSQL driver used by infrastructure adapters. Repository implementations own query composition, transaction participation, row mapping, and database-specific details.

Kysely is not a domain model and is not exposed from domain or application packages. The repository may use generated or hand-maintained database types, but those types remain persistence-internal. No active-record pattern is permitted for platform or application domain objects.

### 7.2 Domain and persistence separation

A domain or application module defines repository interfaces and domain representations. The persistence adapter implements those interfaces. Persistence records may contain database-only fields such as internal version counters, RLS-support metadata, or audit timestamps; domain objects need not expose them.

The dependency direction is:

```text
domain/application contracts
        ↑
persistence repository interfaces
        ↑
PostgreSQL/Kysely/pg adapters
```

The arrows represent dependency direction from implementation toward contracts. Domain and application code must not import Kysely, `pg`, PostgreSQL clients, SQL migration tooling, NestJS, or provider SDKs.

### 7.3 Query composition

Queries are composed in the repository that owns the data. A repository must require organization context for organization-owned records and must apply scope before selecting, updating, deleting, counting, or exporting data. Shared query helpers may reduce repetition, but they must not create an unscoped escape hatch.

Cross-module consumers use published commands, queries, or read contracts. They do not join another module's private tables, mutate another module's records, or import another module's persistence model. A reporting or search requirement that crosses ownership boundaries must use an explicitly owned projection or public query contract.

### 7.4 Raw SQL policy

Raw SQL is permitted inside infrastructure adapters and migrations when it improves correctness, performance, constraint expression, RLS policy definition, or PostgreSQL feature use. Raw SQL is prohibited in domain/application modules and in delivery handlers.

Every raw SQL query must be parameterized. Dynamic identifiers must come from a trusted allowlist, never direct client input. Raw SQL must have repository tests for organization scope, error mapping, and relevant constraints. Queries that bypass a repository's mandatory organization context require an explicit platform-scope method and an authorization review.

### 7.5 Migration ownership

The module that owns a persistent record owns its migration files and schema evolution. Shared infrastructure may provide the migration runner and conventions, but it must not become the owner of business tables. A migration may coordinate multiple modules only when the decision record documents the ownership and compatibility boundary.

### 7.6 Generated code

Generated database types are allowed only as build artifacts derived from repository-owned schema or migration definitions. Generated files must not be the sole source of truth, must not be manually edited, and must be reproducible in CI. Generation must not introduce provider SDK types into domain/application packages.

## 8. Identifier strategy

### 8.1 Canonical identifier

Persistent entities use application-generated **UUIDv7** identifiers stored in PostgreSQL's native `uuid` type. UUIDv7 provides globally unique, opaque identifiers with time-ordered bits without exposing a business sequence. Generation occurs at the application boundary or persistence adapter using a reviewed, standards-conforming implementation; the database is not the source of identifier generation.

Identifiers are immutable. They are safe for external references in opaque form, but exposing an identifier does not grant access. Authorization and organization scope remain mandatory for every lookup.

### 8.2 Keys and foreign keys

Every entity table has one immutable UUID primary key. Foreign keys use the same UUID type and reference the owning entity. Foreign keys are required for ownership and relationship integrity unless a documented external-reference boundary makes a database foreign key impossible.

Junction and membership records use a UUID primary key plus composite uniqueness constraints. The baseline does not use composite primary keys for ordinary entities. The required membership uniqueness constraint is `(user_identity_id, organization_id)`.

Tenant-owned records include `organization_id` as a non-null foreign key unless the record is explicitly platform-global. Organization ID must be included in relationship and uniqueness design where omitting it could permit cross-organization collision.

### 8.3 Natural keys and uniqueness

Natural keys are attributes used for lookup or uniqueness, never the canonical identity of an entity. An email address, provider-qualified subject, slug, external ID, or display name is unique only within the documented scope and lifecycle policy.

Uniqueness constraints must be database-enforced. The application may provide friendly validation, but concurrent requests must rely on the database constraint as the final authority. Error mapping must distinguish a conflict from an authorization failure without leaking another organization's data.

### 8.4 Identifier migration

Identifiers must not be re-keyed during ordinary migrations. If a legacy or external identifier must be introduced, it is stored as a scoped, typed reference with a unique constraint and an immutable mapping to the UUIDv7 entity. A re-keying operation requires a separate architecture and data-migration plan, dual-read/dual-write compatibility where needed, and explicit approval.

## 9. Time conventions

### 9.1 Representation

All persisted instants use PostgreSQL `timestamptz` and represent UTC instants. The application and domain boundary use an immutable instant value object. Public serialization uses RFC 3339 UTC strings with an explicit `Z` offset. Local wall-clock dates and times are separate values and must include an explicit timezone or business-calendar policy.

The database may normalize the textual offset, but it must preserve the instant. No security, authorization, membership, session, expiration, audit, or tenancy decision may use local server time.

### 9.2 Precision and clock source

The database stores microsecond precision. The application must not assume that JavaScript millisecond precision is the full stored precision; it must round-trip or compare according to an explicit precision policy. The database server clock is the authoritative source for persistence timestamps and transaction ordering. The application clock is used only for request deadlines, user-facing estimates, or tests that explicitly inject a clock.

The application must use an injected clock for authorization freshness, session expiration, membership expiry, delegation expiry, and deterministic tests. Production clock synchronization is an operational requirement owned by G-009.

### 9.3 Standard timestamp fields

Records that need lifecycle history use `created_at` and `updated_at`. `updated_at` changes only when the record's persisted state changes. Records with lifecycle transitions may also use explicit fields such as `suspended_at`, `revoked_at`, `expires_at`, `archived_at`, or `deleted_at` when the owning module defines their meaning.

Expiration is exclusive at the boundary: an action at or after `expires_at` is expired. Ordering uses database instants plus a stable UUID tie-breaker when timestamps are equal. Future event timestamps are not implemented by G-003; G-004 owns event timing semantics.

## 10. Transactions and consistency

### 10.1 Transaction ownership

The application use-case or command boundary owns the transaction. A repository participates in the transaction context it receives and does not silently open an independent transaction for part of a business operation. Infrastructure may provide a transaction wrapper, but it must not hide the boundary from the application service.

Read-only queries may use a shorter transaction or a connection-level operation only when they do not access tenant-owned data without an explicit organization context. Tenant-owned reads use the same context propagation and RLS requirements as writes.

### 10.2 Isolation baseline

The baseline isolation level is PostgreSQL `READ COMMITTED`. It is sufficient for ordinary commands when constraints, authorization checks, and explicit locking are correctly applied. Operations that compare and update a contested version, allocate a unique resource, transfer ownership, change authorization epochs, or enforce a multi-row invariant must use optimistic version checks, `SELECT ... FOR UPDATE`, advisory locking with a documented key, or `SERIALIZABLE` isolation as appropriate.

The choice must be local to the invariant. The system must not globally raise isolation to hide missing invariants or authorization checks.

### 10.3 Retry policy

Serialization failures and deadlocks may be retried only for idempotent, bounded transaction operations. The baseline permits at most three retries with bounded jitter. A retry must rebuild the transaction context and re-run authorization-sensitive checks; it must not replay a stale authorization decision or stale organization context.

Unique-constraint conflicts are not blindly retried. They map to a domain conflict after verifying that the caller is authorized to learn the relevant conflict. Missing rows and cross-organization rows must not be distinguishable through unauthorized error details.

### 10.4 Optimistic and pessimistic concurrency

Records with competing updates use an integer or equivalent monotonic version field for optimistic concurrency. An update must include the version it read and fail with a conflict when the version has changed.

Pessimistic locks are permitted for short, well-defined invariants such as ownership transfer or authorization epoch changes. Locks must be taken in a stable order, held only within the transaction, and covered by contention and timeout tests.

### 10.5 Idempotency

G-003 requires idempotency at persistence boundaries for commands that may be retried by the caller or a future G-004 execution system. An idempotency key is scoped to the organization and principal or client authority, names the action, and stores the resulting status/reference according to the owning module's policy.

G-003 does not define durable job or event idempotency. G-004 owns event and job envelopes, retries, deduplication, and reliable publication. Persistence repositories must nevertheless expose atomic uniqueness and transaction primitives needed by G-004.

### 10.6 Authorization-sensitive consistency

Membership, role, grant, principal, delegation, credential-reference, and authorization-epoch changes commit atomically with their audit record. A sensitive action must not observe a partial change. A session or request that uses a stale epoch is denied or revalidated before a side effect.

G-003 does not implement authorization. It guarantees that the storage primitives cannot silently split an authorization-sensitive state change from its required audit and epoch update.

### 10.7 Audit consistency

For a state-changing action that must be audited, the business-state change and the audit record commit in the same database transaction. If either fails, neither commits. External side effects must not be performed inside this transaction; G-004 defines reliable post-commit work and publication.

## 11. Multi-tenancy and organization isolation

### 11.1 Record classes

Every persistent record is classified before its schema is created:

1. **Organization-owned:** belongs to one organization and must carry a non-null organization foreign key. This is the default.
2. **Platform-global:** contains no tenant business data and is explicitly owned by the platform. It must not be used to bypass organization authorization.
3. **Cross-organization/platform:** not permitted in the baseline. A future feature requiring deliberate sharing must define the relationship, consent, authorization, audit, export, and revocation model in a separate approved decision.

A record that can reveal, affect, or be acted upon for one organization is organization-owned unless an explicit decision proves otherwise.

### 11.2 Mandatory organization context

Every repository operation that can access an organization-owned record requires a trusted organization context containing at least the organization ID, principal ID/kind, membership or credential reference, authorization epoch, correlation ID, and scope required by G-002.

A client-supplied organization ID is a selection input only. The server must derive and validate the organization context from authenticated identity, membership, principal, session, delegation, or credential data before opening a tenant transaction.

Missing, stale, mismatched, or unverifiable organization context fails closed before query execution. There is no default organization, implicit last-used organization, or nullable tenant context for tenant-owned access.

### 11.3 Application query scoping

Repository methods for organization-owned records require the organization context in their type or method input. The repository applies organization scope to selects, inserts, updates, deletes, counts, aggregates, exports, and relationship queries. A method that accepts only a record ID is not sufficient for a tenant-owned lookup.

Cross-organization queries do not exist in the baseline. Platform administration that genuinely requires multi-organization reporting must use a separate, explicitly named platform-scope repository method, a platform principal, an approved permission, a documented reason, and audit output. It must not be implemented as an optional organization filter.

### 11.4 Transaction scoping and background context

The organization context is established before the tenant transaction begins and is bound to the transaction. Background, scheduled, webhook, integration, automation, and AI execution paths must carry an explicit organization context and principal as part of their future execution envelope. G-004 owns the durable envelope, but G-003 rejects persistence access when the envelope is absent or mismatched.

A connection pool must never retain tenant context across transactions. RLS session settings are transaction-local and reset when the transaction ends. Connection cleanup must be tested for context leakage.

### 11.5 Row-level security

PostgreSQL row-level security is part of the baseline defense-in-depth strategy for organization-owned tables. RLS policies compare the row's organization ID with a transaction-local, server-set organization context. The application authorization decision remains primary; RLS is a second boundary that prevents accidental cross-organization reads or writes when application code is defective.

The application must set RLS context only after validating the trusted organization context. Client input must never be copied directly into a database setting. The application connection role must not own tenant tables or have a bypass privilege in ordinary runtime access. Migration and controlled administrative roles are separate and must not be available to request handlers.

RLS policies must fail closed when the organization setting is absent, malformed, or mismatched. Platform-global tables use explicit repository boundaries and do not become an escape route to tenant data. Platform-scope access requires a separately authorized path and an explicitly designed policy; it is not achieved by disabling RLS in ordinary code.

RLS does not replace G-002 authorization. A principal with a valid organization context but insufficient permission must still receive an authorization denial even if the database would return the row.

### 11.6 Database defense in depth

The baseline isolation layers are:

1. G-002 server-side identity and authorization.
2. Required organization context in repository contracts.
3. Non-null organization foreign keys on tenant-owned records.
4. Composite organization-aware uniqueness and foreign-key design.
5. Transaction-local RLS context and policies.
6. Database roles that cannot bypass RLS during ordinary requests.
7. Organization-isolation, context-leakage, and negative security tests.
8. Auditable, explicitly named platform-scope exceptions.

No single layer is sufficient. UI filtering, route filtering, or a convention without database enforcement is not acceptable.

## 12. Schema ownership and module boundaries

### 12.1 Ownership

The module that defines a record's business meaning owns its table or persistence boundary, repository contract, migration files, lifecycle, authorization requirements, audit behavior, and data-retention interface. Platform-owned records include organizations, identity linkage, memberships, teams, roles, permissions, grants, principals, sessions, delegations, and audit records once those modules are implemented under G-002 and G-003.

Applications own application-specific records. Plugins and integrations may own only records allowed by their approved extension contracts. No application, plugin, integration, or optional module may write directly to another module's private tables.

### 12.2 Cross-module access

Cross-module access uses published commands, queries, read models, or explicitly owned projections. A module may reference another module's immutable public identifier and may use a database foreign key only when the owning module's contract and lifecycle permit it. It may not import private persistence models, compose arbitrary joins across private tables, or mutate another module's record.

A shared table is permitted only for a genuinely shared platform concept with one owner. “Shared” must not mean “all modules can write it.”

### 12.3 Tables and schemas

The implementation may use PostgreSQL schemas to make module ownership visible, but schema names and physical layout must not replace public contracts or organization authorization. A migration must declare the owning module and the intended access boundary.

G-003 does not create any table. The first schema implementation must include ownership metadata, organization classification, authorization and audit behavior, migration tests, and the relevant G-002/G-003 decision references.

## 13. Soft deletion and lifecycle

There is no universal soft-delete policy. Each module selects lifecycle states based on business meaning and records the choice in its module documentation and migration plan.

- **Hard deletion:** permitted only when legal, retention, referential, audit, and recovery requirements allow it and an explicit command is authorized. It must not erase required audit history.
- **Soft deletion:** permitted when restoration, legal hold, or historical relationships require it. A soft-deleted record is not automatically inaccessible; authorization must still be evaluated.
- **Archival:** permitted for records that leave the active workflow but remain part of the organization history. Archived records remain scoped and access-controlled.
- **Suspension:** represents a security or lifecycle denial, not deletion. Suspended identities, memberships, organizations, principals, credentials, or sessions must fail their G-002 checks.
- **Audit records:** append-oriented and protected from ordinary hard or soft deletion. Redaction, if ever required, must preserve accountability and use a separately controlled process.
- **Uniqueness after deletion:** the default is to preserve the unique value and identity reference. Reuse requires a module-specific decision and a database constraint that prevents ambiguity.
- **Restore:** restoration is a controlled lifecycle transition that revalidates organization, authorization, references, uniqueness, and audit requirements. Backup restoration operations belong to G-009.

Soft deletion is never a substitute for revocation, authorization, RLS, or organization isolation.

## 14. Audit persistence

G-002 requires audit semantics. G-003 selects the following persistence characteristics without selecting the complete retention or operations model.

### 14.1 Append-oriented records

Audit records are append-oriented. Ordinary application code cannot update or delete them. A controlled redaction or legal process, if later required, must produce a new audit event and preserve the original event's integrity evidence according to the future security and operations policy.

Audit rows carry an immutable event identifier, schema version, event time, actor/principal, organization or explicit platform scope, action, resource type, target reference, authorization result, policy basis, outcome, error category, correlation/causation references, and relevant delegation or approval references. Secrets, raw tokens, and unnecessary sensitive payloads are excluded.

### 14.2 Organization scope and indexing

Organization-scoped audit records carry a non-null organization ID and are protected by the same repository scope and RLS strategy as other tenant-owned records. Platform-global identity or security events use explicit platform scope and reference an affected organization when known.

The audit persistence design must support indexes for organization, event time, actor, event type, target, authorization outcome, and correlation ID. Indexes must support the expected audit queries without creating an unscoped audit read path.

### 14.3 Transaction relationship

Audit records for membership, role, grant, principal, delegation, credential-reference, session-revocation, organization-lifecycle, or other security-sensitive state changes commit in the same transaction as the change. Audit records for external side effects may be created in the action transaction and linked to G-004 post-commit execution, but G-004 owns reliable publication and delivery.

### 14.4 Retention interface

The audit module exposes a retention and export interface without selecting a retention duration, backup policy, archive provider, or deletion operation. Retention, backup, restoration, and production audit operations remain G-008/G-009 concerns where applicable.

## 15. Secrets and sensitive fields

### 15.1 Passwords and sessions

G-002 prohibits Business OS password storage in the baseline. G-003 must not create password fields or password-reset records.

Raw session tokens are never stored. The session boundary stores a cryptographic hash or keyed digest sufficient to validate a presented token without recovering it. Token values must not appear in logs, audit records, errors, test fixtures, snapshots, or migration literals.

### 15.2 Credentials and provider subjects

G-003 stores external credential references and lifecycle metadata only. Provider-specific secrets, OAuth tokens, API keys, refresh tokens, and recovery material are owned by the G-007 integration/provider contract and delivered through the G-009 operational secret mechanism. G-003 does not select a secret-management vendor.

Provider-qualified identity subjects are sensitive identifiers. They must be minimized, access-controlled, and protected according to the provider contract. They are not authorization identifiers and must not be used as public record IDs.

### 15.3 Sensitive business data

Modules classify sensitive business fields before schema implementation. Database access is least privilege. Encryption at rest and transport are required operational controls, while field-level encryption is selected only when the module's threat model requires it. Encryption keys, rotation, recovery, and operational access belong to G-009 or the applicable provider/storage gate.

Sensitive values must not be written to logs, audit payloads, error messages, fixtures, or generated SQL. Test data must be synthetic and must exercise redaction and access-denial behavior.

## 16. Migration system and repository policy

### 16.1 Tool and location

The baseline migration runner is **node-pg-migrate**. Migration definitions are plain SQL or SQL-backed migration files stored under the owning module's repository migration directory, with the shared runner and conventions under the database infrastructure boundary. The conceptual default is:

```text
infrastructure/database/migrations/<module>/
```

A module may use a more specific owned location if the repository structure and architecture check make ownership explicit. No migration file is created by this decision closure.

### 16.2 Naming and ordering

Migration names use an immutable UTC timestamp, an ordered sequence, the owning module, and a concise operation, for example:

```text
20260916093000_platform_add_membership_epoch.sql
```

The migration identifier is unique and immutable after merge. Ordering is determined by the migration runner and verified in CI. A migration must declare its owner, purpose, affected record classes, organization-isolation impact, compatibility impact, forward verification, and rollback or forward-recovery plan.

### 16.3 Forward migration and rollback

Production migrations are forward-only once applied to a shared environment. A down migration may exist for disposable local/test databases only when reversal is safe and tested. Destructive changes require an expand-and-contract plan, data backup or export assessment, compatibility window, explicit approval, and a forward recovery procedure.

Migrations must be deterministic, non-interactive, idempotent only where the migration runner's identity model requires it, and free from hidden hosted-platform steps. Data backfills must be source-controlled, bounded, resumable, and separately reviewed.

### 16.4 Drift and CI

CI must run migrations against a clean supported PostgreSQL instance, verify the resulting schema or generated database types, run migration tests, and detect uncommitted schema drift. A clean checkout must produce the same schema as the repository migration history.

CI must fail on out-of-order migrations, duplicate identifiers, missing ownership metadata, unsafe destructive operations, unreviewed generated changes, migration files outside approved locations, or RLS/policy changes without isolation tests.

### 16.5 Review and production execution

Every migration receives review from the owning module and a persistence/security reviewer when it affects organization scope, RLS, credentials, sessions, membership, grants, audit, or destructive lifecycle. The migration is executed by a controlled deployment process with a least-privilege migration identity. Request handlers never run arbitrary migrations.

G-009 owns production deployment choreography, environment promotion, operational observability, backup readiness, and incident response. G-003 owns migration semantics and repository policy.

## 17. Local development and test workflow

After G-003 approval and implementation, a future engineer must be able to:

1. Clone the repository from GitHub.
2. Install the repository-pinned Node.js and pnpm toolchain.
3. Start a standard PostgreSQL 16-or-later test instance using documented, portable commands.
4. Configure a safe local connection URL and non-secret test values.
5. Run the repository migration command against the local database.
6. Run unit, contract, integration, architecture, migration, and end-to-end tests.
7. Reset the test database deterministically without a hosted platform.

The eventual implementation must document connection variables such as a safe `DATABASE_URL` placeholder, migration command, test database lifecycle, RLS test setup, and cleanup behavior. This decision closure does not add those variables or commands to the runtime foundation.

## 18. Backup and recovery boundary

G-003 decides that committed database state must be durable according to PostgreSQL's transaction guarantees and must be compatible with standard backup and point-in-time recovery mechanisms. Audit, authorization-sensitive records, and tenant data must not rely on ephemeral process memory.

G-009 owns the production durability objective, backup frequency, retention, encryption, restore testing, disaster-recovery targets, failover, replication, operational access, and incident runbook. G-008 owns file/storage backup and restoration policy where applicable. G-003 does not select a backup provider or claim that production recovery is implemented.

A future database implementation must prove that a committed transaction is not acknowledged as successful until PostgreSQL durability requirements are met for the configured deployment. It must also test restore compatibility before production use, under G-009 operations.

## 19. Persistence-specific threat model

| Threat | Required control | Test that must prove it |
|---|---|---|
| Cross-organization query leakage | Mandatory organization context, repository scoping, non-null organization FK, RLS, and least-privilege roles | A principal in Organization A cannot read, count, update, delete, or export Organization B data through any repository path |
| Missing organization predicate | Require organization context in repository contracts and fail closed in RLS | Execute a tenant query without context; it fails before or at the database boundary |
| Forged organization ID | Validate the target organization through G-002 membership/principal context before transaction setup | Submit Organization B while authorized only for A; request is denied and no B query succeeds |
| Repository bypass | Private tables and persistence models remain module-owned; cross-module access uses public contracts | Attempt a private-table import or direct mutation; architecture checks and code review reject it |
| Accidental unrestricted query | Prohibit unscoped repository methods and use RLS as defense in depth | Static/architecture check plus runtime query test proves tenant methods require scope |
| Incorrect composite uniqueness | Database composite unique constraints include organization where scope requires it | Concurrently create same scoped natural key in A and B and same key twice in A; only the latter conflicts |
| Stale authorization epoch | Atomically update epoch with security changes and compare before side effects | Revoke membership or grant after context creation; stale transaction is denied or revalidated |
| Transaction race during membership/role changes | Explicit locks/version checks, transaction boundaries, and same-transaction audit | Concurrent role/membership updates produce one valid outcome and complete audit records |
| Audit record mutation | Append-oriented table permissions and controlled redaction process | Ordinary application principal cannot update or delete an audit record |
| Migration drift | Ordered repository migrations, clean-schema CI, generated-schema comparison, and drift checks | Modify schema outside migrations; CI fails |
| Destructive migration | Expand-and-contract, destructive review, backup/export assessment, and forward recovery | Destructive migration without required metadata or compatibility plan is rejected |
| Secret or token persistence | No passwords, raw session tokens, credentials, or provider secrets in ordinary tables or logs | Scan source, migrations, fixtures, logs, and records for prohibited secret fields and values |
| Backup exposure | G-009-controlled encryption, access, retention, and restore testing | Operational backup test proves unauthorized principal cannot access backup content |
| Global record treated as tenant-owned | Explicit record classification and repository boundary | A platform-global record cannot be used to return tenant data without an approved platform-scope path |
| Tenant record treated as global | Default organization ownership, required organization FK, RLS | Attempt to create tenant data without organization scope; constraint or repository rejects it |
| Background access without organization context | Future execution envelope must contain organization and principal context; repository fails closed | Run a background-like persistence call without context; no tenant query executes |
| Concurrent authorization-sensitive updates | Version checks or short explicit locks, reauthorization after retry, atomic audit | Concurrent grant, delegation, epoch, or revocation changes cannot commit an unauthorized stale result |
| Session-context leakage through pool reuse | Transaction-local RLS settings and connection reset tests | Alternate organizations over one pool and prove no context crosses transactions |

## 20. Testing strategy

### 20.1 Unit tests

Unit tests cover identifier validation, time conversion and precision, lifecycle transitions, version checks, conflict mapping, repository authorization-context requirements, migration metadata validation, audit event mapping, and secret redaction.

### 20.2 Repository and integration tests

Real PostgreSQL integration tests cover:

- Tenant isolation for reads, writes, counts, aggregates, relationships, exports, and deletes.
- Organization-scoped queries and mandatory context.
- Organization and membership uniqueness.
- Role/grant and delegation uniqueness where applicable.
- Foreign-key behavior and lifecycle transitions.
- RLS policies with missing, valid, mismatched, and platform-scope contexts.
- Transaction consistency and same-transaction audit writes.
- Serialization, deadlock, optimistic-version, and uniqueness race handling.
- Authorization epoch updates and stale-context rejection.
- Session revocation persistence without storing raw tokens.
- Migration correctness, ordering, repeatability, and drift detection.
- Sensitive-field protection, log redaction, and prohibited secret persistence.
- Platform-global versus tenant-owned record boundaries.
- Connection-pool context cleanup.

### 20.3 Migration tests

Every migration sequence is tested from an empty database and from the previous supported schema version where compatibility is required. Tests verify ownership metadata, organization classification, constraints, indexes, RLS policies, audit relationships, forward recovery, and generated types. Destructive migrations require explicit negative tests for unsafe rollout.

### 20.4 Security-negative tests

The test suite must prefer denial proofs over happy-path-only coverage. It must attempt forged organization IDs, missing predicates, unscoped repository access, cross-organization joins, stale epochs, revoked sessions, unauthorized platform-scope access, role/grant races, direct audit mutation, secret leakage, and pool-context confusion.

### 20.5 Test data and clocks

Test data is synthetic and organization-separated. Each test creates explicit organization context rather than relying on a global fixture. Time-sensitive tests use an injected fake clock for application decisions and database-controlled timestamps where persistence ordering matters. Tests must not depend on local timezone or wall-clock coincidence.

## 21. Explicit gate boundaries

| Gate | Preserved boundary |
|---|---|
| G-002 | G-003 stores records required by G-002 but does not change identity, authentication, session, membership, authorization, delegation, assurance, revocation, or audit semantics |
| G-004 | Durable events, queues, schedulers, jobs, retries, idempotent event processing, reliable publication, and durable approval execution remain deferred |
| G-005 | Plugin runtime, package, manifest, isolation, review, versioning, and lifecycle remain deferred |
| G-006 | AI provider/model/retrieval/runtime policy, cost controls, and human-approval implementation remain deferred |
| G-007 | External identity provider/vendor implementation, provider SDK, OAuth/API keys, integration credentials, and provider callbacks remain deferred |
| G-008 | File/storage implementation, retention, export, deletion, and restoration remain deferred |
| G-009 | Production deployment, database operations, backups, disaster recovery, observability, incident response, and production secret delivery remain deferred |
| G-010 | Entitlements, application installation, and marketplace governance remain deferred |

G-003 does not build an outbox, event table, job table, queue, credential vault, file store, or production database.

## 22. Decision classification

The following classifications are normative for this proposal.

| Concern | Classification | Resolution |
|---|---|---|
| PostgreSQL engine and support window | **DECIDED** | PostgreSQL 16 or later, with current-major plus two preceding supported majors within the repository support window |
| SQL-first Kysely/`pg` persistence | **DECIDED** | Type-safe query builder and driver remain in infrastructure adapters; no ORM entities in domain/application code |
| Migration runner and repository policy | **DECIDED** | `node-pg-migrate`, repository-owned plain SQL migration files, immutable ordering, CI drift checks, forward-first production policy |
| UUIDv7 identifiers | **DECIDED** | Application-generated immutable UUIDv7 values stored as PostgreSQL `uuid` |
| UTC instant and precision policy | **DECIDED** | `timestamptz`, UTC instants, microsecond database precision, RFC 3339 boundaries, injected clocks |
| Transaction and concurrency baseline | **DECIDED** | `READ COMMITTED`, explicit locks/version checks for invariants, bounded retry for serialization/deadlock failures |
| Organization isolation and RLS | **DECIDED** | Mandatory trusted context, organization-aware repositories, non-null tenant FKs, transaction-local RLS, no default cross-organization query |
| Schema ownership | **DECIDED** | Owning module owns records, repositories, migrations, lifecycle, authorization requirements, and audit behavior |
| Soft deletion and lifecycle | **DECIDED** | No universal soft delete; domain-specific lifecycle; audit append orientation; no automatic security meaning |
| Audit persistence characteristics | **DECIDED** | Append-oriented, scoped, indexed, and transactionally coupled to sensitive state changes |
| Secret and token persistence | **DECIDED** | No passwords or raw tokens; hashed session identifiers and external secret references only |
| Backup, restore, and production database operations | **DEFERRED TO A SPECIFIC LATER GATE** | G-009 owns production durability objectives and operations; G-008 owns file/storage recovery where applicable |
| Reliable events and durable async work | **DEFERRED TO A SPECIFIC LATER GATE** | G-004 owns publication, queues, jobs, retries, and approval execution |
| External provider and credential implementation | **DEFERRED TO A SPECIFIC LATER GATE** | G-007 owns provider selection, SDKs, callbacks, credentials, and external recovery |
| G-003 conceptual scope | **DECIDED** | No unresolved conceptual blocker remains within database, persistence, and tenancy decision scope |

## 23. Open blockers

There is no unresolved conceptual blocker within G-003 scope. The proposal has explicit dependencies on G-004, G-007, G-008, and G-009, but those are intentional gate boundaries rather than missing G-003 decisions.

If PostgreSQL, SQL-first persistence, UUIDv7, or RLS cannot be implemented without changing G-002 semantics, implementation must stop and produce an architecture amendment. No such conflict is identified by this decision closure.

## 24. Acceptance criteria

G-003 may be marked accepted only when the maintainer confirms that:

1. PostgreSQL is selected as the portable baseline engine with an explicit supported-version policy.
2. Local development, test execution, and production compatibility do not require Manus or a hosted vendor.
3. The SQL-first Kysely/`pg` persistence approach and repository ownership model are explicit.
4. Domain/application code remains free of persistence framework, PostgreSQL driver, and provider-specific dependencies.
5. Transaction ownership, isolation, retry, locking, optimistic concurrency, uniqueness races, and idempotency semantics are explicit.
6. UUIDv7 identifier generation, immutability, foreign keys, composite uniqueness, natural-key policy, and migration policy are explicit.
7. UTC time, `timestamptz`, precision, clock source, expiration, ordering, and fake-clock requirements are explicit.
8. Organization-owned, platform-global, and prohibited cross-organization records are explicitly distinguished.
9. Organization context is mandatory for tenant access, and accidental unscoped access fails closed.
10. Application authorization remains primary and PostgreSQL RLS provides defense in depth without bypass privileges for ordinary request paths.
11. Schema ownership, cross-module access, private-table protection, and migration ownership preserve modular-monolith boundaries.
12. Soft deletion, archival, suspension, audit lifecycle, uniqueness after deletion, and restore semantics are explicit.
13. Audit persistence is append-oriented, scoped, indexed, and transactionally coupled to security-sensitive state changes.
14. Passwords and raw session tokens are prohibited from persistence; credential secrets remain references governed by G-007/G-009.
15. Migration location, naming, ordering, forward execution, rollback/recovery, drift detection, CI validation, review, and destructive-change policy are explicit.
16. Local and test database workflows are portable and exercise real PostgreSQL constraints, transactions, RLS, and migrations.
17. Backup and recovery responsibilities are explicitly bounded to G-009 and G-008.
18. The proposal preserves all approved G-002 semantics, including opaque identity references, organization membership, authorization epochs, session revocation, principal kinds, delegation, and audit requirements.
19. Threats map to controls and concrete tests, including cross-organization leakage, missing context, RLS failure, migration drift, audit mutation, secret persistence, and connection-pool leakage.
20. G-004 through G-010 remain unresolved where specified and no later gate is silently implemented.
21. No schema, migration, database package, ORM model, authentication persistence, application record, or runtime infrastructure is introduced by G-003 decision closure.

## 25. Decision record

### Proposed decision

Adopt this document as the G-003 database, persistence, and tenancy contract with these concrete defaults:

- PostgreSQL 16 or later with a documented supported-major window.
- Portable, independently deployable PostgreSQL rather than a Manus-managed database.
- SQL-first Kysely repositories using the `pg` adapter, with repository contracts separated from domain/application code.
- `node-pg-migrate` and repository-owned, ordered, reviewable SQL migrations.
- Application-generated immutable UUIDv7 identifiers stored as PostgreSQL `uuid`.
- UTC instants in `timestamptz`, microsecond persistence precision, RFC 3339 boundaries, and injected clocks.
- Application-owned transactions at use-case boundaries with `READ COMMITTED`, explicit concurrency controls, bounded retries, and database-enforced uniqueness.
- Mandatory organization context, organization-aware repositories, organization foreign keys, transaction-local RLS, and no general cross-organization query.
- Module-owned tables, repositories, migrations, lifecycle, authorization requirements, and audit behavior.
- No universal soft deletion and append-oriented audit persistence transactionally coupled to sensitive changes.
- No passwords or raw tokens; hashed session identifiers and external secret references only.
- G-004, G-007, G-008, and G-009 remain responsible for their explicitly deferred concerns.

### Current decision status

**G-003: PENDING MAINTAINER APPROVAL.** This document is a decision-closure proposal only. It must not be treated as accepted until the maintainer records approval in `docs/DECISIONS.md`.

### Required record after approval

The acceptance record must include the approval date, maintainer or owner, this document's commit, any approved deviations, and the statement that implementation remains bounded by G-002 and gated by G-004 through G-010 where identified above.

## References

[1]: ../AGENTS.md "Business OS Contributor Guidance"
[2]: ../README.md "Business OS Repository Overview"
[3]: ARCHITECTURE.md "Business OS Architecture"
[4]: DATABASE.md "Business OS Database Architecture"
[5]: MULTI-TENANCY.md "Business OS Multi-Tenancy"
[6]: PERMISSIONS.md "Business OS Permissions"
[7]: SECURITY.md "Business OS Security"
[8]: REPOSITORY-STRUCTURE.md "Business OS Repository Structure"
[9]: DECISIONS.md "Business OS Architecture Decisions"
[10]: G-001-DECISION-CLOSURE.md "Business OS G-001 Decision Closure"
[11]: G-002-DECISION-CLOSURE.md "Business OS G-002 Identity and Authorization Decision Closure"
