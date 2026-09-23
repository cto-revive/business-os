# G-005 Plugin Runtime and Isolation Implementation Plan

## 1. Plan status and authorization boundary

**Status: IMPLEMENTATION PLAN REQUIRED / NO IMPLEMENTATION AUTHORIZED**
**Gate:** G-005
**Architecture status:** **APPROVED**
**Plan date:** 2026-09-23
**Owner:** Business OS maintainer

This document translates the approved G-005 architectural contract and security posture into an executable engineering plan. It is not implementation authorization. Approval of this plan, if granted, must be recorded separately and must explicitly authorize the implementation stages that are to begin.

The approved architecture selects capability-based host mediation, deny-by-default permissions, explicit organization and platform scope, immutable releases, and an out-of-process WASM-compatible security posture. It does not select a WASM engine, component model, host ABI implementation, native sandbox dependency, production deployment topology, or production executable-plugin enablement policy. Those choices require later implementation and security review.

No source code, package, migration, table, dependency, runtime adapter, SDK, artifact store, executable plugin, product module, AI runtime, integration, marketplace feature, or production deployment change is created by this plan.

## 2. Governing boundaries

G-002 remains the authority for identity, principals, authorization, delegation, revocation, separation of duties, and authorization epochs. Plugin identity is not a replacement for the effective principal. A plugin acting on behalf of a principal must carry explicit delegation and audit context.

G-003 remains the authority for PostgreSQL, Kysely and `pg` infrastructure placement, transaction boundaries, organization context, RLS, migration ownership, and persistence adapters. Plugin code must never receive a database handle, SQL text, Kysely object, PostgreSQL client, or RLS bypass.

G-004 remains the authority for durable events, jobs, queues, leases, fencing, retries, idempotency, approvals, execution records, authorization-epoch revalidation, and audit participation. G-005 must use those contracts and must not create a second queue, scheduler, lease model, retry system, idempotency store, approval system, execution record, or audit pipeline.

G-005 owns the plugin contract, manifest, capability declaration, installation-specific grants, lifecycle, invocation boundary, isolation posture, and plugin-specific compatibility rules. It does not own identity, authorization policy, persistence infrastructure, durable execution, or audit storage.

## 3. Critical implementation sequence

Implementation must preserve this sequence. Stages may be reviewed together, but they must not be silently skipped or collapsed into executable runtime work.

1. **Framework-free plugin contracts.** Define the public plugin model without framework, database, engine, or provider dependencies.
2. **Validation and architecture tests.** Prove manifest, capability, dependency, schema, and boundary rules before persistence or runtime work.
3. **Registry and installation model.** Define non-executable release, installation, configuration, grant, and lifecycle behavior.
4. **Persistence implementation.** Add only the approved plugin-owned persistence through G-003 PostgreSQL and RLS boundaries.
5. **Capability and permission enforcement.** Enforce installation grants, deny-by-default behavior, release permission diffs, and authorization-epoch checks.
6. **G-004 integration.** Bind plugin actions and event delivery to existing jobs, leases, fencing, retries, idempotency, approvals, execution records, and audit.
7. **Test-only runtime adapter.** Use a deterministic fake adapter to exercise host mediation and failure handling without executable untrusted code.
8. **Adversarial security verification.** Verify denial, tenant isolation, resource limits, malformed output, stale authority, and failure recovery.
9. **Concrete executable runtime implementation.** Begin only after the criteria in Section 27 are met and a separate implementation authorization is recorded.
10. **Controlled plugin enablement.** Begin only after the criteria in Section 28 are met and production enablement is separately approved.

## 4. Exact package and directory changes

The following paths are expected only during an authorized implementation phase. They must not be created during planning.

| Path | Planned responsibility | Boundary owner and dependency gate |
|---|---|---|
| `packages/plugin-contracts/package.json` | Framework-free package metadata and export map | G-005; may depend only on published shared or persistence contract types |
| `packages/plugin-contracts/tsconfig.json` | Strict TypeScript project configuration | G-005; follows existing workspace project-reference conventions |
| `packages/plugin-contracts/src/index.ts` | Manifest, release, capability, grant, installation, lifecycle, configuration, subscription, action, invocation, ABI, result, and error contracts | G-005; must not import NestJS, PostgreSQL, Kysely, `pg`, a WASM engine, or provider SDKs |
| `packages/plugin-runtime/package.json` | Provider-neutral runtime-policy package metadata and export map | G-005; depends on `plugin-contracts`, G-004 contracts, and approved shared contracts |
| `packages/plugin-runtime/tsconfig.json` | Strict TypeScript project configuration | G-005; follows existing workspace project-reference conventions |
| `packages/plugin-runtime/src/index.ts` | Manifest compatibility, lifecycle transitions, capability mediation, invocation-context reduction, runtime ports, result validation, and resource-limit contracts | G-005; must not select a concrete runtime engine or deployment topology |
| `packages/persistence-postgres/src/plugins.ts` | PostgreSQL repositories for plugin registry, releases, installations, grants, configuration, and subscriptions | G-003 owns the adapter boundary; G-005 owns record semantics; no plugin SQL outside this adapter |
| `infrastructure/database/migrations/plugins/<timestamp>_g005_plugins.cjs` | Plugin-owned registry and installation schema | G-003 migration convention plus G-005 schema ownership; create only after implementation authorization |
| `tests/unit/plugin-contracts.test.ts` | Pure contract, hashing, manifest, permission, lifecycle, and compatibility tests | G-005; framework-free |
| `tests/unit/plugin-runtime.test.ts` | Host mediation and lifecycle orchestration tests using fakes | G-005 and G-004 contract integration |
| `tests/contract/plugin-boundaries.test.ts` | Public export, forbidden dependency, ABI, and schema contract checks | G-005 and existing architecture rules |
| `tests/integration/plugins/postgres-plugins.test.ts` | Real PostgreSQL RLS, scope, constraints, lifecycle, and repository tests | G-003 real-PostgreSQL harness; G-005 record semantics |
| `tests/security/plugins/plugin-isolation.test.ts` | Adversarial capability, tenant, resource, stale-authority, and release tests | G-005 security acceptance; no concrete runtime required for all host-side cases |
| `.github/workflows/ci.yml` | Add plugin contract, persistence, security, and migration checks after implementation | CI remains standard GitHub Actions and Manus-independent |
| `docs/PLUGIN-ABI.md` | Versioned host ABI contract after ABI design is approved | G-005 implementation review; not created until the ABI is selected |

A separate plugin database package, queue package, scheduler package, approval package, audit package, secrets package, marketplace package, or WASM package is not planned. Those would duplicate existing ownership or prematurely select an implementation boundary.

## 5. Contract implementation order

The first implementation unit is `@business-os/plugin-contracts`. It must be usable by an independent developer without the runtime host or PostgreSQL.

The contract types should be introduced in this order:

1. Stable plugin identity, publisher identity, release version, manifest version, artifact digest, and compatibility identifiers.
2. Capability names, capability versions, target-resource scopes, requested-capability declarations, and resource limits.
3. Installation scope, installation identity, selected release, enablement state, and installation configuration version.
4. Permission grant, revocation, expiry, approver, policy version, authorization epoch, and installation binding.
5. Lifecycle state and validated transition commands.
6. Event subscription and action registration descriptors.
7. Reduced invocation context, host capability request, structured capability result, plugin result, and typed failure contracts.
8. G-004 approval-binding material, including release digest, action version, permission set, target identifiers, canonical input, resource preconditions, organization scope, and authorization epoch.
9. ABI version and host-call compatibility contracts without selecting an engine or component model.

Contracts must use plain TypeScript types and deterministic serialization helpers where hashing or binding is required. They must not contain persistence rows, SQL types, framework decorators, engine-specific handles, secrets, or host-internal objects.

## 6. Registry and installation implementation order

Registry and installation behavior must be implemented as a non-executable model before any runtime adapter is considered.

The order is:

1. Validate and normalize a manifest.
2. Verify release identity, semantic version, compatibility declarations, artifact digest format, and immutable-release rules.
3. Register a release in a reviewable state without making it executable.
4. Record an organization or explicit platform installation that references a registered immutable release.
5. Validate typed non-secret configuration against the release manifest.
6. Record requested capabilities separately from installation-specific permission grants.
7. Apply lifecycle transitions through a state machine rather than arbitrary status updates.
8. Calculate and review permission diffs on upgrade and downgrade.
9. Disable new invocations when an installation, release, or grant is revoked.
10. Retain release, installation, grant, approval, execution, and audit references required for history and investigation.

Installation must not imply enablement. A new release must not inherit newly requested capabilities without explicit grant review. A narrower release must not regain previously removed capabilities. A release change invalidates approval bindings when any G-004-bound value changes.

## 7. Persistence schema implementation plan

No schema is created by this plan. During authorized implementation, the plugin-owned migration should add only records required for registry and installation state.

| Planned table | Scope | Core fields and constraints | Reason for boundary |
|---|---|---|---|
| `plugin_registry` | Platform-global | Stable plugin ID, publisher identity, review state, lifecycle state, timestamps | Separates registry identity from organization installation state |
| `plugin_releases` | Platform-global | Plugin ID, semantic version, manifest version, immutable digest, manifest document, compatibility, provenance, release state | Makes release identity and artifact metadata immutable and reviewable |
| `plugin_installations` | Organization or explicit platform scope | Installation ID, organization ID nullable only for explicit platform scope, selected release, lifecycle state, configuration version, timestamps | Binds a release to one organization or approved platform scope |
| `plugin_permission_grants` | Organization or explicit platform scope | Installation ID, capability, capability version, resource scope, grant state, approver, policy version, epoch, expiry | Separates requested permissions from actual installation grants |
| `plugin_configurations` | Organization or explicit platform scope | Installation ID, schema version, validated non-secret configuration, timestamps | Stores typed configuration without secret material |
| `plugin_event_subscriptions` | Organization by default | Installation ID, event type/version, filter, delivery state, grant reference | Owns plugin subscriptions without duplicating G-004 delivery records |
| `plugin_artifact_references` | Platform-global | Release ID, digest, opaque artifact reference, provenance state | Records immutable artifact identity without selecting storage implementation |

The planned schema must use immutable release references, explicit foreign keys, unique constraints for plugin identity and release identity, installation-to-release compatibility checks, lifecycle-state checks, and indexes for organization, installation, release, and state lookups. JSON fields must be schema-versioned and validated at the boundary.

Plugin records must not contain tenant business records, secret material, durable job state, approval state, execution results, or audit history that belongs to G-004 or the platform audit owner.

## 8. RLS and organization-context implementation plan

Organization-scoped plugin tables must use the G-003 persistence adapter and its explicit `OrganizationContext`. The adapter must establish transaction-local organization context before repository access and must use the non-owner runtime role and forced RLS policies.

The RLS plan is:

1. Require `organization_id` on every organization-owned table.
2. Permit `NULL` only for explicitly classified platform-global records and only through the platform-scope path.
3. Use fail-closed policies when organization context is absent, empty, or mismatched.
4. Require installation, grant, configuration, and subscription operations to carry the active organization context.
5. Prevent an organization repository from reading or writing another organization’s installation, grant, configuration, event subscription, or lifecycle state.
6. Prevent a platform-scope repository from treating tenant data as platform-global data.
7. Bind plugin invocation context to the installation’s organization and verify it before any capability call.
8. Revalidate authorization epoch and installation/grant state immediately before sensitive effects.
9. Test organization switching, stale contexts, platform-scope misuse, missing context, and mismatched installation identifiers.

The plugin runtime never sets RLS variables directly. It passes a framework-free context to the host composition root, which uses the existing G-003 adapter.

## 9. Capability and permission enforcement plan

Capability enforcement must distinguish four states: requested by the manifest, reviewed by an operator, granted to an installation, and allowed for a particular invocation. These states must not be collapsed.

The host should normalize each capability into a stable name, version, target-resource scope, side-effect class, approval requirement, and credential class if applicable. The installation grant should contain the approved subset and must be narrower than or equal to the requested set.

Every host capability request must be checked against:

- Plugin identity and immutable release digest.
- Installation state and organization or platform scope.
- Effective principal and explicit delegation.
- Installation-specific grant and grant expiry/revocation state.
- Requested capability and capability version.
- Target resource and organization ownership.
- Current authorization epoch.
- Action approval and G-004 binding where required.
- Invocation deadline, resource limits, and cancellation state.

A manifest never grants authority. A release adding `write.customer` must trigger a permission diff and explicit review. Existing installations must not acquire that capability through upgrade alone. Removing a requested capability must preserve historical audit and must not restore a previously revoked grant.

## 10. Lifecycle and state-machine implementation plan

Lifecycle transitions must be represented as explicit commands with preconditions and audit events. Direct arbitrary status mutation is prohibited.

The planned state machine is:

`discovered -> registered -> installed -> configured -> enabled -> disabled -> removed`

The state machine also supports `upgrade_pending`, `upgraded`, and `rollback_eligible` transitions. Each transition must verify the actor, organization or platform scope, release compatibility, configuration version, permission diff, and in-flight execution policy.

Required transition behavior includes:

- **Register:** release metadata and digest are immutable after successful validation.
- **Install:** installation selects a registered release but remains non-enabled.
- **Configure:** configuration is typed and validated without secret material.
- **Enable:** grants, authorization, review state, and required configuration are valid.
- **Disable:** new invocations are rejected; in-flight G-004 work follows cancellation or completion policy.
- **Upgrade:** release compatibility and permission differences are reviewed; no new grant is implied.
- **Downgrade:** target release compatibility is proven; prior removed capabilities are not restored.
- **Rollback:** selects an immutable prior release and invalidates approvals whose binding changes.
- **Remove:** disables future work, retains required references, and follows later retention policy.

## 11. G-004 integration points

Plugin actions and event deliveries must use G-004 as follows:

1. Resolve the active installation and immutable release.
2. Validate action or event type against the manifest and registered extension point.
3. Establish the G-002 principal and G-003 organization context.
4. Create or reuse the G-004 job, queue message, correlation ID, causation ID, and idempotency key.
5. Create an approval binding when policy requires approval.
6. Claim work using the existing G-004 lease and fencing token.
7. Reauthorize the current principal, installation, grant, and authorization epoch before side effects.
8. Invoke the host-mediated capability boundary.
9. Validate the structured result and persist state through the existing transaction boundary.
10. Acknowledge, retry, dead-letter, cancel, or mark operator repair through G-004.
11. Append audit and outbox effects through existing ownership without creating plugin-specific pipelines.

Plugin code must never claim, heartbeat, acknowledge, retry, or dead-letter its own work. It receives a reduced invocation context and host capability functions only.

## 12. Approval-binding implementation points

Approval binding must include every material value that can change the security meaning or side effect of a plugin action:

- Plugin identity.
- Immutable release digest.
- Action type and action version.
- Installation identity and organization scope.
- Approved capability set and relevant capability versions.
- Effective principal and delegation context where part of policy.
- Canonical input and target identifiers.
- Resource versions or other preconditions.
- Policy version and authorization epoch.
- Idempotency identity and execution purpose where required.

The binding must use the existing G-004 canonical hashing and approval semantics. A release change, action-version change, permission-set change, target change, canonical-input change, resource-precondition change, policy change, or authorization-epoch change must not reuse the previous approval when the G-004 binding changes.

An approval grants the exact bound action. It does not authorize arbitrary actions by the same plugin, a different release, a broader capability set, or a different organization.

## 13. Configuration model

Configuration is a versioned, typed document associated with one installation and release compatibility range. The manifest declares the configuration schema and whether a field is public, sensitive metadata, or an opaque future credential reference. Secret material is excluded from the G-005 configuration model.

Configuration changes require schema validation, installation authorization, audit, and a compatibility check. A configuration update must not alter permissions, principal identity, organization scope, or runtime resource limits implicitly. Those changes require their own policy decision.

Configuration migration is a host-controlled operation. A plugin may propose a migration function through a later contract, but the host validates the result, records the old and new schema versions, and can roll back the installation state without mutating an immutable release.

## 14. Artifact and provenance model

G-005 defines immutable artifact identity but does not select artifact storage or signing infrastructure.

An artifact record should contain the plugin ID, release version, manifest digest, executable artifact digest, ABI compatibility, build metadata, provenance status, review status, and opaque storage reference. The artifact bytes must be immutable after registration. Replacing bytes under an existing release is prohibited.

The implementation plan requires:

- Deterministic digest computation over the release artifact and manifest.
- A provenance record describing source revision, build toolchain, dependency lockfile, and builder identity.
- Review state separate from registry presence.
- Revocation state that prevents new invocations while preserving audit evidence.
- No artifact bytes or private signing keys in the repository unless later policy explicitly requires it.
- No plugin artifact loading from mutable organization configuration.

Signing format, trust roots, registry transport, artifact storage, and deployment distribution remain open implementation decisions and must be resolved before executable runtime work.

## 15. Runtime-port abstraction

`plugin-runtime` should define a provider-neutral runtime port without selecting a concrete engine:

```ts
interface PluginRuntimePort {
  invoke(input: PluginInvocation): Promise<PluginInvocationResult>;
  cancel(invocationId: string): Promise<void>;
  inspect(): Promise<PluginRuntimeCapabilities>;
}
```

The final contract must define structured invocation input, bounded host calls, deadlines, cancellation, resource limits, output schemas, traps, timeouts, ambiguous completion, and typed failures. It must not expose engine-specific module handles, memory pointers, filesystem paths, sockets, process IDs, environment maps, database clients, or secret values.

The port must support a replaceable test adapter, a future concrete executable adapter, and a future deployment adapter without changing G-002, G-003, G-004, or plugin contract semantics. A runtime that cannot demonstrate the required isolation and resource guarantees must be rejected by the host policy.

## 16. Test-only runtime adapter strategy

Before any executable runtime is considered, implement a deterministic test-only adapter behind the runtime port. It should not execute plugin code. It should simulate:

- Successful host-mediated capability calls.
- Denied capabilities.
- Cross-organization requests.
- Stale authorization epochs.
- Revoked or expired grants.
- Disabled or removed installations.
- Malformed results.
- Timeouts, cancellation, traps, and ambiguous completion.
- Duplicate invocation and retry behavior.
- Lease expiry and stale fencing tokens.
- Approval-binding mismatches.
- Resource-limit violations.

The adapter must expose an event log for assertions but must not become a production execution mechanism. Tests must verify that the host rejects invalid requests before the adapter is called and that adapter failures cannot bypass G-004 state transitions or audit requirements.

## 17. Security and adversarial test plan

Security testing must combine unit, contract, PostgreSQL integration, and runtime-boundary tests.

The test plan must attempt to:

- Read another organization’s installation, grants, configuration, subscriptions, or results.
- Reuse a context after organization switching.
- Invoke with a missing, stale, revoked, or mismatched authorization epoch.
- Invoke a capability not present in the installation grant.
- Obtain a newly requested capability through an upgrade without approval.
- Restore a removed capability through downgrade or rollback.
- Reuse an approval for a different release digest or action version.
- Change canonical input, target, resource version, policy version, or scope after approval.
- Access raw PostgreSQL, Kysely, `pg`, private package imports, filesystem, network, process execution, inherited environment, or secrets.
- Exceed memory, execution-time, output-size, recursion, host-call, or concurrency limits.
- Return malformed or oversized output.
- Complete after lease expiry or with a stale fencing token.
- Produce duplicate effects after retry or ambiguous completion.
- Bypass disablement, removal, revocation, or cancellation.

Every denial must be fail-closed, tenant-safe, typed where the contract requires it, and auditable without recording secrets or unauthorized tenant data.

## 18. Architecture-test additions

After implementation authorization, architecture checks should add rules that:

1. Require `plugin-contracts` and `plugin-runtime` export maps and workspace dependency declarations.
2. Reject plugin contracts importing NestJS, PostgreSQL, Kysely, `pg`, filesystem, network, process, environment, WASM-engine, or provider SDK modules.
3. Reject plugin runtime code importing concrete engine or deployment adapters unless the adapter is in an explicitly approved infrastructure package.
4. Reject required platform packages importing optional plugin implementations.
5. Reject plugin code importing private Business OS packages or deep package paths.
6. Reject direct SQL or persistence imports from plugin contracts and plugin code.
7. Require all plugin tables and repositories to declare the G-003 organization/platform scope boundary.
8. Require test-only adapters to remain outside production runtime composition roots.
9. Reject Manus SDK, Manus runtime, Manus-managed database, or hidden Manus configuration dependencies.

These checks must be implemented only when the corresponding packages exist and must not be created as empty scaffolding during this planning phase.

## 19. CI changes

The CI workflow should be extended in stages after implementation authorization:

- **Contract stage:** format, lint, typecheck, contract tests, manifest schema tests, and architecture checks.
- **Persistence stage:** start PostgreSQL, apply G-003 migrations, apply plugin-owned migrations, grant least-privilege runtime access, and run RLS and constraint tests.
- **Execution stage:** run G-004 integration tests with plugin action and event fixtures.
- **Security stage:** run adversarial host-mediation and test-adapter tests; run dependency and artifact-provenance checks.
- **Build stage:** build all workspace projects and verify that no plugin package requires Manus.

CI must use standard GitHub Actions services and repository-owned commands. The plugin plan must not add an external broker, cloud registry, managed database, proprietary build service, or Manus-specific step. Concrete runtime CI requirements remain conditional on later engine and deployment approval.

## 20. Migration sequencing

Plugin migrations must not be written before implementation authorization. When authorized, the sequence is:

1. Validate framework-free plugin contracts and migration ownership.
2. Apply G-003 foundation migrations to a clean PostgreSQL database.
3. Create platform-global registry and release tables.
4. Create organization-scoped installation, grant, configuration, and subscription tables.
5. Enable and force RLS before granting runtime access.
6. Create fail-closed tenant and explicit platform policies.
7. Add constraints, indexes, immutable-release protections, and foreign keys.
8. Grant only the least privileges required by the existing persistence adapter.
9. Run clean-schema, up/down, drift, tenant-isolation, and migration-order tests.
10. Record migration ownership and version in repository documentation.

Migrations must be forward-first and immutable after publication. Destructive changes require a separate reviewed migration and retention/export analysis. No migration may create queue, scheduler, approval, execution, or audit tables owned by G-004 or the platform audit module.

## 21. Rollback strategy

Rollback must operate at the release and installation state level. It must not mutate an immutable release or artifact digest.

A rollback requires:

- A previously registered immutable release with compatible configuration and data contracts.
- Explicit authorization for the organization installation.
- A permission diff review that does not restore previously removed capabilities.
- New approval bindings for actions whose release, action version, permission set, target, input, or resource preconditions change.
- Disablement or cancellation policy for in-flight work.
- G-004 idempotency and execution records preserved across the transition.
- Audit records for the reason, actor, prior release, selected release, and affected executions.

If a release is revoked for security reasons, new invocations must fail closed. Existing execution records, audit events, and artifact references remain available for investigation. Database rollback must not erase security history.

## 22. Observability and audit requirements

Every plugin lifecycle transition, grant decision, capability request, denial, invocation, result classification, failure, retry, cancellation, release change, rollback, revocation, and configuration change must be represented through existing audit ownership.

Logs and metrics must include plugin ID, release digest, installation ID, organization-safe correlation ID, action or event type, execution ID, authorization outcome, latency, resource-limit outcome, and failure category. They must not include secret material, raw credentials, unauthorized tenant payloads, or arbitrary plugin output without redaction and size controls.

G-004 owns execution and delivery evidence. G-002 owns principal and authorization evidence. G-003 owns persistence scope and transaction evidence. The plugin boundary contributes structured metadata but does not create a separate audit store or observability pipeline.

## 23. Human developer workflow

A human plugin developer should be able to work from a GitHub clone with standard tooling:

1. Read the published plugin contract and supported ABI version.
2. Create an immutable manifest with identity, release, compatibility, requested capabilities, schemas, limits, and lifecycle declarations.
3. Implement only the public host ABI and never import private Business OS packages.
4. Run repository-owned contract, manifest, schema, permission-diff, and adversarial denial tests.
5. Produce a deterministic artifact and digest using a documented toolchain.
6. Run the test-only runtime adapter and inspect structured host-call results.
7. Submit manifest, artifact digest, provenance, compatibility evidence, and security-test results for review.
8. Install only through the controlled registry and organization lifecycle flow after approval.

The workflow must remain possible without Manus login, Manus APIs, Manus storage, or hidden environment variables.

## 24. Independent AI developer workflow

An independent AI coding agent must be able to continue from the repository alone. Its workflow is:

1. Read `AGENTS.md`, `docs/DECISIONS.md`, this plan, and the approved G-005 decision package.
2. Check the current gate and implementation authorization before changing source code.
3. Implement one sequence stage at a time and update tests and documentation in the same repository.
4. Use explicit package boundaries and architecture checks rather than inferring authority from folder names.
5. Treat manifest capabilities as requests and installation grants as the only effective plugin authority.
6. Use G-003 repositories and G-004 execution ports rather than creating infrastructure duplicates.
7. Record unresolved runtime-engine, ABI, provenance, and deployment decisions instead of silently selecting them.
8. Run standard local validation and CI with PostgreSQL where the stage requires it.
9. Stop before executable runtime work unless the explicit criteria in Section 27 have been met and implementation authorization is recorded.

No AI agent may interpret architecture approval as implementation authorization or enable a plugin based only on a manifest declaration.

## 25. Manus-independence verification

The implementation must pass all of the following checks before a stage is considered complete:

- `git clone` plus documented standard toolchain setup is sufficient to inspect and build the affected contracts.
- No source package imports a Manus SDK, Manus runtime, Manus-managed database client, or hidden Manus module.
- No required environment variable is Manus-specific.
- PostgreSQL is used through the repository-owned G-003 adapter and standard infrastructure.
- CI runs on GitHub Actions with standard PostgreSQL services and repository-owned commands.
- Test-only runtime behavior is deterministic and does not call Manus services.
- Artifact, manifest, registry, installation, and permission formats are repository-documented and portable.
- A future concrete runtime adapter can be replaced without changing plugin, authorization, persistence, execution, or audit contracts.
- A human engineer or independent AI coding agent can reproduce validation using GitHub and standard infrastructure alone.

## 26. Implementation risks and open decisions

The following risks require explicit treatment during implementation:

- A WASM runtime may claim isolation without providing sufficient escape, resource, or host-call guarantees.
- A component model or ABI may leak engine-specific authority into framework-free contracts.
- Manifest parsing or canonicalization bugs may create permission expansion or approval-binding ambiguity.
- Configuration migrations may create incompatible state during downgrade or rollback.
- Artifact provenance may be too weak to support release revocation or supply-chain investigation.
- Host capability implementations may accidentally return excessive tenant data or secret material.
- At-least-once delivery and ambiguous completion may create external duplicate effects.
- RLS policies may protect tables while an adapter bypasses organization context.
- Declarative UI contributions may drift into a browser-side code-execution boundary.
- Operational telemetry may reveal payloads or credentials.

Open implementation decisions are:

1. Which WASM engine and runtime version, if any, will pass security review?
2. Whether the first implementation uses the WASM core model or a component model.
3. The exact host ABI and serialization format.
4. Artifact signing, provenance, trust roots, and revocation process.
5. Supported plugin languages and deterministic build toolchains.
6. Registry transport and artifact storage ownership under later gates.
7. Host resource-limit defaults and deployment-specific hard limits.
8. Which capabilities require platform approval, organization approval, or G-007 credentials.
9. The first stable event and action extension points.
10. Declarative UI surfaces and their server-side permission checks.
11. Retention, export, deletion, and organization-offboarding behavior.
12. G-009 deployment checks required before any executable plugin can be enabled.

No open decision may be resolved by adding an unapproved dependency or implementation.

## 27. Criteria before executable runtime work may begin

Concrete executable runtime implementation may begin only when all of the following are true:

1. Framework-free plugin contracts are implemented, reviewed, and covered by contract tests.
2. Manifest, release, capability, installation, lifecycle, and permission-diff rules are implemented and tested.
3. Architecture checks prove that contracts and plugin code cannot import forbidden frameworks, providers, persistence, or private packages.
4. Registry and installation persistence is implemented through G-003 boundaries with real PostgreSQL RLS tests.
5. Permission enforcement proves deny-by-default behavior, installation-specific grants, release expansion protection, and authorization-epoch revalidation.
6. G-004 integration proves jobs, leases, fencing, retries, idempotency, approvals, execution records, cancellation, and audit ownership without duplication.
7. Approval binding covers release digest, action version, permissions, targets, canonical input, preconditions, policy version, scope, and epoch.
8. The test-only runtime adapter passes host-mediation, tenant-isolation, failure, duplicate-delivery, and stale-fencing tests.
9. Adversarial verification covers all denied authority surfaces and resource-limit behavior required by the approved posture.
10. A concrete engine, ABI, component model, runtime adapter, native dependency, and deployment topology have each undergone separate implementation and security review.
11. The runtime demonstrates the required sandbox guarantees in every environment where it may execute untrusted plugins.
12. The maintainer has explicitly authorized executable runtime implementation in a new recorded decision or implementation authorization.

If any required sandbox guarantee is absent or unproven, executable untrusted plugins must not be enabled.

## 28. Criteria before controlled plugin enablement may begin

Controlled enablement may begin only when all of the following are true:

1. The concrete runtime implementation passed security and adversarial review.
2. The runtime adapter is replaceable and does not change G-002, G-003, G-004, or G-005 contracts.
3. Artifact provenance, immutable digests, release review, revocation, and rollback are operationally tested.
4. Installation-specific permission review and upgrade/downgrade protection are proven in real PostgreSQL tests.
5. Organization A cannot inspect, invoke, configure, or infer Organization B’s plugin state or data.
6. Secrets and credentials remain outside the plugin ABI unless a separately approved G-007 capability exists.
7. G-004 duplicate delivery, ambiguous result, lease expiry, stale fencing, cancellation, retry, approval, and audit tests pass.
8. Resource limits, timeouts, output validation, cancellation, and failure recovery are enforced by the host and runtime.
9. CI passes with standard GitHub Actions and PostgreSQL services without Manus.
10. Production deployment topology and operational controls have been separately reviewed under the appropriate later gate.
11. The first plugin and first capabilities have an explicit scope, review record, rollback plan, and organization enablement policy.
12. The maintainer has separately authorized controlled enablement. Architecture approval and implementation-plan approval alone are insufficient.

## 29. Definition of done by implementation stage

| Stage | Definition of done |
|---|---|
| Framework-free contracts | Public contracts compile independently, expose no forbidden dependencies, and have deterministic schema and binding tests |
| Validation and architecture tests | CI rejects invalid manifests, forbidden imports, undeclared capabilities, incompatible versions, and non-portable dependencies |
| Registry and installation model | Non-executable registry, immutable releases, installations, lifecycle transitions, configuration validation, and permission diffs are implemented and tested |
| Persistence implementation | G-003 repositories, migrations, constraints, RLS, least privilege, clean-schema tests, and tenant-negative tests pass |
| Capability and permission enforcement | Deny-by-default host mediation, installation grants, epoch checks, revocation, and release expansion protection pass security tests |
| G-004 integration | Plugin actions and events use existing jobs, leases, fencing, retries, idempotency, approvals, execution records, and audit without duplicates |
| Test-only runtime adapter | Deterministic adapter covers success, denial, timeout, cancellation, malformed output, ambiguous result, and resource-limit cases |
| Adversarial verification | Security tests prove isolation, forbidden authority denial, stale-binding rejection, tenant separation, and failure containment |
| Concrete executable runtime | Separately selected engine/ABI/runtime/deployment adapter passes security review and all runtime criteria |
| Controlled enablement | A bounded pilot passes operational, rollback, audit, CI, deployment, and explicit maintainer enablement review |

## 30. Planning-stage stop condition

This document is complete as an implementation plan. It does not authorize source changes or runtime work. The next action requires explicit implementation authorization for the requested stage.

**Current G-005 status: ARCHITECTURE APPROVED / IMPLEMENTATION PLAN REQUIRED.**

## References

[1]: G-005-DECISION-CLOSURE.md "G-005 Plugin Runtime and Isolation Decision Package"
[2]: G-002-DECISION-CLOSURE.md "G-002 Identity and Authorization Decision Closure"
[3]: G-003-DECISION-CLOSURE.md "G-003 Persistence and Tenancy Decision Closure"
[4]: G-004-DECISION-CLOSURE.md "G-004 Events, Reliable Execution, and Durable Approval Decision Closure"
[5]: ARCHITECTURE.md "Business OS Architecture"
[6]: REPOSITORY-STRUCTURE.md "Business OS Repository Structure"
[7]: MULTI-TENANCY.md "Business OS Multi-Tenancy"
[8]: PLUGINS.md "Business OS Plugins"
[9]: DECISIONS.md "Business OS Architecture Decisions"
[10]: ../AGENTS.md "Business OS Contributor Guidance"

<!-- Author: Manus AI -->
<!-- Status: Architecture approved; implementation plan required; no implementation authorized. -->
