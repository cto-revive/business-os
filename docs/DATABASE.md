# Business OS Database Architecture

## Purpose and current boundary

The database architecture must support a multi-tenant Business OS without prematurely freezing schemas for applications that have not yet been designed. This document establishes ownership, isolation, migration, and lifecycle rules. G-003 is now approved and selects PostgreSQL 16 or later, SQL-first Kysely/`pg` persistence adapters, UUIDv7 identifiers, UTC `timestamptz` values, repository organization context, and PostgreSQL row-level security as defense in depth. It does not authorize product schemas or application records.

## Data ownership

Platform-owned data will support organizations, user identity linkage, memberships, teams, roles, permissions, shared tasks, files, comments, notifications, events, search metadata, and audit logs. Each business application will own the data required by its domain. Plugins and integrations may persist only the data allowed by their published extension contracts; they do not gain unrestricted access to core or application data.

A record is either platform-global, organization-owned, or explicitly shared under a documented cross-organization policy. Organization-owned data is the default. Each owner must document the lifecycle, retention requirements, audit requirements, and deletion behavior of its records before implementing a schema.

## Organization isolation

Every organization-owned row must have an organization identifier or an equivalent, verifiable organization scope. The organization scope must be applied consistently in request paths, database queries, indexes, foreign-key relationships, background jobs, events, search documents, cache keys, file metadata, and audit entries. A single missing filter is an isolation defect.

The approved enforcement combination is mandatory query-layer organization scoping plus PostgreSQL row-level security on organization-owned tables. RLS is defense in depth and does not replace application authorization. The implementation must fail closed for missing context and be tested against cross-organization access attempts. Details are recorded in [`G-003-DECISION-CLOSURE.md`](G-003-DECISION-CLOSURE.md).

## Migration policy

All schema changes must be represented as version-controlled migrations in this repository. Migrations must be ordered, deterministic, reviewable, and executable in a standard deployment environment. They must not depend on a manual console step or an undocumented hosted-platform configuration.

For production evolution, use an expand-and-contract approach when a change must remain compatible with running application versions. Introduce compatible structure first, backfill through source-controlled jobs where necessary, migrate readers and writers, then remove obsolete structure in a later migration. Destructive changes require an explicit data-retention and rollback plan.

The future migration convention must record the module owner, purpose, forward operation, compatibility impact, and verification procedure. Rollback is preferred when safe; when data transformations make reversal unsafe, the migration must state a forward recovery procedure.

## Data integrity and events

Business rules should preserve data integrity at the closest reliable boundary. A database constraint is appropriate for invariants that must hold regardless of caller. Domain-level validation is appropriate for rules that depend on policy or workflow context. Authorization is not replaced by either validation or a constraint.

When a committed change must lead to automation, integrations, notifications, search updates, or AI work, the implementation must avoid silently losing the resulting event. Reliable publication remains a G-004 decision; G-003 provides transaction boundaries and does not create an outbox or durable event system.

## Data lifecycle and recovery

Each module must document retention, archival, restoration, export, and deletion expectations before storing material data. Audit records require special protection because they support accountability and incident investigation. Backups, restoration testing, encryption, and access logging are deployment controls described in [`SECURITY.md`](SECURITY.md) and [`DEPLOYMENT.md`](DEPLOYMENT.md).

## Pre-implementation decisions

Before product or identity persistence is implemented, the project must use the approved G-003 database technology, migration tool, identifier strategy, time representation, tenancy enforcement strategy, and indexing conventions. Backup objectives and reliable event publication remain G-009 and G-004 decisions respectively. Those choices must preserve the rules in this document rather than reverse them.

## References

[1]: ARCHITECTURE.md 'Business OS Architecture'
[2]: MULTI-TENANCY.md 'Business OS Multi-Tenancy'
[3]: SECURITY.md 'Business OS Security'
[4]: DEPLOYMENT.md 'Business OS Deployment'
[5]: DECISIONS.md 'Business OS Architecture Decisions'
