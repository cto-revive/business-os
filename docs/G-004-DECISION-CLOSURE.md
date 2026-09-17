# G-004 Events, Reliable Execution, and Durable Approval Decision Closure

## 1. Status

**Status: PROPOSED — PENDING MAINTAINER APPROVAL.**

This document is an architecture and decision-closure proposal only. It defines the contracts and boundaries required before durable events, reliable publication, queues, jobs, schedulers, retries, idempotency, webhooks, automation, or durable approval execution are implemented. It creates no runtime package, database table, migration, worker, queue, scheduler, event transport, or approval workflow.

G-001 remains **CLOSED / VERIFIED**. G-002 remains **CLOSED / APPROVED** and authoritative for identity and authorization semantics. G-003 remains **CLOSED / APPROVED / IMPLEMENTED / VERIFIED** and authoritative for persistence, transactions, organization context, PostgreSQL row-level security, and audit persistence. G-004 must preserve those decisions. G-005 through G-010 remain pending.

Maintainer approval of this document would authorize a separately reviewable G-004 implementation phase. It would not authorize product modules, external integrations, AI providers, plugins, production deployment, or changes to G-002 authorization semantics.

## 2. Architecture audit

The audit found no contradiction between the proposed G-004 architecture and the accepted G-001, G-002, or G-003 decisions.

G-004 preserves the modular-monolith default. Events, execution, queues, jobs, and schedules are platform or execution capabilities with public contracts. They do not become independent services merely because a future deployment may run a worker process separately. Physical extraction, if later justified by scaling, reliability, security, or ownership evidence, must preserve the originating public contracts.

G-004 preserves G-002 by treating every asynchronous actor as an explicit principal. A queue message, job, scheduled invocation, event consumer, and approval executor must carry the originating organization, principal, applicable membership or credential reference, authorization epoch, correlation data, and an explicit scope. Asynchronous execution does not grant authority and does not bypass deny-by-default authorization, delegation limits, separation of duties, revocation, or approval requirements. The executor must reauthorize the action at execution time.

G-004 preserves G-003 by making the transaction that changes business state and records a publishable event the unit of durable publication. Organization-owned durable objects are organization-scoped. PostgreSQL, Kysely, `pg`, SQL, migration details, leases, and claim queries belong only in infrastructure adapters. Framework-free contracts remain independent of PostgreSQL, NestJS, provider SDKs, and Manus.

G-004 also preserves the existing audit model. Security-sensitive state changes, event publication, delivery, job transitions, retries, approval decisions, execution outcomes, cancellations, and terminal failures produce attributable audit records in the same transaction when the state change is local to that transaction, or through an explicitly linked durable record when the operation spans transactions. Audit records are append-oriented and never the source of execution authority.

The main unresolved choices before this proposal are implementation details, not contradictions: the first queue and scheduler adapter, worker deployment topology, operational retention values, and production observability. Those remain replaceable infrastructure or G-009 concerns and must not be selected implicitly by a framework.

## 3. Scope and non-goals

G-004 defines:

- Immutable durable event semantics.
- Transactional reliable publication through an outbox-style record.
- Provider-neutral queue, claim, lease, acknowledgement, retry, and dead-letter contracts.
- Durable job lifecycle and recovery semantics.
- One-time, delayed, and recurring scheduling contracts.
- Retry classification, backoff, jitter, deduplication, and idempotency.
- Durable approval requests and execution binding.
- Organization and platform-global scope rules for every durable execution object.
- Proposed framework-free package boundaries and infrastructure ownership.
- Test and operational acceptance requirements for a later implementation phase.

G-004 does not select an external message broker, queue vendor, scheduler vendor, cloud service, deployment topology, integration provider, AI provider, plugin runtime, storage provider, or production operations model. It does not implement authentication, authorization, memberships, product actions, automation rules, webhooks, or application modules.

## 4. Normative execution guarantees

Business OS will use **durable at-least-once publication and at-least-once execution**. It will not claim exactly-once delivery or exactly-once execution. A consumer may receive a record more than once, and an executor may restart after a side effect has occurred but before acknowledgement. Every consumer and side-effecting action must therefore be idempotent.

The system will guarantee that a publishable event is not acknowledged as published until its producer transaction has committed the business-state change and the durable publication record. Publication after commit may be delayed by worker failure, but it must be recoverable by retry and reconciliation. A process crash before commit rolls back both the business-state change and the publication record. A crash after commit but before dispatch leaves the durable record available for later dispatch.

Ordering is limited. Records for the same ordering key are claimed and published in sequence where the selected adapter can provide that behavior, but global ordering is not guaranteed. The default ordering key is `(organization_id, aggregate_type, aggregate_id)`. Consumers must tolerate retries, gaps caused by independent aggregates, and redelivery. A consumer that requires stronger ordering must declare that requirement and use an explicit aggregate sequence or version check.

Retention is policy-driven. Durable publication records, delivery attempts, job records, and approval records must remain available for the configured operational and audit retention period. The initial implementation must make retention and purge behavior explicit and auditable; it must not silently delete failed, dead-lettered, approval, or audit-linked records. Production retention, backup, and recovery operations remain subject to G-009 and any applicable G-008 decision.

## 5. Durable event contract

A durable event is an immutable statement that a committed state transition or explicitly defined platform occurrence happened. It is not a command and cannot authorize a consumer to perform an action without a fresh authorization decision.

The framework-free event contract must contain at least:

| Field | Requirement |
|---|---|
| `eventId` | Globally unique, immutable identifier generated by the producer. |
| `eventType` | Stable namespaced event name, such as `sales.opportunity.created`. |
| `eventVersion` | Positive schema version. Incompatible payload changes require a new version. |
| `occurredAt` | UTC instant representing the occurrence time. |
| `organizationId` | Required for organization-owned events; null only for explicitly platform-global events. |
| `actor` | Explicit principal identifier and principal kind. |
| `authorizationEpoch` | Captured epoch when the event resulted from an authorized organization action; absent only where the event is explicitly platform-generated. |
| `aggregate` | Aggregate or entity type, immutable identifier, and optional sequence/version. |
| `correlationId` | End-to-end request, workflow, or execution correlation identifier. |
| `causationId` | Immediate preceding event, command, job, or execution identifier where applicable. |
| `payload` | Versioned, bounded, serializable data containing facts needed by consumers. |
| `metadata` | Non-authoritative tracing and producer metadata that cannot grant permission. |

Event payloads must contain facts rather than mutable object snapshots unless the snapshot is explicitly versioned. Payloads must not contain raw credentials, session tokens, provider secrets, or unbounded private data. Consumers obtain additional data through authorized organization-scoped contracts rather than assuming that an event payload is an authorization boundary.

Events are append-only and immutable. Corrections are represented by a new event. Event names and versions are owned by the module that owns the aggregate or capability. Consumers must use public event contracts rather than another module's private records. The audit relationship is explicit: a security-sensitive event may reference its audit record or share the same correlation and causation identifiers, but durable domain events and audit records remain conceptually distinct.

## 6. Reliable publication and outbox

The baseline reliable-publication mechanism is a **transactional outbox** implemented behind a persistence adapter. The outbox is not an external broker and does not require one for the initial architecture.

A use case that changes durable business state and emits an event must execute the following operations in one use-case-owned database transaction:

1. Revalidate the organization context and authorization epoch.
2. Perform the authorized state change through the owning module.
3. Append any required audit record.
4. Insert one immutable outbox record containing the event contract, organization scope, correlation data, causation data, event version, and publication state.
5. Commit the transaction.

The write ordering is logical rather than dependent on separate commits: the business change, audit record, and outbox record either commit together or none commits. An outbox record must never be marked published before the producer transaction commits.

A dispatcher claims unpublished or retryable outbox records using a lease, publishes them to the selected provider-neutral delivery adapter, and records the attempt. Provider acknowledgement changes the outbox state to published. A timeout or ambiguous provider result remains retryable and may cause duplicate publication. Reconciliation identifies records whose leases expired, whose attempts are inconsistent, or whose state cannot be proven, and returns them to controlled retry or operator review.

The outbox state machine is `pending`, `leased`, `published`, `retryable_failure`, and `dead_lettered`. State transitions are monotonic except for lease expiry and an explicitly authorized recovery action. A dead-letter record is retained with its failure history. Replaying it creates a new delivery attempt for the same immutable event identity; it does not mutate the event payload.

Consumers deduplicate by stable event identity and consumer identity. If a consumer performs a durable state change, it records the event identity in the same transaction as that state change, using a uniqueness constraint or equivalent atomic claim. A consumer must not acknowledge a message before its idempotent state change and required audit record commit.

## 7. Queue contract

The framework-free queue contract is a durable work-delivery abstraction, not a provider API. It provides:

- `enqueue(message, options)` with a required idempotency key and explicit organization or platform scope.
- `claim(consumer, leaseDuration)` returning a leased message or no message.
- `heartbeat(lease)` extending a valid lease when the consumer is still executing.
- `acknowledge(lease, result)` after successful idempotent completion.
- `retry(lease, failure)` with classified failure and next-attempt time.
- `deadLetter(lease, reason)` for terminal failure or exhausted retry policy.
- `requeueExpiredLeases(now)` for recovery of stale work.

A queue message contains a stable message identifier, message type and version, organization context or explicit platform scope, actor and authorization context, correlation and causation identifiers, idempotency key, attempt number, visibility deadline, and bounded payload. Queue implementations must validate that an organization-scoped message is claimed and executed only under the same organization context.

Leases are exclusive for the lease interval, but they are not proof of exactly-once execution. A worker may lose a lease after a side effect and before acknowledgement. The action must use the idempotency key and durable deduplication record to make redelivery safe. Acknowledgement of an expired lease must fail unless the implementation can prove ownership through a fencing token or equivalent mechanism.

Ordering is at-least-once by default and not globally ordered. A queue may offer per-key ordering, but consumers must declare and test the key. Platform-global work uses an explicit platform context and may not carry an organization identifier disguised as optional data.

A dead-letter queue is a durable state for messages that require operator or policy intervention. It is not silent data loss. Re-drive requires authorization, preserves the original identity and history, and creates an auditable recovery record.

## 8. Job contract and lifecycle

A job is a durable description of work that may outlive the request that created it. Every job has an owner module, stable job identifier, job type and version, organization or platform scope, execution principal, authorization epoch, idempotency key, correlation and causation identifiers, input reference or bounded input payload, retry policy, timestamps, lease data, and outcome metadata.

The lifecycle is:

```text
pending -> claimed/running -> succeeded
pending -> claimed/running -> retryable_failure -> pending
pending -> claimed/running -> terminal_failure
pending -> claimed/running -> cancelled
claimed/running -> expired/stale execution -> pending or terminal_failure
```

A job may be cancelled only while policy permits cancellation. A succeeded job is immutable except for linked observability metadata. A terminal failure is not silently retried. An expired execution is detected by lease expiry or heartbeat timeout and is recovered through fencing and idempotent re-execution. The implementation must distinguish a worker that never started from a worker that may have completed a side effect before losing its lease.

The job owner defines the work contract and permissions. The worker runtime claims work but does not own the domain rules. Before each side effect, the job executor rechecks authorization, organization scope, principal lifecycle, authorization epoch, approval binding where applicable, and idempotency state.

## 9. Scheduler contract

The scheduler creates durable job intents; it does not execute business actions directly. It supports:

- One-time execution at an explicit UTC instant.
- Delayed execution relative to a committed event or accepted command.
- Recurring execution using a versioned schedule expression and named timezone.
- Explicit organization-scoped and platform-global schedules.
- Missed-schedule policy: skip, run once, or catch up within a bounded window.
- Duplicate scheduling protection using a stable schedule key and occurrence identifier.
- Pause, resume, cancel, and expiry with authorization and audit records.

All persisted instants are UTC. A recurring schedule stores its timezone identifier and schedule definition so that future timezone-rule changes are observable and do not depend on a worker's local timezone. Ambiguous or nonexistent local times require a documented schedule policy. The scheduler creates at most one durable job per `(scheduleId, occurrenceId)` under an atomic uniqueness rule; delivery and execution remain at-least-once.

A schedule's organization context is immutable for its lifetime. Platform-global schedules require an explicit platform classification and platform principal. The scheduler must never infer tenant scope from a queue, worker, or process default.

## 10. Retry and idempotency policy

Failures are classified before retry:

- **Retryable:** transient database or provider unavailability, lease conflict, rate limit, timeout with unknown completion, or explicitly recoverable dependency failure.
- **Terminal:** invalid contract, failed authorization, revoked principal, expired approval, unsupported version, policy denial, malformed input, or a non-recoverable domain rule.
- **Operator-repair:** a condition requiring data correction or an explicit authorized decision before replay.

The default retry schedule is exponential backoff with bounded jitter. The initial implementation must make base delay, maximum delay, maximum attempts, total retry window, and jitter strategy explicit configuration values, not framework defaults. A retry preserves the stable event, job, message, or execution identity and increments an attempt record. A retry must not create a new authorization grant or bypass a newer authorization epoch.

Idempotency keys are scoped to the operation owner and organization or platform scope. The deduplication record stores the key, operation type/version, request hash, actor and authorization context, status, result reference, and expiry policy. Reuse of a key with a different request hash is a conflict and must fail closed. A successful duplicate returns the prior durable result where safe; an in-progress duplicate is joined or rejected according to the contract; a failed retryable operation remains eligible under the same identity.

Exactly-once is not a system guarantee. Exactly-once-like business outcomes are permitted only where a single transaction atomically records the deduplication key and the local side effect. External effects require provider-specific idempotency support or a compensating/reconciliation strategy owned by the relevant later gate.

## 11. Durable approval execution

An approval request is an immutable binding between a requested action and the authority required to permit it. It contains:

- Approval request identifier and organization ownership.
- Requesting principal and explicit requested action name/version.
- Canonical action input or a content hash plus an immutable stored input reference.
- Target resource identifiers and expected resource versions where relevant.
- Authorization decision, policy basis, required assurance, and authorization epoch at request time.
- Required approver role, separation-of-duties constraints, and approval count.
- Creation, expiry, rejection, cancellation, and decision timestamps.
- Approver principal identity and decision reason.
- Execution binding, idempotency key, and execution status.
- Correlation, causation, and audit references.

The approval state machine is `pending`, `approved`, `rejected`, `cancelled`, `expired`, `executing`, `succeeded`, `retryable_failure`, and `terminal_failure`. Only the allowed transitions are valid. Approval is not authorization by itself. The executor performs a fresh authorization decision immediately before execution, confirms that the principal and required membership or credential remain valid, compares the current authorization epoch with the binding policy, verifies that the requested action name/version and canonical input hash are unchanged, checks resource versions or preconditions, and enforces separation of duties.

An approved action cannot be silently transformed. The execution record binds the immutable action identifier, version, canonical input hash, target identifiers, organization, requester, approver set, approval epoch, and idempotency key. Any change creates a new approval request. Replay of an already executed or terminally failed approval is rejected or returns the existing result according to the idempotency contract.

Approval expiration, rejection, cancellation, epoch invalidation, resource-version conflict, or authorization denial prevents execution. Revocation and membership changes do not silently grant a grace period. If policy permits a reapproval path, it creates a new auditable decision rather than mutating the old approval.

Approval requests and execution records are organization-scoped unless the requested action is explicitly platform-global. Platform-global approval still requires an explicit platform principal, policy basis, and audit trail. Approval records never store raw credentials or secrets.

## 12. Multi-tenant security model

Every organization-owned durable object has a non-null organization identifier and is accessed only through an organization context. This applies to events, outbox records, queue messages, jobs, schedules, approvals, execution records, idempotency records, deduplication records, delivery attempts, and dead-letter records.

The application contract requires scope. The persistence adapter applies organization scope before every read, write, count, claim, lease, retry, cancellation, export, and reconciliation operation. PostgreSQL RLS remains defense in depth where the object is persisted in PostgreSQL. The RLS transaction context is set from the trusted organization context and fails closed when absent or mismatched. A queue or worker cannot use a process-wide organization setting.

Platform-global operations are a separate named path with explicit platform context and authorization. No generic optional organization filter or cross-organization query primitive exists. A reconciliation operation that examines multiple organizations is platform-global, tightly permissioned, auditable, and must not expose tenant payloads to an unrelated actor. Cross-organization business sharing remains prohibited unless a later decision defines the relationship, consent, authorization, audit, export, and revocation semantics.

Every asynchronous message must preserve authorization epoch and correlation data. An old message may be safely observed for audit or reconciliation, but it must not execute a sensitive action after revocation or epoch invalidation without a fresh policy decision.

## 13. Proposed package architecture

Implementation should add packages only where each package owns a coherent public boundary:

| Proposed package | Responsibility | Public API | Dependencies | Forbidden dependencies | Owner and tests |
|---|---|---|---|---|---|
| `packages/execution-contracts` | Framework-free event, outbox, queue, job, scheduler, retry, idempotency, approval, and execution contracts. | Immutable value types, state transitions, failure classes, repository and port interfaces. | `persistence-contracts` or a smaller shared context contract if later extracted. | PostgreSQL, Kysely, `pg`, NestJS, provider SDKs, Manus APIs, transport clients. | Platform execution ownership; unit and contract tests. |
| `packages/execution-runtime` | Provider-neutral orchestration of dispatch, claims, retries, approval reauthorization, and execution state transitions. | Use-case services and executor ports; no concrete database or broker API. | `execution-contracts`, platform authorization and audit contracts. | PostgreSQL clients, queue SDKs, provider SDKs, Manus APIs, private application repositories. | Execution ownership; unit, contract, failure-injection, and authorization-negative tests. |
| `packages/persistence-postgres` extension | PostgreSQL adapters for outbox, queue, jobs, schedules, approvals, idempotency, leases, and delivery records. | Adapter implementations of execution contracts. | Kysely, `pg`, existing persistence contracts, execution contracts. | NestJS in persistence semantics, provider SDKs, Manus APIs, unscoped query helpers. | Persistence/infrastructure ownership; real PostgreSQL migration, RLS, lease, constraint, rollback, and recovery tests. |
| `infrastructure/queue/<adapter>` | Optional provider adapter selected only after a concrete transport decision. | Provider-neutral adapter implementation and configuration mapping. | `execution-contracts`, selected provider SDK or protocol client. | Domain/application imports of provider APIs; Manus runtime dependency. | Infrastructure ownership; adapter contract and failure tests. |
| `infrastructure/scheduler/<adapter>` | Optional scheduler adapter if an external scheduler is later justified. | Provider-neutral scheduler implementation. | `execution-contracts`, standard protocol or provider SDK. | Domain/application imports of scheduler APIs; hidden hosted configuration. | Infrastructure ownership; clock, timezone, duplicate-occurrence, and recovery tests. |

The first implementation may use PostgreSQL-backed outbox and queue semantics inside the existing persistence adapter rather than adding an external broker. A package must not be created solely to mirror a conceptual directory. The exact package set is therefore a proposed boundary, subject to implementation review after approval.

No application module may import an execution adapter or write an outbox, queue, job, schedule, approval, or execution table directly. It uses the published contract owned by the platform or execution module. The module that owns a business action owns its action contract, permission requirements, event vocabulary, and domain invariants.

## 14. Implementation and migration ownership

If approved, G-004 implementation must add repository-owned migrations under a clearly owned path such as `infrastructure/database/migrations/execution/` or module-specific subdirectories. The execution owner must own the outbox, delivery attempts, queue leases, job lifecycle, schedule occurrences, idempotency records, approval requests, execution bindings, and relevant indexes and RLS policies. Migrations must be immutable, reviewable, and run through the G-003 migration mechanism.

The implementation must not add identity or membership schemas to make execution work. Until G-002 persistence is implemented, tests may use explicit test principals and contexts through contract fixtures, but those fixtures must not be presented as production authentication or authorization.

## 15. Verification requirements before G-004 implementation is accepted

A later implementation must prove at least the following with framework-free contract tests and real PostgreSQL integration tests:

- Outbox and business-state writes commit atomically or roll back together.
- A committed outbox record survives producer-process failure.
- Dispatch retries ambiguous outcomes without losing the event.
- Duplicate delivery is safe for an idempotent consumer.
- Organization A cannot read, claim, mutate, retry, cancel, or infer organization B's events, queues, jobs, schedules, approvals, or execution records.
- Platform-global paths are explicit and authorization-protected.
- Leases prevent concurrent claims and recover after expiry.
- Heartbeats and fencing prevent stale workers from acknowledging current work.
- Retry classification, backoff, jitter, maximum attempts, and dead-letter behavior are deterministic and auditable.
- Duplicate schedule occurrences cannot create duplicate jobs.
- Authorization epoch changes prevent stale sensitive work from executing.
- Revoked principals and expired approvals fail closed.
- Approval execution rejects changed action names, versions, inputs, targets, or resource preconditions.
- Approval replay is idempotent and cannot repeat a completed side effect.
- Audit records identify requester, executor, approver, organization or platform scope, authorization outcome, correlation, causation, and result.
- Migration rollback or forward-only policy is explicit for every schema change.
- The complete implementation runs with standard infrastructure and no Manus runtime dependency.

## 16. Decisions intentionally deferred

The following concerns remain outside this decision closure:

- The first external broker, queue, or scheduler vendor.
- Worker process topology, autoscaling, deployment, and production operations.
- Production retention duration, backup, restore, and disaster recovery.
- Provider-specific delivery guarantees and external side-effect reconciliation.
- Webhook verification and integration credential handling, owned by G-007.
- AI model execution and AI-specific approval policy, owned by G-006.
- Plugin execution and isolation, owned by G-005.
- File and object retention, owned by G-008.
- Production observability and incident operations, owned by G-009.
- Product entitlements and application installation, owned by G-010.

These deferrals are explicit. They must not be resolved through a library default or an implementation convenience.

## 17. Approval request

The maintainer is asked to approve or reject this G-004 architecture proposal. Approval should state whether the durable at-least-once and transactional-outbox baseline, explicit organization/platform scoping, reauthorization at execution time, immutable approval binding, and proposed package boundaries are accepted. Any deviation should identify the affected section and the replacement decision.

No G-004 implementation should begin until approval is recorded in `docs/DECISIONS.md`.

## References

[1]: ARCHITECTURE.md "Business OS Architecture"
[2]: REPOSITORY-STRUCTURE.md "Business OS Repository Structure"
[3]: DECISIONS.md "Business OS Architecture Decisions"
[4]: G-001-DECISION-CLOSURE.md "Business OS G-001 Decision Closure"
[5]: G-002-DECISION-CLOSURE.md "Business OS G-002 Identity and Authorization Decision Closure"
[6]: G-003-DECISION-CLOSURE.md "Business OS G-003 Database, Persistence, and Tenancy Decision Closure"
[7]: MULTI-TENANCY.md "Business OS Multi-Tenancy"
[8]: AUTOMATION.md "Business OS Automation"
[9]: DATABASE.md "Business OS Database Architecture"
[10]: PERMISSIONS.md "Business OS Permissions"
[11]: SECURITY.md "Business OS Security"
[12]: DEPLOYMENT.md "Business OS Deployment"
[13]: AI-AGENTS.md "Business OS AI Agents"
[14]: INTEGRATIONS.md "Business OS Integrations"
[15]: PLUGINS.md "Business OS Plugins"
[16]: APPS.md "Business OS Applications"
[17]: README.md "Business OS Repository Overview"

<!-- Author: Manus AI -->
<!-- Status: Proposed architecture only; pending maintainer approval. -->
<!-- No G-004 implementation is authorized by this document. -->
