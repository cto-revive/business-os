# Business OS Database Architecture

## Purpose and current boundary

The database architecture must support a multi-tenant Business OS without prematurely freezing schemas for applications that have not yet been designed. This document establishes ownership, isolation, migration, and lifecycle rules. It intentionally defines **no database tables** and chooses no database engine, object-relational mapper, or tenancy mechanism.

## Data ownership

Platform-owned data will support organizations, user identity linkage, memberships, teams, roles, permissions, shared tasks, files, comments, notifications, events, search metadata, and audit logs. Each business application will own the data required by its domain. Plugins and integrations may persist only the data allowed by their published extension contracts; they do not gain unrestricted access to core or application data.

A record is either platform-global, organization-owned, or explicitly shared under a documented cross-organization policy. Organization-owned data is the default. Each owner must document the lifecycle, retention requirements, audit requirements, and deletion behavior of its records before implementing a schema.

## Organization isolation

Every organization-owned row must have an organization identifier or an equivalent, verifiable organization scope. The organization scope must be applied consistently in request paths, database queries, indexes, foreign-key relationships, background jobs, events, search documents, cache keys, file metadata, and audit entries. A single missing filter is an isolation defect.

The precise enforcement combination—such as query-layer scoping, database row-level security, separate databases, or another mechanism—remains unresolved. The selected approach must provide defense in depth and be tested for cross-organization access attempts. The choice is recorded as an implementation gate in [`DECISIONS.md`](DECISIONS.md).

## Migration policy

All schema changes must be represented as version-controlled migrations in this repository. Migrations must be ordered, deterministic, reviewable, and executable in a standard deployment environment. They must not depend on a manual console step or an undocumented hosted-platform configuration.

For production evolution, use an expand-and-contract approach when a change must remain compatible with running application versions. Introduce compatible structure first, backfill through source-controlled jobs where necessary, migrate readers and writers, then remove obsolete structure in a later migration. Destructive changes require an explicit data-retention and rollback plan.

The future migration convention must record the module owner, purpose, forward operation, compatibility impact, and verification procedure. Rollback is preferred when safe; when data transformations make reversal unsafe, the migration must state a forward recovery procedure.

## Data integrity and events

Business rules should preserve data integrity at the closest reliable boundary. A database constraint is appropriate for invariants that must hold regardless of caller. Domain-level validation is appropriate for rules that depend on policy or workflow context. Authorization is not replaced by either validation or a constraint.

When a committed change must lead to automation, integrations, notifications, search updates, or AI work, the implementation must avoid silently losing the resulting event. A transactional-outbox or equivalent reliable event-publication pattern is expected, but its exact implementation is deferred until the runtime stack is selected.

## Data lifecycle and recovery

Each module must document retention, archival, restoration, export, and deletion expectations before storing material data. Audit records require special protection because they support accountability and incident investigation. Backups, restoration testing, encryption, and access logging are deployment controls described in [`SECURITY.md`](SECURITY.md) and [`DEPLOYMENT.md`](DEPLOYMENT.md).

## Pre-implementation decisions

Before the first migration, the project must select the database technology, migration tool, identifier strategy, time representation, tenancy enforcement strategy, indexing conventions, backup objectives, and the reliable event-publication mechanism. Those choices must preserve the rules in this document rather than reverse them.

## References

[1]: ARCHITECTURE.md "Business OS Architecture"
[2]: MULTI-TENANCY.md "Business OS Multi-Tenancy"
[3]: SECURITY.md "Business OS Security"
[4]: DEPLOYMENT.md "Business OS Deployment"
[5]: DECISIONS.md "Business OS Architecture Decisions"
