# G-004 Pre-Implementation Audit

## Audit conclusion

The current repository is ready for a **revised G-004 implementation plan**, but not yet for implementation under the proposal exactly as written. The repository contains only the G-001 runtime foundation, the G-003 persistence contracts and PostgreSQL audit adapter, and the G-004 governance proposal. No durable event, outbox, queue, job, scheduler, retry, idempotency, or approval runtime exists.

The proposed architecture remains compatible with G-001, G-002, and G-003. One material boundary must be resolved before implementation: the current G-003 transaction contract carries organization and platform context but does not expose a framework-free transaction-scoped persistence capability. The current audit repository also opens its own transaction. That shape cannot atomically commit a business-state change, its audit record, and its outbox record in one use-case-owned transaction. G-004 must add a transaction-aware contract or an equivalent persistence unit-of-work port without exposing Kysely, `pg`, or PostgreSQL types.

G-004 remains **PROPOSED — PENDING MAINTAINER APPROVAL**. This audit does not approve G-004 and introduces no runtime implementation.

## A. Audit findings

### 1. Actual repository structure and placement

The repository currently contains seven packages:

| Package | Layer | Owner | Current role |
|---|---|---|---|
| `@business-os/shared-contracts` | shared | platform-foundation | Small cross-boundary contracts. |
| `@business-os/shared-validation` | shared | platform-foundation | Framework-free validation helpers. |
| `@business-os/runtime-config` | foundation | platform-foundation | Portable runtime configuration. |
| `@business-os/api-edge` | delivery | execution-api | Minimal API process edge and health startup. |
| `@business-os/worker-edge` | delivery | execution-worker | Minimal worker process edge and startup. |
| `@business-os/persistence-contracts` | shared | platform-foundation | Framework-free organization, platform, transaction, repository, and audit contracts. |
| `@business-os/persistence-postgres` | infrastructure | database | Kysely, `pg`, PostgreSQL RLS context, transactions, UUIDv7, and audit adapter. |

The conceptual repository structure already reserves `platform/events`, `execution/jobs`, `execution/automation`, `infrastructure/queue`, and `infrastructure/database`. Those directories do not exist as implementation directories, and they should not be created merely as placeholders.

The recommended first G-004 placement is:

- `packages/execution-contracts`: framework- and provider-free event, publication, queue, job, scheduler, retry, idempotency, approval, execution, and transaction-aware port contracts.
- `packages/execution-runtime`: provider-neutral orchestration and state-transition logic only after the contract shape is settled.
- Existing `packages/persistence-contracts`: extend only if the transaction-aware capability is a genuinely shared persistence boundary rather than duplicating it in execution contracts.
- Existing `packages/persistence-postgres`: add the PostgreSQL adapter for G-004 records and transaction participation; do not create a second PostgreSQL package.
- `infrastructure/database/migrations/execution/`: execution-owned migrations, only when implementation is approved.
- `infrastructure/queue/<adapter>` and `infrastructure/scheduler/<adapter>`: create only if a concrete adapter is needed. The initial design does not require an external broker or hosted scheduler.
- `tests/unit/execution`, `tests/contract/execution`, and `tests/integration/execution`: create with meaningful tests during implementation, not during this audit.

The existing `api-edge` and `worker-edge` remain delivery/composition roots. They should depend on execution contracts or runtime only when an approved implementation requires process wiring. They should not own execution semantics.

### 2. Package-boundary compatibility

The proposed `execution-contracts` boundary is compatible with the repository's package rules if it remains a shared, framework-free package. It may depend on a small shared identity/context vocabulary and persistence ports. It must not import PostgreSQL, Kysely, `pg`, NestJS, provider SDKs, transport clients, or Manus APIs. Its package manifest must include `exports`, `businessOs.layer`, and `businessOs.owner`, and all workspace dependencies must use the `workspace:` protocol.

The proposed `execution-runtime` boundary is also compatible if it is treated as a provider-neutral application/platform package rather than infrastructure. It may depend on execution contracts and authorization/audit ports. It must not directly import the PostgreSQL adapter, a queue client, a scheduler SDK, NestJS, or any provider implementation. It must receive clocks, UUID generation, persistence, publication, authorization, and side-effect ports explicitly so that failure and retry behavior can be tested deterministically.

The current repository has no implemented authorization package or action registry. Therefore, `execution-runtime` cannot yet depend on a concrete authorization implementation. It must depend on an authorization decision port whose semantics are supplied by the approved G-002 contract and whose implementation may arrive in a later compatible slice. G-004 must not create a parallel identity, membership, role, or permission system.

The current architecture checker enforces workspace export maps, workspace dependency declarations, package metadata, forbidden framework/provider imports, and cycle detection. It permits `pg` only in an infrastructure package. It does not yet enforce all proposed ownership rules for execution packages, so package metadata and architecture tests must be added as part of implementation rather than relying only on documentation.

### 3. Compatibility with G-003

The G-004 proposal correctly preserves these G-003 decisions:

- PostgreSQL remains the persistence engine.
- Kysely and `pg` remain infrastructure-only.
- Application-generated UUIDv7 and UTC timestamps remain the identifier and time conventions.
- Organization context is mandatory for organization-owned durable objects.
- Platform-global access uses a separate explicit path.
- PostgreSQL RLS remains defense in depth.
- The use case owns the transaction boundary.
- Audit records remain append-oriented and attributable.

There is one implementation blocker. `PersistenceTransaction` currently exposes only a context-bearing `handle` and a nested callback. It does not expose a framework-free way for an execution repository to participate in the same database transaction. `PostgresAuditRepository.append` creates a new transaction for each append. Therefore, the current public shape cannot guarantee atomicity between a future business-state repository, an audit append, and an outbox insert.

Before implementation, the G-004 design must select one of these compatible resolutions:

1. Extend the framework-free persistence boundary with a transaction-scoped unit-of-work capability whose methods are contracts, while the PostgreSQL adapter binds those methods to one Kysely transaction internally.
2. Define execution repository methods that accept a framework-free transaction token or transaction context owned by `persistence-contracts`, with adapters resolving that token to the active transaction.
3. Define a single use-case transaction coordinator port that accepts domain state, audit, and outbox operations without exposing a database handle.

The preferred resolution is the first or second option because it keeps module-owned repositories explicit and makes same-transaction behavior testable. The public contract must not expose a Kysely transaction object, a `pg` client, SQL, or a PostgreSQL-specific transaction type.

The existing `set_config(..., true)` RLS mechanism is transaction-local and suitable for G-004, but every execution record migration must define its own fail-closed RLS policies, runtime grants, indexes, and platform-global policy. The current G-003 migration and CI commands are hard-coded to the `g003` migration directory and audit table. Implementation must add an explicit execution migration command or a repository-owned migration composition mechanism rather than silently changing the existing G-003 command.

### 4. Required database and migration boundaries

G-004 must own only execution persistence. The execution migration boundary may contain tables or records for:

- Immutable outbox events and publication attempts.
- Queue messages, delivery attempts, leases, and dead-letter state.
- Durable jobs and job attempts.
- Schedules and unique schedule occurrences.
- Idempotency and consumer-deduplication records.
- Approval requests, approval decisions, and execution bindings.

The execution owner must not create identity, organization, membership, role, grant, session, credential, product, integration, file, or AI-provider tables. Foreign keys to future platform records must be introduced only when the owning module and lifecycle are defined; a G-004 implementation must not invent those schemas to make tests convenient.

Every organization-owned table requires a non-null organization identifier, explicit RLS, forced RLS where applicable, organization/time and operational indexes, least-privilege runtime grants, and negative tests. Platform-global records must use an explicit global classification and access path rather than a nullable tenant filter that permits general cross-organization reads.

Identifiers should be UUIDv7 values generated by the application boundary. Persisted instants should be UTC `timestamptz` values. Payloads should use bounded JSON data or immutable references with explicit size and retention rules. State transitions should be represented by constrained values and append-only attempt/history records where replay and recovery require evidence.

The initial implementation should use PostgreSQL-backed outbox and durable work records through the existing `persistence-postgres` adapter. This is not provider lock-in because PostgreSQL is already the approved G-003 persistence boundary, and the execution contracts remain independent of the adapter. An external broker should remain deferred unless PostgreSQL-backed throughput, isolation, or recovery evidence demonstrates a concrete need.

### 5. Remaining underspecification and ambiguity

The G-004 proposal is directionally complete but requires these details before implementation:

- **Canonical event identity:** define whether event identity is globally unique across all event versions and whether a replay retains the original event identity. The recommended rule is that replay retains event identity and creates a new delivery-attempt identity.
- **Canonical payload hashing:** define canonical serialization and hashing for approval inputs and idempotency request hashes. The implementation must use a deterministic, versioned canonical form rather than language-native object ordering.
- **Event schema evolution:** define compatibility rules for additive changes, incompatible changes, consumer support windows, and unknown fields.
- **Aggregate ordering:** define whether aggregate sequence is required for all events or only for consumers that opt into ordered processing. A database uniqueness rule should prevent duplicate `(aggregate, sequence)` values where sequence is used.
- **Outbox-to-dispatch boundary:** define the provider-neutral publication acknowledgement and the exact state transition for timeout or ambiguous acknowledgement. Ambiguous results must remain retryable and must never be treated as proven failure or proven success without evidence.
- **Queue and job distinction:** define whether queues are delivery records for jobs or independent work records. The recommended rule is that a queue message is delivery machinery and a job is the durable work identity; their identifiers and histories remain distinct.
- **Lease and fencing model:** define the fencing token type, whether every claim increments a monotonically increasing token, and how repository writes reject stale tokens. A timestamp alone is insufficient.
- **Retry policy ownership:** define which values are immutable per job/message, which are centrally configured, and how policy changes affect already-running work.
- **Clock and time zones:** define a framework-free clock port and the recurring-schedule expression format. Store the named IANA timezone and the schedule definition, but do not depend on a worker's local timezone.
- **Missed schedule behavior:** select the default for skip, run-once, or bounded catch-up and define behavior during long outages.
- **Idempotency result retention:** define how long successful, failed, and in-progress deduplication records remain and how a repeated request behaves after expiry.
- **Authorization epoch behavior:** define whether any epoch change invalidates all queued work or only sensitive work, and whether execution may be reauthorized under the new epoch. The safe baseline is to reject stale sensitive work and require a fresh policy decision.
- **Approval action registry:** define how an action name/version is resolved, how canonical inputs are validated, and what happens when the action contract is removed or superseded.
- **Approval concurrency:** define whether multiple approvers may decide concurrently, how separation of duties is enforced atomically, and whether an approval decision is immutable after recording.
- **Resource preconditions:** define required resource-version or state preconditions for actions whose target may change between approval and execution.
- **External side effects:** define the boundary between local idempotent execution and later provider-specific reconciliation. G-004 should not claim external exactly-once behavior.
- **Retention and purge:** define which operational records may be purged, which histories are audit-linked and immutable, and how deletion is authorized and recorded. Production retention and recovery operations remain G-009/G-008 concerns.

These items should be resolved in the proposal before a maintainer approves implementation, or explicitly marked as implementation-level decisions with acceptance criteria. They must not be chosen accidentally by a queue library, scheduler library, or database schema.

### 6. Tenant isolation and authorization epoch requirements

Every event, outbox record, queue message, job, schedule, idempotency record, approval, execution record, delivery attempt, and dead-letter record must carry either an immutable organization scope or an explicit platform-global scope. There must be no implicit process tenant, optional filter, or worker-default organization.

At enqueue, claim, dispatch, retry, cancellation, reconciliation, approval, and execution boundaries, the system must validate:

- Organization identity.
- Principal identity and principal kind.
- Membership, credential, or delegation reference.
- Authorization epoch.
- Scope and registered action permissions.
- Correlation and causation identifiers.
- Approval binding where required.

The executor must perform a fresh authorization decision before every sensitive side effect. A message created under an old epoch may remain available for audit or controlled reconciliation, but it must not execute a sensitive action solely because it was previously enqueued. Organization switching must create a new context and cannot reuse queue, connection, cache, or job permissions.

Required negative/security tests include:

- Organization A cannot read, claim, lease, retry, acknowledge, cancel, dead-letter, or infer Organization B records.
- An organization-scoped context cannot insert a platform-global record or forge another organization identifier.
- A platform context cannot access tenant payloads without an explicit authorized reconciliation path.
- A stale authorization epoch cannot execute a sensitive job or approved action.
- A revoked principal, expired delegation, expired credential reference, or cancelled approval fails closed.
- A queue message cannot be claimed under a different organization context.
- An approval cannot be executed after its action version, canonical input hash, target, or resource precondition changes.
- Idempotency-key reuse with a different request hash is rejected.
- A worker cannot acknowledge a lease with a stale or invalid fencing token.

### 7. Crash, lease, duplicate, and ambiguous-result testing

The implementation must test failure at each durable boundary rather than only testing successful worker execution. The required matrix includes:

- Process failure before the business transaction commits: no state change, audit record, or outbox record remains.
- Process failure after the business transaction commits but before dispatch: the outbox record remains pending and recoverable.
- Dispatcher failure after claim but before provider call: the lease expires and recovery reclaims the record.
- Provider timeout after the provider may have accepted the message: the record is retried with the same immutable event identity and a new attempt identity.
- Duplicate provider delivery: the consumer's atomic deduplication record prevents duplicate local side effects.
- Worker failure after a side effect but before acknowledgement: replay produces the same business outcome or a safe prior result.
- Concurrent claims: only one valid lease/fencing token can mutate the active attempt.
- Lease expiry during execution: the stale worker cannot acknowledge or commit a protected result after fencing.
- Heartbeat failure: recovery requeues or terminally fails according to explicit policy.
- Retry exhaustion: the record becomes dead-lettered with complete attempt history.
- Dead-letter replay: replay preserves original identity and audit history and does not mutate the immutable payload.
- Scheduler restart around an occurrence boundary: uniqueness prevents duplicate job creation.
- Clock skew or delayed worker time: persisted server/database time and injected clocks produce deterministic transitions.
- Approval execution crash: the execution binding and idempotency record prevent a second side effect after restart.
- Migration interruption and rerun: migration behavior is deterministic and leaves no partially trusted execution schema.

At least one test must use a real PostgreSQL transaction and RLS path for each tenant-owned record class. Failure injection may use an in-process fake provider, but the contract must also prove that provider ambiguity is handled without claiming exactly-once delivery.

### 8. Manus independence

The audit found no proposed dependency that would make Business OS Manus-dependent. The design remains portable because source code, migrations, configuration, tests, contracts, and architecture records remain in GitHub; PostgreSQL is a standard infrastructure dependency already selected by G-003; and provider-specific queue or scheduler implementations remain optional adapters.

The following would violate the portability rule and must be rejected if proposed later:

- A Manus API, SDK, runtime service, hosted queue, hosted scheduler, or Manus-managed database required for execution.
- Hidden Manus environment variables or project state required to claim, retry, or authorize work.
- A Manus-only worker lifecycle or deployment callback encoded in domain contracts.
- An external provider SDK imported by `execution-contracts` or `execution-runtime`.
- An approval or idempotency record stored outside repository-owned, documented infrastructure.

A human engineer or another AI coding agent must be able to clone GitHub, install the pinned dependencies, start standard PostgreSQL, run migrations, execute tests, and operate the local API/worker edges without Manus access.

## B. Required changes to the G-004 proposal

Before approval, revise the proposal or attach an approved implementation addendum that:

1. Resolves the G-003 transaction-participation gap with a framework-free transaction-aware port.
2. Defines canonical serialization and hashing for idempotency and approval binding.
3. Defines the fencing-token and stale-lease rejection model.
4. Distinguishes event identity, delivery-attempt identity, job identity, and execution identity.
5. Defines queue-versus-job ownership and lifecycle boundaries.
6. Defines authorization-epoch invalidation and reauthorization behavior.
7. Defines action-registry/version resolution and resource preconditions for approvals.
8. Defines schedule expression, timezone, missed-occurrence, and duplicate-occurrence behavior.
9. Defines retry-policy ownership, deterministic clock injection, and idempotency retention behavior.
10. Defines the migration command composition and CI privilege/grant changes needed for execution-owned tables.
11. Adds explicit acceptance criteria for real PostgreSQL RLS, transaction, lease, failure-injection, and ambiguity tests.
12. States that the first implementation uses the existing PostgreSQL adapter and no external broker or scheduler.

These are proposal clarifications. They do not authorize implementation.

## C. Recommended implementation boundary

After maintainer approval, implement the smallest coherent vertical boundary:

- `execution-contracts` owns immutable value objects, state transition rules, failure classes, context requirements, idempotency keys, and provider-neutral ports.
- A transaction-aware persistence port is shared with or owned by `persistence-contracts`; it must preserve use-case-owned transaction semantics.
- `execution-runtime` owns dispatch, claim, retry, scheduling, deduplication, approval reauthorization, and execution orchestration, but not SQL or provider calls.
- `persistence-postgres` owns execution tables, RLS policies, lease/fencing queries, constraints, migration integration, and transaction-bound adapter implementations.
- The first queue and outbox implementation is PostgreSQL-backed. No external queue or scheduler package is needed for the first slice.
- `worker-edge` remains the process composition root and receives runtime ports from configuration. It does not own job state transitions.
- API wiring, automation authoring, webhooks, integrations, AI agents, and product modules remain outside the first G-004 slice.

Do not create separate packages for events, queues, scheduler, jobs, approvals, retries, and idempotency unless independent ownership or dependency direction requires them after implementation begins. These concerns are related execution contracts and should start in one package, with submodules or files before package splitting.

## D. Exact implementation sequence after approval

1. Record maintainer approval and any deviations in `docs/DECISIONS.md`. Update `AGENTS.md`, implementation status, and the G-004 proposal with the accepted addendum.
2. Add or amend the framework-free transaction-aware persistence contract. Add unit and contract tests proving that separate repository operations can share one transaction without leaking PostgreSQL types.
3. Create `packages/execution-contracts` with event, outbox, queue, job, scheduler, retry, idempotency, approval, execution, clock, and authorization ports. Add package metadata, exports, project references, and architecture tests.
4. Implement pure state machines, canonical hashing, retry classification, backoff/jitter calculation, occurrence identity, and approval-binding validation in framework-free code.
5. Extend `packages/persistence-postgres` with transaction-bound repository adapters and create only the execution-owned migration set. Add RLS, grants, constraints, indexes, attempt history, lease/fencing state, and immutable records.
6. Add PostgreSQL-backed outbox and queue adapters. Prove atomic business-state/audit/outbox participation through a transaction-aware test fixture.
7. Add `packages/execution-runtime` orchestration with injected clock, UUID source, authorization port, persistence ports, and side-effect/publication ports. Keep provider ambiguity explicit and retryable.
8. Add scheduling and durable job creation with unique occurrence protection. Do not add an external scheduler.
9. Add approval request, decision, execution binding, reauthorization, resource-precondition, cancellation, expiry, and replay handling.
10. Wire the approved runtime into `worker-edge` only after package and integration tests pass. Keep API changes limited to the minimum command or health observability needed for the vertical slice.
11. Add failure-injection, tenant-isolation, authorization-negative, migration, and recovery tests. Run the complete local validation and the PostgreSQL-backed CI workflow.
12. Update operational documentation, migration commands, environment templates, and implementation status. Review the final diff for Manus independence and forbidden dependency edges.

No product automation, webhook, integration, AI, plugin, or application module should be added as part of this sequence.

## E. Verification and test plan

Verification must include the existing repository checks:

- `pnpm install --frozen-lockfile`
- `pnpm validate:config`
- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm architecture:check`
- `pnpm test`
- `pnpm build`

The G-004 implementation must additionally include:

- Framework-free contract tests for every lifecycle and state-transition rule.
- Canonical hashing and idempotency conflict tests.
- Transactional outbox atomicity tests.
- Real PostgreSQL migration and rollback/forward-policy tests.
- Real PostgreSQL RLS tests for every organization-owned execution table.
- Cross-tenant negative tests for reads, claims, writes, retries, acknowledgements, cancellations, reconciliation, and approvals.
- Authorization-epoch and principal-revocation tests.
- Lease, heartbeat, fencing, expiry, and stale-worker tests.
- Duplicate delivery and consumer-deduplication tests.
- Ambiguous provider acknowledgement tests.
- Retry backoff, jitter, attempt-limit, and dead-letter tests.
- Scheduler timezone, missed-occurrence, uniqueness, pause, resume, and cancellation tests.
- Approval action-binding, separation-of-duties, expiry, rejection, cancellation, changed-input, changed-target, changed-version, replay, and idempotency tests.
- Audit correlation, causation, requester, executor, approver, scope, outcome, and failure-history tests.
- CI validation using standard PostgreSQL infrastructure without Manus.

G-004 should not be considered implemented or verified until these tests pass against the actual repository implementation.

## F. Explicit Manus-independence statement

**The audited design remains Manus-independent.** No Manus API, Manus SDK, Manus runtime service, Manus-managed database, hidden Manus configuration, or Manus-only worker behavior is required or proposed. The design is portable from GitHub alone, subject to the standard PostgreSQL and Node.js/pnpm prerequisites already documented by G-001 and G-003.

This report does not approve G-004. It records the pre-implementation findings and stops before runtime work.

## References

[1]: ARCHITECTURE.md "Business OS Architecture"
[2]: REPOSITORY-STRUCTURE.md "Business OS Repository Structure"
[3]: DECISIONS.md "Business OS Architecture Decisions"
[4]: G-001-DECISION-CLOSURE.md "Business OS G-001 Decision Closure"
[5]: G-002-DECISION-CLOSURE.md "Business OS G-002 Identity and Authorization Decision Closure"
[6]: G-003-DECISION-CLOSURE.md "Business OS G-003 Database, Persistence, and Tenancy Decision Closure"
[7]: G-004-DECISION-CLOSURE.md "Business OS G-004 Events, Reliable Execution, and Durable Approval Decision Closure"
[8]: MULTI-TENANCY.md "Business OS Multi-Tenancy"
[9]: AUTOMATION.md "Business OS Automation"
[10]: package.json "Business OS Package Scripts"
[11]: tooling/architecture-check.mjs "Business OS Architecture Validation"
[12]: packages/persistence-contracts/src/index.ts "Business OS Persistence Contracts"
[13]: packages/persistence-postgres/src/index.ts "Business OS PostgreSQL Persistence Adapter"
[14]: .github/workflows/ci.yml "Business OS Continuous Integration"

<!-- Author: Manus AI -->
<!-- Status: Pre-implementation audit only; G-004 remains pending maintainer approval. -->
<!-- No G-004 runtime implementation is authorized by this report. -->
