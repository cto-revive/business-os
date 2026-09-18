# G-004 Events, Reliable Execution, and Durable Approval Decision Closure

## 1. Status and authority

**Status: APPROVED — IMPLEMENTATION IN PROGRESS.**

This document is the approved G-004 architecture and decision closure. Implementation is authorized only within the boundaries and sequence defined here. It does not authorize G-005 through G-010, product modules, integrations, webhooks, AI providers, plugins, storage, or Manus-specific runtime behavior.

G-001 remains **CLOSED / VERIFIED**. G-002 remains **CLOSED / APPROVED** and authoritative for identity, principal, authorization, delegation, revocation, separation-of-duties, and audit semantics. G-003 remains **CLOSED / APPROVED / IMPLEMENTED / VERIFIED** and authoritative for PostgreSQL, transactions, organization context, authorization epoch propagation, RLS, migrations, and persistence boundaries. G-005 through G-010 remain pending.

This revision incorporates the formal pre-implementation audit in [`G-004-PRE-IMPLEMENTATION-AUDIT.md`](G-004-PRE-IMPLEMENTATION-AUDIT.md). **Deviations from G-001, G-002, and G-003: NONE proposed.**

## 2. Decision outcome requested

The maintainer is asked to approve or amend the following G-004 baseline:

- Framework-free execution contracts in `packages/execution-contracts`.
- Provider-neutral orchestration in `packages/execution-runtime`.
- A framework-free transaction-aware persistence capability shared with `persistence-contracts`.
- PostgreSQL-backed transactional outbox and durable work records through the existing `persistence-postgres` adapter.
- Durable at-least-once publication and execution. Exactly-once delivery and execution are not claimed.
- Explicit organization or platform-global scope on every durable execution record.
- Fresh authorization and authorization-epoch validation immediately before every sensitive side effect.
- Immutable approval binding to action identity, version, canonical input hash, target, resource preconditions, and authorization context.
- No external broker or scheduler for the initial implementation.

Approval would authorize a separately reviewable implementation phase. It would not authorize G-005 through G-010, product modules, integrations, webhooks, AI providers, plugins, storage, or production deployment decisions.

## 3. Compatibility audit

The revised proposal preserves the modular-monolith default. `api-edge` and `worker-edge` remain delivery and composition roots. They do not become owners of event, job, queue, scheduler, or approval domain rules. A future process split must preserve the same public contracts.

The revised proposal preserves G-002. Asynchronous work uses explicit principals and organization context. A queued message, job, scheduled occurrence, event consumer, or approval executor is not authority by itself. Execution reauthorizes the action, checks revocation and epoch state, and applies separation-of-duties and approval policy.

The revised proposal preserves G-003. PostgreSQL, Kysely, `pg`, SQL, migration runners, RLS policies, lease queries, and database-specific records remain inside `persistence-postgres` and repository-owned migration infrastructure. Use cases own transaction boundaries. Audit and outbox writes participate in the same transaction as the business-state change through the transaction-aware port defined below.

The repository currently contains no execution runtime. This revision changes only governance documentation and does not create execution packages, migrations, or runtime behavior.

## 4. Framework-free transaction-aware persistence boundary

### 4.1 Required capability

G-004 requires a framework-free transaction-aware persistence capability. A use case must be able to execute business-state writes, required audit writes, and outbox writes under one transaction without receiving a database handle.

The proposed capability is:

```ts
interface PersistenceUnitOfWork<TContext> {
  run<T>(
    context: TContext,
    operation: (scope: PersistenceScope<TContext>) => Promise<T>,
  ): Promise<T>;
}

interface PersistenceScope<TContext> {
  readonly context: TContext;
  readonly transactionId: string;
}
```

The exact names may change during implementation, but the semantics are mandatory. Module-owned repository ports accept the framework-free `PersistenceScope` or an equivalent transaction token. The PostgreSQL adapter maps that scope to one Kysely transaction internally.

The contract must not expose `Kysely`, `Transaction`, `Pool`, `Client`, SQL strings, PostgreSQL types, connection handles, or provider-specific transaction options. The transaction identifier is an opaque application identifier used for correlation and testing; it is not a database connection identity.

### 4.2 Transaction rules

The use case owns the transaction boundary. Within one unit of work, the following either all commit or all roll back:

1. The owning module's business-state change.
2. The required audit record.
3. The immutable outbox record.
4. Any local idempotency or execution-binding record required for the same state transition.

A crash before commit leaves none of these records committed. A crash after commit but before dispatch leaves the outbox record recoverable. The audit repository must support participation in an existing scope; it must not silently open an unrelated transaction when called from a transaction-aware use case.

### 4.3 Acceptance criteria

The implementation is acceptable only if a contract test proves that no infrastructure type crosses the public boundary and a real PostgreSQL test proves atomic business-state, audit, and outbox behavior under commit and rollback.

## 5. Canonical serialization and hashing

### 5.1 Canonical form

Idempotency and approval hashes use a versioned canonical JSON representation named `canonical-json-v1` with these rules:

- Objects are serialized with lexicographically sorted UTF-8 property names.
- Arrays preserve order.
- Strings use JSON escaping with UTF-8 encoding.
- Numbers must be finite. The canonical form uses the shortest ECMAScript-compatible decimal representation that round-trips to the same value; non-integer financial or high-precision values must be represented as strings by the action contract.
- Booleans and null use standard JSON literals.
- `undefined`, functions, symbols, cyclic objects, NaN, positive infinity, negative infinity, dates, and binary values are rejected unless the contract first converts them to an explicit string or tagged representation.
- Whitespace outside JSON tokens is absent.
- The canonicalization version is part of every hash preimage.

The implementation must provide a framework-free canonicalizer or a replaceable port with deterministic tests. It must not rely on database JSON formatting or language-native object insertion order.

### 5.2 Hashing

The hash algorithm is **SHA-256**, encoded as lowercase hexadecimal. The hash preimage is a length-delimited tuple rather than an ambiguous concatenated string:

```text
hashVersion = "sha256-canonical-json-v1"
operationKind
operationType
operationVersion
canonicalJson(payload)
```

Each tuple component is encoded as UTF-8 with its byte length before the component. The complete preimage format is owned by the contract and must be tested with fixed vectors.

For idempotency, the request hash covers operation type, operation version, organization or platform scope, target identifiers, and canonical request input. The idempotency record stores the hash and rejects reuse of the same key with a different hash.

For approvals, the binding hash covers organization or platform scope, action identifier, action version, canonical action input, target identifiers, captured resource versions or preconditions, required authorization context, and approval policy version. A changed component produces a different hash and requires a new approval.

For conflict detection, the stored hash is compared byte-for-byte with the recomputed hash. Hash equality does not replace authorization, resource-version checks, or action validation.

## 6. Identity model

The following identities are distinct:

| Identity | Meaning | Immutable | Deduplication use |
|---|---|---:|---|
| `eventId` | Identity of the immutable domain/platform fact. | Yes | Consumer deduplication for the event. |
| `deliveryAttemptId` | Identity of one attempt to publish or deliver an event/message. | Yes | Attempt history and retry evidence. |
| `messageId` | Identity of one durable queue delivery record. | Yes | Queue acknowledgement and delivery deduplication. |
| `jobId` | Identity of the durable work description. | Yes | Job lifecycle and idempotent work creation. |
| `scheduleId` | Identity of the durable schedule definition. | Yes | Schedule management. |
| `occurrenceId` | Identity of one calculated schedule occurrence. | Yes | Unique `(scheduleId, occurrenceId)` job creation. |
| `idempotencyKey` | Caller-provided or system-generated operation key scoped to owner and tenant/global scope. | Yes for the operation | Request deduplication. |
| `approvalRequestId` | Identity of one approval request and its immutable requested action. | Yes | Approval lifecycle and replay protection. |
| `executionId` | Identity of one bound attempt to execute an approved or ordinary action. | Yes | Side-effect execution and result lookup. |
| `aggregateId` | Identity of the domain aggregate or entity referenced by an event. | Yes | Ordering and resource correlation. |
| `correlationId` | Identity of an end-to-end request, workflow, or execution chain. | Yes | Tracing and audit correlation; not deduplication. |
| `causationId` | Identity of the immediate command, event, job, or execution that caused a record. | Yes | Causal tracing; not deduplication. |
| `fencingToken` | Monotonically increasing ownership token for a lease. | Yes per claim | Rejecting stale workers. |

A replay retains the original `eventId`, `messageId`, `jobId`, or `approvalRequestId` as appropriate and creates a new attempt or execution identity. Correlation and causation relationships are preserved and extended rather than overwritten.

## 7. Queue and job boundary

A **job** is the durable work identity. It describes what work is requested, who owns it, its organization or platform scope, its authorization context, its idempotency identity, its retry policy, and its lifecycle.

A **queue message** is a delivery record for work. It points to a job or contains a bounded immutable work envelope. It records delivery attempts, lease ownership, visibility, acknowledgement, and dead-letter state. It is not a second business-level work identity.

The relationship is:

```text
schedule or command -> job -> one or more queue messages/delivery attempts -> execution result
```

A job may be delivered more than once. A queue message may be redelivered after lease expiry. A retry increments attempt history and preserves the job and idempotency identities. A new job is created only when the domain contract explicitly requests a new work identity; a transport retry must not create one accidentally.

Queue lifecycle: `ready`, `leased`, `acknowledged`, `retryable_failure`, `dead_lettered`, or `cancelled`.

Job lifecycle: `pending`, `claimed/running`, `succeeded`, `retryable_failure`, `terminal_failure`, `cancelled`, or `expired/stale`.

The queue adapter may use one PostgreSQL table or several internal tables, but the public distinction must remain explicit and testable.

## 8. Lease fencing and stale workers

Each successful claim increments a monotonically increasing fencing token for the job or delivery record. The lease contains the owner identity, expiry instant, and fencing token. Heartbeats may extend only the current lease with the current token.

Every acknowledgement, retry, dead-letter transition, execution result write, and protected side effect that is persisted locally must include the fencing token in its conditional write. The write succeeds only when the record is still leased by that token and the lease has not expired according to the authoritative clock.

When a worker acts with an expired or superseded lease:

- Acknowledgement fails with a stale-lease result.
- Retry and dead-letter transitions fail without changing current ownership.
- Local execution-result writes fail unless they are protected by an idempotency record that already proves the same result.
- The worker must stop attempting side effects and emit an auditable stale-worker outcome where possible.
- Recovery may issue a new fencing token and requeue the work.

A timestamp alone is not a fencing mechanism. Database/server time or an injected authoritative clock is used for lease comparisons. Exactly-once execution is not claimed; idempotency and fencing prevent stale ownership from corrupting durable state.

## 9. Authorization epoch, revocation, and execution

At creation, every organization-scoped event, job, queue message, schedule, approval, and execution binding captures:

- Organization identifier.
- Effective principal identifier and kind.
- Membership, credential, or delegation reference.
- Authorization epoch.
- Scope and registered action requirements.
- Correlation and causation identifiers.

Before claim of sensitive work, before approval, and immediately before every sensitive side effect, the executor validates the principal lifecycle, membership or credential, delegation, approval state, organization scope, action permission, required assurance, and captured authorization epoch.

If the principal is revoked, membership or delegation expires, the credential is invalid, the approval is rejected/cancelled/expired, or the authorization epoch no longer satisfies the action policy, execution fails closed. The work may be retained for audit or reapproval, but it does not execute under stale authority. A policy may explicitly permit reauthorization under the current epoch; that is a new authorization decision and does not mutate the original captured context.

An event remains a historical fact after revocation. Revocation affects future consumption and side effects, not the truth of the already-recorded event.

## 10. Approval action registry and versioning

An approvable action is identified by a stable namespaced `actionType`, such as `finance.payment.submit`, and a positive `actionVersion`. The action registry resolves that pair to:

- Canonical input schema and canonicalization version.
- Target resource types.
- Required permissions and scope.
- Required authentication assurance.
- Required approver role and separation-of-duties policy.
- Side-effect classification.
- Resource preconditions.
- Executor implementation contract.

The registry is a framework-free port. Action implementations belong to their owning modules. An action version is immutable after publication. A backward-incompatible input or behavior change requires a new version.

An approval binds `actionType`, `actionVersion`, canonical input hash, target identifiers, captured resource versions/preconditions, organization or platform scope, requester, required authorization context, approval policy version, and idempotency key. The executor resolves the same action/version and recomputes the same binding hash. Any changed action, version, input, target, scope, precondition, or policy binding requires a new approval.

If an action version is removed or no longer executable, the approval expires or enters an operator-repair state; it is never silently mapped to another action version.

## 11. Resource preconditions and approval concurrency

At approval creation, the action records the minimum resource preconditions required to prevent transformation. These may include resource identifier, resource version, expected status, ownership relationship, or a domain-specific predicate version.

At execution, the executor checks every captured precondition atomically with the local state change where possible. A changed resource, target, version, ownership relationship, or predicate causes a conflict and prevents execution. The result is recorded as a non-successful execution outcome and requires a new approval if the action is still desired.

Approval decisions are append-only. Concurrent approver decisions use an atomic state transition and required-approver uniqueness. The requester cannot satisfy a separation-of-duties requirement unless the approved policy explicitly permits it. Duplicate decisions by the same approver are idempotent when they repeat the same decision and are conflicts when they differ.

Approval expiry, rejection, cancellation, epoch invalidation, resource conflict, or authorization denial cannot be bypassed by replaying an old queue message. A completed execution returns its existing idempotent result rather than repeating the side effect.

## 12. Scheduling semantics

The scheduler supports:

- **One-time schedules:** one UTC execution instant and one occurrence.
- **Delayed schedules:** one execution instant calculated from a committed event or accepted command using an injected clock.
- **Recurring schedules:** a versioned schedule expression, named IANA timezone, start boundary, optional end boundary, and missed-occurrence policy.

Persisted instants are UTC. The named timezone and original schedule expression are persisted. Local-time ambiguity and nonexistent local times use an explicit schedule policy selected by the schedule contract; they are not delegated to the worker's local timezone.

Every calculated occurrence has an immutable `occurrenceId`. Job creation uses an atomic uniqueness guarantee on `(scheduleId, occurrenceId)`. Scheduler restart, concurrent scheduler instances, or repeated polling cannot create duplicate jobs.

The default missed-schedule policy is **run once for the latest eligible occurrence** after recovery, unless the schedule explicitly selects `skip` or bounded `catch_up`. `catch_up` is bounded by a configured maximum occurrence count and time window. Missed occurrences outside the window are recorded as skipped with an auditable reason. A schedule owner may pause, resume, cancel, or expire a schedule through an authorized action.

## 13. Retry, clock, and idempotency ownership

`execution-runtime` owns retry classification and policy evaluation. Persistence adapters store attempt state and enforce atomic transitions. Queue or provider adapters report outcomes but do not decide domain retryability.

Failures are classified as:

- `retryable`: transient dependency failure, rate limit, lease conflict, timeout, or ambiguous external outcome.
- `terminal`: invalid contract, denied authorization, revoked principal, expired approval, unsupported action version, malformed input, or non-recoverable domain failure.
- `operator_repair`: a condition requiring authorized data repair or explicit review.

Retry policy is captured on the job or message at creation. It contains maximum attempts, maximum elapsed retry window, base delay, maximum delay, jitter mode, and policy version. Existing work retains its captured policy unless an explicit authorized migration changes it.

The runtime receives an injected monotonic/UTC clock port. Database/server time is authoritative for lease expiry and persisted timestamps; tests use a controllable clock and never sleep to prove state transitions. Backoff is exponential, bounded by maximum delay, and applies deterministic or cryptographically safe bounded jitter according to the captured policy. The jitter algorithm and policy version are part of the contract.

Idempotency keys are owned by the operation contract and scoped by operation owner, organization or platform scope, and operation version. The idempotency record stores the key, request hash, status, result reference, first-seen time, and retention expiry. Successful duplicates return the prior durable result where safe. In-progress duplicates join or return an explicit in-progress result according to the operation contract. Retryable failures retain the same key and may retry. Reuse of a key with a different request hash is a conflict and fails closed.

Successful deduplication records remain for the operation's declared retention period. Expiry is explicit and auditable. An operation whose result cannot safely be replayed must reject a key after expiry rather than risk a duplicate external side effect.

## 14. Migration and CI composition

G-004 execution records are owned by the execution capability. Migrations belong under `infrastructure/database/migrations/execution/` and use the existing G-003 `node-pg-migrate` convention, immutable names, reviewable source, and repository ownership metadata.

The existing G-003 migration and rollback commands remain unchanged. The repository will add an explicit execution migration command or a composed migration entry point; it must not silently change the meaning of the G-003 command. Execution migrations must not create or alter identity, organization, membership, role, grant, session, credential, product, integration, file, or AI-provider schemas.

CI must continue to:

1. Start standard PostgreSQL 16.
2. Create a non-owner runtime role.
3. Run G-003 migrations using the migration owner connection.
4. Run execution migrations using the migration owner connection.
5. Grant only the execution runtime role's required schema/table/sequence privileges.
6. Run real PostgreSQL tests using the runtime role and `DATABASE_URL`.
7. Run configuration, formatting, lint, typecheck, architecture, tests, and build checks.

Execution migrations must define RLS and forced RLS for every organization-owned table, explicit platform-global policies where needed, indexes for scope and operational claims, constraints for state transitions and identity uniqueness, and least-privilege grants. The migration owner and runtime role must remain distinct.

## 15. PostgreSQL-backed initial implementation

The initial G-004 implementation uses the existing `packages/persistence-postgres` adapter and PostgreSQL-backed outbox/queue/job/schedule/idempotency/approval records. No external broker or scheduler is selected.

This does not create provider lock-in because:

- Framework-free contracts define the public behavior.
- PostgreSQL is already the approved G-003 persistence boundary.
- Queue and scheduler capabilities are injected ports.
- An external adapter can be added later without changing domain contracts if operational evidence justifies it.
- No provider SDK enters `execution-contracts` or `execution-runtime`.

PostgreSQL-backed claim and lease operations must use atomic conditional updates, `FOR UPDATE SKIP LOCKED` where appropriate, server/transaction time, fencing tokens, and explicit RLS context. These implementation details remain inside `persistence-postgres`.

## 16. Acceptance matrix

The following are mandatory acceptance criteria for the later implementation phase:

| Area | Required acceptance evidence |
|---|---|
| Atomic publication | Real PostgreSQL test proves business state, audit, and outbox commit together and roll back together. |
| Crash survival | Failure-injection tests prove pre-commit rollback and post-commit outbox recovery. |
| RLS | Each tenant-owned execution record class has a real PostgreSQL RLS test with the non-owner runtime role. |
| Cross-tenant isolation | Organization A cannot read, claim, lease, mutate, retry, acknowledge, cancel, reconcile, or infer Organization B work. |
| Platform-global paths | Platform operations use explicit platform context and authorization; tenant payloads are not exposed through a generic global query. |
| Duplicate delivery | Repeated event/message delivery produces one idempotent local outcome. |
| Lease fencing | Expired or superseded workers cannot acknowledge, retry, dead-letter, or mutate current work. |
| Retry/dead letter | Classification, exponential backoff, jitter, attempt limits, terminal failure, and dead-letter history are deterministic and auditable. |
| Ambiguous outcomes | Provider timeout or unknown acceptance remains retryable and preserves immutable identity; exactly-once is not claimed. |
| Scheduling | Restart and concurrent scheduler tests prove unique `(scheduleId, occurrenceId)` job creation and defined missed-schedule behavior. |
| Epoch invalidation | Stale authorization epoch, revoked principal, expired membership/delegation, or invalid credential fails closed before sensitive side effects. |
| Approval binding | Changed action, version, canonical input, target, resource version, precondition, or policy requires a new approval. |
| Approval concurrency | Concurrent approver decisions enforce separation of duties and required-approver uniqueness atomically. |
| Idempotency conflicts | Same key with a different request hash is rejected; completed duplicates do not repeat side effects. |
| Replay safety | Replayed events, jobs, dead letters, and approvals preserve identity/history and do not repeat completed effects. |
| Audit attribution | Requester, executor, approver, actor kind, scope, authorization outcome, correlation, causation, attempts, and result are attributable. |
| Migration behavior | Forward migration, rerun behavior, and the chosen rollback/forward-only policy are documented and tested. |
| Portability | Local and CI execution use standard Node.js, pnpm, PostgreSQL, and repository-owned configuration without Manus. |

At least one real PostgreSQL transaction/RLS test must exist for each tenant-owned execution record class before G-004 implementation is considered verified.

## 17. Proposed package boundaries

### `packages/execution-contracts`

This package owns immutable value types, event and message envelopes, identity types, state transitions, retry policy, canonical hashing ports, clock ports, idempotency contracts, approval contracts, authorization/revalidation ports, and persistence interfaces. It is framework/provider independent.

Forbidden dependencies are PostgreSQL, Kysely, `pg`, NestJS, provider SDKs, transport clients, cloud SDKs, and Manus APIs. It may depend only on small shared contracts and the approved persistence/context vocabulary.

### `packages/execution-runtime`

This package owns provider-neutral orchestration for dispatch, claims, retry decisions, schedule occurrence creation, deduplication, authorization revalidation, approval execution, and recovery. It receives all infrastructure capabilities through ports.

It must not depend directly on a database client, queue SDK, scheduler SDK, provider SDK, NestJS, or Manus. It must not own application-private domain rules or create a parallel authorization system.

### Existing `packages/persistence-contracts`

This package owns or extends the framework-free transaction-aware unit-of-work capability where that boundary is shared by business repositories, audit, and execution persistence. It must not expose infrastructure types.

### Existing `packages/persistence-postgres`

This package owns PostgreSQL execution persistence, migrations integration, RLS, lease/fencing queries, constraints, and the initial PostgreSQL-backed outbox/queue implementation. A second PostgreSQL package must not be created.

### `worker-edge`

This package remains a delivery/composition root. It wires the approved runtime and ports but does not own execution state transitions or domain rules.

### Optional infrastructure adapter directories

`infrastructure/queue/<adapter>` and `infrastructure/scheduler/<adapter>` must not be created for the initial implementation. They are reserved for a later concrete adapter decision and must remain outside framework-free contracts.

No separate packages for events, queues, jobs, scheduler, retries, idempotency, or approvals are proposed initially. These concerns begin as coherent execution contracts and runtime submodules. Splitting them later requires an ownership or dependency-direction reason.

## 18. Implementation sequence after approval only

1. Record maintainer approval and deviations in `docs/DECISIONS.md`; update this document and implementation status.
2. Add the transaction-aware persistence contract and prove its infrastructure independence with contract tests.
3. Create `packages/execution-contracts` with package metadata, exports, project references, identities, envelopes, state machines, canonical hashing, clocks, policies, authorization ports, and persistence ports.
4. Add pure unit tests for canonicalization, hash vectors, lifecycle transitions, retry calculations, schedule occurrences, fencing rules, and approval binding.
5. Extend `packages/persistence-postgres` with transaction-bound execution repositories and add execution-owned migrations under `infrastructure/database/migrations/execution/`.
6. Implement PostgreSQL RLS, grants, constraints, indexes, outbox records, queue delivery records, jobs, attempts, leases, fencing, schedules, idempotency, approvals, and execution bindings.
7. Create `packages/execution-runtime` with injected clock, identity source, authorization port, persistence ports, publication port, and side-effect executor.
8. Implement PostgreSQL-backed outbox dispatch, queue claim/acknowledgement, retry/dead-letter handling, and recovery without an external broker.
9. Implement one-time, delayed, and recurring schedule occurrence creation with duplicate prevention and missed-schedule policy.
10. Implement approval creation, concurrent decisions, expiry, cancellation, reauthorization, preconditions, immutable binding, execution, and replay protection.
11. Wire the runtime into `worker-edge` only after contract and PostgreSQL tests pass.
12. Run the complete local and CI validation matrix, including failure injection and tenant-negative tests.
13. Update operational documentation and confirm no G-005 through G-010 work was introduced.

This sequence is conditional on maintainer approval. It must not begin from this revision alone.

## 19. Deferred decisions

The following remain explicitly deferred:

- External message broker or queue vendor.
- External scheduler vendor.
- Worker deployment topology, scaling, and production operations.
- Production retention, backup, restore, disaster recovery, and incident operations, owned by G-008/G-009 as applicable.
- Webhook verification, integration credentials, and provider callbacks, owned by G-007.
- AI model providers, AI data policy, and AI-specific approval policy, owned by G-006.
- Plugin runtime and isolation, owned by G-005.
- File/object storage and retention, owned by G-008.
- Production observability and promotion topology, owned by G-009.
- Product entitlements, application installation, templates, themes, and marketplace governance, owned by G-010.
- Product modules, automation authoring, integrations, webhooks, AI agents, plugins, and application UI.

These deferrals must not be resolved by a library default or hidden platform configuration.

## 20. Manus independence

**The revised G-004 design remains Manus-independent.** A human developer, another AI coding agent, or a normal software engineering team can clone the GitHub repository, install the pinned Node.js/pnpm dependencies, configure documented environment variables, start standard PostgreSQL, run repository-owned migrations and tests, and run the application without Manus.

The design requires no Manus API, Manus SDK, Manus runtime service, Manus-hosted database, Manus-hosted queue, Manus-hosted scheduler, hidden Manus environment state, Manus-only worker lifecycle, or Manus-specific execution contract.

## References

[1]: ARCHITECTURE.md "Business OS Architecture"
[2]: REPOSITORY-STRUCTURE.md "Business OS Repository Structure"
[3]: DECISIONS.md "Business OS Architecture Decisions"
[4]: G-001-DECISION-CLOSURE.md "Business OS G-001 Decision Closure"
[5]: G-002-DECISION-CLOSURE.md "Business OS G-002 Identity and Authorization Decision Closure"
[6]: G-003-DECISION-CLOSURE.md "Business OS G-003 Database, Persistence, and Tenancy Decision Closure"
[7]: G-004-PRE-IMPLEMENTATION-AUDIT.md "Business OS G-004 Pre-Implementation Audit"
[8]: MULTI-TENANCY.md "Business OS Multi-Tenancy"
[9]: AUTOMATION.md "Business OS Automation"
[10]: DATABASE.md "Business OS Database Architecture"
[11]: PERMISSIONS.md "Business OS Permissions"
[12]: SECURITY.md "Business OS Security"
[13]: DEPLOYMENT.md "Business OS Deployment"
[14]: package.json "Business OS Package Scripts"
[15]: tooling/architecture-check.mjs "Business OS Architecture Validation"
[16]: packages/persistence-contracts/src/index.ts "Business OS Persistence Contracts"
[17]: packages/persistence-postgres/src/index.ts "Business OS PostgreSQL Persistence Adapter"
[18]: .github/workflows/ci.yml "Business OS Continuous Integration"

<!-- Author: Manus AI -->
<!-- Status: Approved architecture; implementation and verification in progress. -->
