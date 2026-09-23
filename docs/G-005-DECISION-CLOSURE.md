# G-005 Plugin Runtime and Isolation Decision Package

## 1. Status and authority

**Status: PROPOSED / AWAITING APPROVAL.**

**Gate:** G-005
**Proposal date:** 2026-09-23
**Owner:** Business OS maintainer
**Decision required:** Plugin package, manifest, permission, isolation, review, versioning, installation, and lifecycle model.

This document is a decision package for maintainer review. It does not authorize executable plugin support, plugin packages, plugin migrations, runtime adapters, SDKs, marketplace functionality, or product features. G-005 must remain pending until the maintainer explicitly approves this document or an amended version.

G-001, G-002, G-003, and G-004 remain authoritative. G-006 through G-010 remain pending. No decision in this proposal changes identity, authorization, persistence, durable execution, AI, integration, storage, deployment, or marketplace governance.

## 2. Problem statement

Business OS needs an extension boundary that allows optional capabilities without allowing extensions to modify core source, bypass authorization, access another organization, or make the platform dependent on one provider. Existing documentation defines the conceptual plugin boundary but intentionally leaves executable runtime isolation unresolved.

The central G-005 problem is therefore not how to load a package. It is how to execute code that may be buggy, compromised, or intentionally malicious while preserving organization isolation, deny-by-default authorization, credential boundaries, durable execution, auditability, and independent operation from GitHub and standard infrastructure.

A plugin is not trusted merely because an administrator installed it. Installation is an authorization and supply-chain event. Execution requires a separate capability decision and a fresh authorization check.

## 3. Goals

G-005 should establish a provider-neutral contract for plugins and select a runtime security posture before executable plugin support exists. It should define the boundaries between plugin metadata, executable code, permissions, organization installation state, and runtime execution state.

The approved design should allow a human developer or an independent AI coding agent to create, validate, test, package, and review a plugin using repository-owned contracts and standard tooling. It should allow future implementations to run without Manus APIs, Manus runtime services, Manus-managed storage, or hidden configuration.

The design should integrate with G-004 durable execution. Plugin invocation should become a registered, authorized action or event delivery, not a second queue, retry, lease, idempotency, approval, or audit system.

## 4. Non-goals

G-005 does not implement an AI model provider, agent runtime, retrieval system, prompt-data policy, or AI cost controls. Those decisions belong to G-006.

G-005 does not implement business applications, a marketplace, external integrations, OAuth, API-key storage, webhook verification, file storage, production deployment, infrastructure-as-code, or environment promotion. Those concerns remain governed by G-007 through G-010 where applicable.

G-005 does not provide unrestricted plugin networking, arbitrary native code execution, direct PostgreSQL access, direct filesystem access, unrestricted process execution, or an implicit trust model for administrator-installed code.

G-005 does not claim that a logical capability check is equivalent to operating-system isolation. If a runtime cannot provide a real sandbox, it must not be presented as a secure untrusted-plugin runtime.

## 5. Existing constraints

The repository is a modular monolith. Platform core must not depend on optional plugins, and plugins may consume published contracts but may not import private internals or mutate core source. The repository is authoritative, and all required source, migrations, tests, configuration, and architecture documentation must remain portable and committed to GitHub. [1]

Organization is the primary tenant boundary. Every organization-owned installation, configuration, event subscription, command, invocation, credential reference, and audit record must carry organization context and must be checked server-side. Cross-organization access is prohibited by default. [2]

G-002 defines provider-neutral principals, membership, authorization, delegation, revocation, separation of duties, and audit semantics. A plugin identity does not replace the effective principal. When a plugin acts on behalf of a user, service, integration, automation, or AI agent, that delegation must be explicit and auditable.

G-003 defines PostgreSQL, transaction-owned persistence, organization context, RLS, migration ownership, and persistence boundaries. Plugin persistence must use those boundaries. Plugin code must not receive a database handle, Kysely object, PostgreSQL client, SQL text, or RLS bypass.

G-004 defines durable events, jobs, queue messages, leases, fencing, retries, idempotency, approvals, execution records, authorization-epoch revalidation, and audit participation. G-005 must consume those contracts and must not create a competing execution framework. [3]

## 6. Definition of a Business OS plugin

A **plugin** is an optional, versioned extension identified by a stable namespace and governed manifest. It contributes behavior through explicitly published Business OS extension points. A plugin cannot redefine organization, identity, authorization, persistence, execution, audit, or other platform ownership boundaries.

A plugin has five distinct conceptual layers:

| Layer | Meaning | Authority and mutability |
|---|---|---|
| Plugin metadata | Stable identity, publisher, release versions, manifest, compatibility, declared capabilities, artifact digest, and lifecycle state | Registry-owned; release metadata is immutable after publication |
| Plugin executable code | The compiled or packaged implementation associated with one immutable release digest | Artifact-owned; never loaded solely from mutable organization configuration |
| Plugin permissions | Requested capabilities and the grants approved for a particular installation or invocation | Policy-owned; requested permissions are not grants |
| Organization installation state | The organization’s selected version, enablement state, configuration references, event subscriptions, and granted permissions | Organization-owned and RLS-protected |
| Runtime execution state | Invocation, lease, attempt, result, failure, approval, and audit state | G-004 execution and audit ownership; not plugin-owned |

### 6.1 Identity and version

A plugin identity is a stable, namespaced identifier such as `publisher.plugin-name`. The identifier is not reused for a different publisher or unrelated capability. A publisher identity is separately represented and is not inferred from a package name.

A plugin release is identified by the plugin ID, semantic version, immutable artifact digest, manifest version, and compatibility declaration. A release is immutable after publication. Replacing bytes under the same version is prohibited. A release with a changed executable, manifest, permission declaration, or ABI requires a new version and digest.

### 6.2 Manifest

The manifest is signed or otherwise provenance-bound metadata validated by repository-owned tooling before registration. It must declare:

- Plugin ID, publisher identity, release version, manifest schema version, and artifact digest.
- Supported Business OS contract versions and host capability versions.
- Declared extension points, commands, events, UI contributions, configuration schema, and lifecycle support.
- Requested capabilities and the resource scope required by each capability.
- Whether a capability requires user authorization, organization-administrator approval, platform approval, or an existing G-007 credential.
- Resource, time, memory, output-size, and concurrency expectations.
- Failure, retry, cancellation, and compatibility behavior.
- Whether the plugin is organization-scoped or platform-scoped. Platform scope requires separate platform approval and cannot be obtained from an organization installation.

The manifest is descriptive. It cannot grant itself permission, widen a host capability, or cause the host to expose a private package.

### 6.3 Capabilities and permissions

A capability is a named host operation with a narrow request and response contract. Examples may include reading a specific published object type, proposing an action, emitting a bounded event, registering an action, or contributing a UI descriptor. A capability is not a general-purpose object, database, filesystem, network, or process permission.

Permissions are evaluated as a tuple of plugin identity, release version, organization or platform scope, effective principal, requested capability, target resource, authorization epoch, and invocation purpose. Requested permissions are displayed and reviewed before installation. An installation grant may be narrower than the manifest request. Unlisted capabilities are denied.

Permission evaluation is deny-by-default. A plugin cannot treat an event subscription, UI contribution, configuration value, or action registration as an implicit permission to read or mutate the related data.

### 6.4 Configuration

Plugin configuration is typed, versioned, validated against the release manifest, and scoped to an organization or platform according to the owning capability. Configuration contains references or non-secret values only unless a future credential contract explicitly defines otherwise.

Configuration changes are audited, validated against the installed release, and versioned where compatibility requires it. A plugin cannot interpret arbitrary configuration as an authority grant or as raw executable code.

### 6.5 Lifecycle

The lifecycle is explicit:

1. **Discovered:** metadata is available for review but is not executable.
2. **Registered:** the release passed manifest, provenance, compatibility, and artifact validation.
3. **Installed:** an organization or platform scope selected the release and recorded the installation.
4. **Configured:** required non-secret configuration passed validation.
5. **Enabled:** an authorized administrator enabled the installation and granted its approved capabilities.
6. **Disabled:** new invocations and event deliveries are rejected; in-flight work follows the cancellation policy.
7. **Upgrade pending:** a newer compatible release is available but not active.
8. **Upgraded:** the new release passed compatibility and migration checks and became active under an explicit rollout decision.
9. **Rollback eligible:** the previous immutable release remains available for a controlled rollback.
10. **Removed:** the installation is disabled, future invocations are rejected, references are retained for audit, and deletion follows retention policy.

Installation, enablement, disablement, upgrade, downgrade, and removal are separate operations. Installation does not imply enablement. Disabling a plugin does not erase execution or audit history. A downgrade is allowed only when the target release declares compatibility with the persisted configuration and data contract; otherwise it requires an explicit migration or a new installation state.

### 6.6 Organization and platform scope

Organization-scoped plugins execute only for the organization installation that granted them. Organization context is mandatory for every organization-scoped invocation and is bound to the installation, effective principal, authorization epoch, and G-004 execution record.

Platform-scoped extensions are limited to explicitly defined service-level functions that do not access tenant business data. They require a distinct platform installation and platform principal. A platform-scoped plugin cannot use platform scope as a shortcut to query organization records or enumerate tenants.

A plugin installation cannot be copied between organizations by copying configuration. Installation state, permission grants, credential references, and approval history are organization-specific.

### 6.7 Secrets and credentials boundary

A plugin sees credential metadata and a capability result, not the secret store. Secret material is owned by the future credential and integration boundary. G-005 defines only the boundary: a host-controlled capability may perform one narrowly scoped operation using a credential that is already authorized for the organization and action.

The host must not place secrets in plugin configuration, environment variables, process arguments, logs, event payloads, error messages, or general-purpose plugin memory accessible through another capability. Credential access requires an explicit capability grant, organization binding, effective principal, authorization epoch, purpose, expiry, and audit record. Revocation and rotation invalidate future capability use without requiring the plugin to know the underlying secret.

G-005 does not implement a secrets provider. Credential storage, OAuth, API keys, rotation, and provider-specific access remain gated by G-007.

### 6.8 Events, actions, and UI contributions

Event subscriptions are registered against versioned event types and bounded payload schemas. The host filters events by organization scope and subscription grant. A subscription does not provide historical database access or permission to publish arbitrary events.

Commands and actions are registered with a stable action type and version. The registration declares input schema, target types, required permissions, approval requirements, side-effect classification, idempotency requirements, and output schema. Execution uses G-004 action and execution contracts.

UI contributions are declarative descriptors, not arbitrary host-page code. They identify a published surface, renderable component type, input schema, action references, and required permissions. A UI descriptor cannot access browser storage, cookies, arbitrary DOM nodes, host tokens, or private API endpoints. Client-side UI isolation is not treated as a substitute for server-side authorization.

## 7. Security and isolation model

The selected security posture is **capability-based host mediation plus an out-of-process WASM execution boundary for executable plugin code**. The host owns authorization, organization context, persistence, secrets, execution records, audit, and resource policy. The plugin receives only a narrow ABI and explicitly scoped data.

WASM is the preferred executable format because it can support multiple implementation languages while allowing the host to expose a small capability surface rather than a general Node.js or operating-system API. WASM alone is not the entire security model. The selected runtime must enforce memory, execution-time, output-size, recursion, and host-call limits, and must deny filesystem, network, process, environment, and raw host access unless a future capability explicitly and safely defines one.

The host must treat the WASM runtime and any native runtime dependency as a security-sensitive infrastructure adapter. A runtime implementation must document its sandbox guarantees, escape history, version policy, resource controls, and failure behavior. If a deployment cannot provide the selected sandbox guarantees, executable untrusted plugins must not be enabled there.

### 7.1 Authority matrix

| Resource or operation | Plugin default | Required control |
|---|---|---|
| Authentication context | No direct access | Host supplies a reduced, signed invocation context containing only effective principal and scope needed by the action |
| Authorization | No direct policy bypass | Host authorizes every capability and revalidates G-002 epoch before sensitive effects |
| Organization data | No direct query access | Published capability with organization-bound request and RLS-protected host repository |
| Secrets | Denied | Host-mediated, narrowly scoped credential capability from the future G-007 boundary |
| Database/PostgreSQL | Denied | No connection, SQL, Kysely, pool, or persistence contract is exposed |
| Filesystem | Denied | No filesystem capability in the baseline runtime |
| Network | Denied | No unrestricted sockets, DNS, HTTP client, or proxy access |
| Process execution | Denied | No subprocess, shell, native module, or signal access |
| Environment variables | Denied | No inherited environment; configuration is explicit and validated |
| Internal Business OS packages | Denied | Plugin imports only the versioned plugin ABI; no workspace package access |
| Execution infrastructure | Indirect only | Plugin requests a registered action; host uses G-004 queue, lease, retry, idempotency, approval, and audit contracts |
| Other plugins | Denied by default | No shared memory or direct calls; interaction occurs through published, authorized events or actions |
| Other organizations | Denied | Installation-bound organization context, host authorization, and RLS defense in depth |
| Host UI | Denied for executable code | Declarative UI contributions only |

Logical permission checks are necessary but are not sufficient for arbitrary untrusted code. The WASM boundary limits direct authority; the host remains responsible for capability implementation. A malicious host or privileged infrastructure operator is outside the plugin sandbox threat model and is governed by deployment, supply-chain, and operational controls in later gates.

## 8. Runtime models and trade-offs

| Model | Security | Portability | Complexity | Failure isolation | Developer experience | Decision |
|---|---|---|---|---|---|---|
| In-process trusted code | Weakest; memory and dependency escape risks | High within one runtime | Low | Poor | Familiar | Reject for untrusted executable plugins |
| Worker-process plugins | Better process failure isolation, but not a complete sandbox | High on standard operating systems | Moderate | Moderate | Familiar for Node developers | Insufficient as the baseline security boundary |
| Isolated subprocesses with OS controls | Strong when seccomp, namespaces, resource limits, and artifact policy are correctly deployed | Uneven across platforms | High | Strong | Moderate | Possible infrastructure adapter, but deployment guarantees belong to G-009 |
| Containers | Strong operational isolation when configured correctly | Good on Linux, heavier locally | High | Strong | Moderate | Not selected as the plugin contract; may host a future runtime adapter |
| WASM with capability-based host ABI | Strong direct-access containment when the runtime is maintained and limits are enforced | High across standard runtimes | Moderate | Strong inside the runtime | Good for multiple languages, with ABI/tooling work | **Recommended baseline** |
| Remote plugin service | Strong process and dependency separation, but expands network and identity attack surface | High | Very high | Strong | Flexible but operationally expensive | Defer; not required by G-005 |

The recommendation is not based only on convenience. In-process and ordinary worker-process execution cannot credibly prevent access to internal packages, environment variables, raw PostgreSQL, or arbitrary network and process facilities. Containers and remote services can provide strong boundaries but introduce deployment and coordination decisions that belong to G-009. WASM provides the best portable contract for denying authority at the host-call boundary while preserving a future path for stronger deployment isolation.

G-005 therefore defines a WASM-compatible plugin ABI and host capability model but does not implement a WASM engine, native sandbox, container runtime, artifact store, or production deployment policy. Those implementation choices require a later implementation review and must meet the security acceptance criteria below.

## 9. Proposed package boundaries

G-005 should add only real architectural boundaries:

- `packages/plugin-contracts`: framework-free manifest, release, capability, permission, configuration, installation, lifecycle, event subscription, action registration, invocation envelope, ABI version, and structured result contracts. It may depend on stable shared and persistence contract types but must not import NestJS, PostgreSQL, Kysely, `pg`, a WASM engine, a filesystem API, or a provider SDK.
- `packages/plugin-runtime`: provider-neutral policy and runtime ports. It owns capability mediation, invocation context reduction, manifest compatibility checks, lifecycle transition rules, resource-limit contracts, and the `PluginRuntimePort`. It consumes `plugin-contracts` and G-004 execution contracts but does not select a WASM engine or container implementation.
- `packages/persistence-postgres`: later implementation location for plugin registry and installation repositories, using the existing PostgreSQL adapter boundary. A separate plugin persistence package is not justified unless the adapter becomes independently owned.
- `infrastructure/database/migrations/plugins/`: later plugin-owned migrations, only after G-005 approval and implementation authorization.
- `tests/unit`, `tests/contract`, `tests/integration/plugin`, and `tests/security/plugin`: later verification locations. No directories should be created during this proposal phase.

A separate package for manifest, permissions, lifecycle, invocation, events, configuration, and installation is not justified at this stage. These are one plugin contract boundary with related types. A separate WASM package is also not justified before the runtime engine and deployment guarantees are selected. It must be an infrastructure adapter, not part of the framework-free plugin contract.

## 10. Integration with G-004

Plugin invocation is represented as a registered G-004 action or event delivery. G-005 does not create another queue, scheduler, retry policy, lease type, execution identity, idempotency store, approval table, or audit pipeline.

A host command follows this sequence:

1. Resolve the organization installation and immutable plugin release.
2. Validate the action type, version, manifest compatibility, installation state, configuration version, and capability grant.
3. Establish the G-002 principal and organization context.
4. Create or reuse the G-004 job, idempotency key, approval binding, and execution identity according to the action contract.
5. Reauthorize immediately before the sensitive side effect, including the current authorization epoch and installation state.
6. Construct a reduced plugin invocation envelope. The envelope contains only the action input, permitted target references, effective principal context, capability handles, deadline, correlation identifiers, and cancellation signal required by the action.
7. Execute through `PluginRuntimePort` under the G-004 lease and fencing token.
8. Validate the structured result against the action output schema.
9. Persist the result, audit event, and outbox effects through the existing transaction boundary where applicable.
10. Acknowledge, retry, dead-letter, cancel, or mark operator repair through G-004 semantics.

Retries reuse the same durable job and idempotency identity unless the action contract explicitly requests a new operation. A retry never widens permissions or changes the organization context. A lease expiry produces a new fencing token; stale plugin results cannot commit protected local state.

Approvals bind the exact plugin action type, action version, plugin release digest, canonical input, target identifiers, resource preconditions, installation identity, organization scope, authorization epoch, and approval policy version. Changing the plugin release or any binding component requires a new approval. A plugin cannot approve its own action unless a separate policy explicitly permits it, and the requester/approver separation-of-duties rule remains authoritative.

Timeouts are host-enforced. A plugin cannot extend its deadline by changing its own input. Cancellation prevents new host capability calls and marks the G-004 execution according to its cancellation state. A runtime may not promise that an already-started external side effect was cancelled; such ambiguity is recorded and handled by the action’s idempotency and reconciliation policy.

## 11. Persistence implications

G-005 is expected to require database structures during implementation, but this proposal creates no migrations. The following ownership is proposed:

| Record | Scope | Owner | Purpose |
|---|---|---|---|
| `plugin_registry` | Platform-global | Plugin platform | Stable plugin identity, publisher, review state, and lifecycle metadata |
| `plugin_releases` | Platform-global | Plugin platform | Immutable version, manifest, artifact digest, ABI compatibility, provenance, and release state |
| `plugin_installations` | Organization or explicit platform scope | Plugin platform | Selected release, enablement state, organization binding, configuration version, and installation lifecycle |
| `plugin_permission_grants` | Organization or explicit platform scope | Authorization/plugin platform | Approved capability grants, scope, approver, policy version, and revocation state |
| `plugin_configurations` | Organization or platform scope | Plugin platform | Validated non-secret configuration and schema version; secret values remain references |
| `plugin_event_subscriptions` | Organization scope by default | Owning event/plugin boundary | Versioned subscriptions, filters, delivery policy, and enablement state |
| `plugin_artifact_references` | Platform-global | Plugin platform/infrastructure adapter | Immutable digest and opaque artifact reference; blob storage remains deferred to G-008/G-009 |

Runtime invocations, jobs, leases, execution results, idempotency, approvals, and audit records remain G-004 or platform-audit-owned. Plugin tables must not duplicate those records.

Organization-scoped tables require `organization_id`, forced RLS, fail-closed organization policies, tenant and state indexes, explicit foreign keys, immutable release references, and constraints preventing an installation from referencing a non-registered release. Platform-global records must be accessed through an explicit platform scope and must not contain tenant business data.

Installation deletion is a lifecycle transition, not an immediate hard delete. The active installation is disabled first, in-flight work follows G-004 cancellation or completion policy, references required for audit and replay are retained, and configuration or artifact retention follows the later storage and deployment decisions. Organization deletion and export behavior require the organization lifecycle decision before implementation.

## 12. Secrets and credentials model

The model has five separate concepts:

- **Credential metadata:** provider, organization binding, capability class, status, rotation timestamp, and opaque reference. It is visible only to authorized administrators and host services.
- **Secret material:** tokens, keys, certificates, and private values. It is owned by the future G-007 credential boundary and is never stored in plugin configuration or exposed through a general plugin API.
- **Capability grant:** permission for one plugin release and organization installation to request a named operation using a credential class. It includes scope, approver, policy version, expiry, and revocation state.
- **Runtime access:** a host-mediated, time-bounded operation that returns the minimum structured result needed by the action. It does not return the underlying secret.
- **Auditability:** credential metadata access, capability grants, runtime use, denial, revocation, and rotation are auditable without recording secret material.

Rotation changes the credential version or reference and invalidates old capability tokens. Revocation blocks new host operations and causes queued work to fail closed or enter operator repair. A plugin cannot retain authority after its installation, release, or credential grant is disabled.

## 13. AI compatibility

G-005 does not implement the AI runtime. It defines contracts that a future G-006 agent can consume.

An AI agent should discover only plugin capabilities that are available in its current organization and authorization context. Discovery returns plugin identity, release, action type and version, input schema, required permissions, approval requirement, side-effect classification, and compatibility status. It does not reveal secrets, private package internals, or capabilities unavailable to the agent’s principal.

Before invocation, the agent determines whether the action is allowed, requires approval, or is denied. If approval is required, the agent submits a structured G-004 approval request containing the exact plugin release digest, action version, input, targets, preconditions, and policy context. Approval does not bypass final authorization revalidation.

Invocation returns a versioned structured result or a typed failure. Duplicate requests use the G-004 idempotency identity. The agent remains subject to organization scope, principal identity, authorization epoch, installation state, capability grants, and audit rules. No AI-specific authority is implied by plugin registration.

## 14. Independent developer workflow

A plugin developer must be able to work from a GitHub clone with standard Node.js or another supported WASM toolchain. The workflow should be:

1. Select a published `plugin-contracts` version and a supported ABI version.
2. Create a plugin manifest declaring identity, release, compatibility, capabilities, schemas, limits, and lifecycle behavior.
3. Implement only the versioned host ABI. The plugin must not import Business OS private packages or access host resources directly.
4. Run repository-owned manifest, schema, capability, artifact, and compatibility validation locally.
5. Run unit and contract tests against mock host capabilities and adversarial denial cases.
6. Build a deterministic artifact and record its digest.
7. Run a local WASM-compatible harness with explicit resource limits and no inherited environment, filesystem, network, or credentials.
8. Submit the manifest, artifact digest, test evidence, and compatibility declaration for review.
9. Install only through a controlled registry or repository-owned administrative operation after review.

CI should reject undeclared capabilities, private package imports, mutable artifact references, incompatible ABI versions, missing resource limits, secret-like manifest fields, and tests that depend on Manus services. A future SDK may improve ergonomics, but the contracts and validation rules must remain usable without the SDK.

## 15. Threat model

| Threat | Risk | Intended architectural control |
|---|---|---|
| Malicious plugin | Attempts unauthorized data access or side effects | WASM boundary, capability mediation, deny-by-default authorization, RLS, G-004 fencing, audit |
| Compromised plugin release | Publisher artifact is altered or supply chain is breached | Immutable digest, provenance, review state, signed release metadata, reproducible validation, staged enablement |
| Buggy plugin | Crashes, loops, emits malformed output, or consumes excessive resources | WASM resource limits, timeouts, output schemas, host validation, retry/dead-letter policy |
| Malicious organization administrator | Grants excessive capabilities or installs a harmful release | Permission visibility, approval policy, platform review for sensitive capabilities, audit, separation of duties where required |
| Cross-organization data access | Plugin reuses a context or target from another tenant | Installation-bound organization context, authorization revalidation, RLS, negative tests, no cross-tenant capability |
| Credential exfiltration | Plugin attempts to read or log secret material | No secret material in ABI/config/env, host-mediated credential operation, redacted audit and logs |
| Privilege escalation | Plugin requests a broader capability at runtime | Manifest-to-grant equality checks, host allowlist, action-specific authorization, no self-granting |
| Replay | Old invocation or approval is reused | G-004 idempotency, approval binding hash, release digest, authorization epoch, expiry, execution identity |
| Duplicate invocation | At-least-once delivery runs work twice | G-004 idempotency and action-specific deduplication; exactly-once is not claimed |
| Plugin impersonation | A plugin claims to be another plugin or principal | Registry identity, immutable artifact digest, host-issued plugin identity, explicit delegated principal context |
| Supply-chain risk | Dependency or build process introduces malicious code | Dependency lockfile, artifact digest, provenance, review, deny private host imports, reproducible CI |
| Malicious upgrade | Upgrade changes behavior or requested authority silently | Immutable releases, explicit permission diff, compatibility checks, staged rollout, rollback, new approval binding |
| Dependency compromise | Runtime engine or host adapter escape is exploited | Replaceable runtime adapter, pinned and reviewed runtime, resource limits, deployment isolation, security advisories, disablement path |
| Plugin-to-plugin abuse | One plugin uses another as an authority broker | No direct calls or shared memory; published events/actions require independent authorization |
| Operator or host compromise | Trusted host is modified to bypass mediation | Repository authority, code review, CI, deployment controls, least-privilege runtime role, later G-009 operational controls |

## 16. Verification strategy

G-005 implementation must be preceded by contract and security tests. Happy-path invocation tests are insufficient.

### Unit tests

Unit tests must cover manifest parsing, namespace rules, semantic-version compatibility, capability normalization, permission-diff calculation, lifecycle transitions, configuration schema versions, invocation-context reduction, output validation, timeout classification, cancellation classification, and release-digest binding.

### Contract tests

Contract tests must prove that plugin contracts do not expose NestJS, PostgreSQL, Kysely, `pg`, filesystem, network, process, environment, or Manus types. They must verify that a plugin can use only the declared ABI and that every host capability has a versioned input and output schema.

### Architecture tests

Architecture checks must reject plugin packages that import private platform packages, delivery frameworks, database drivers, runtime internals, or provider SDKs. They must reject reverse dependencies from platform core or required application packages into optional plugin packages. They must require explicit workspace dependencies and package export maps.

### Security and isolation tests

The runtime test harness must attempt to access undeclared capabilities, environment variables, filesystem paths, network sockets, subprocesses, host memory, raw database connections, internal package imports, and other plugin handles. Each attempt must fail closed.

Tests must verify resource exhaustion behavior for memory, CPU/time, output size, recursion, host-call count, and concurrent invocations. They must verify that malformed results, panics, traps, timeouts, cancellation, and runtime crashes cannot corrupt host state.

### Organization and authorization tests

Tests must verify that Organization A cannot invoke, inspect, configure, subscribe to, or infer Organization B’s plugin installation, credentials, events, actions, execution records, or results. Tests must cover organization switching, stale authorization epochs, revoked memberships, disabled installations, revoked capability grants, expired approvals, and platform-scope attempts to access tenant data.

### Lifecycle and upgrade tests

Tests must cover install, configure, enable, disable, remove, incompatible upgrade, compatible upgrade, downgrade, rollback, release revocation, configuration migration failure, and in-flight invocation behavior. A changed release digest or action version must invalidate the prior approval binding.

### G-004 integration tests

Real PostgreSQL tests must verify that plugin-related organization records use RLS, that installation and permission writes are organization-scoped, and that plugin invocation uses the existing G-004 job, queue, lease, fencing, retry, idempotency, approval, execution, and audit records. Tests must verify duplicate delivery, lease expiry, stale-worker writes, ambiguous results, cancellation, and atomic business-state/audit/outbox behavior.

### CI requirements

CI must run manifest validation, contract tests, architecture checks, security tests, real PostgreSQL integration tests, artifact digest checks, and build validation on a standard GitHub Actions runner. CI must not require Manus. Any runtime engine or sandbox dependency must be pinned, reviewed, and tested as a replaceable infrastructure adapter. A deployment environment that cannot enforce the selected sandbox guarantees must fail validation rather than silently enabling executable plugins.

## 17. Migration and rollout considerations

No G-005 migration is authorized by this proposal. If approved, implementation should begin with framework-free contracts and validation tests, followed by a non-executable registry model, followed by a test-only runtime adapter, and only then by a controlled executable runtime implementation.

The first rollout should support discovery and manifest review before enablement. It should support one narrowly scoped organization action and one bounded event subscription as a vertical slice. It should not begin with networking, credential use, UI code execution, arbitrary object mutation, or platform-global plugins.

Plugin installations should be disabled by default in new environments. Existing organizations should have no plugin state until an explicit installation is created. Release revocation must stop new invocations while preserving audit and execution evidence. Rollback must select an immutable prior release rather than mutating a release in place.

The runtime adapter must be independently replaceable. A future container or remote-service deployment may host the same plugin contract, but changing physical deployment must not change the authorization, organization, invocation, or audit semantics.

## 18. Open questions

The following questions require resolution before executable plugin implementation, even if this proposal is approved:

1. Which WASM runtime and component-model ABI will be accepted, and what documented sandbox guarantees will be required?
2. Which languages and build targets are in the first supported plugin profile?
3. What artifact provenance and signing policy will be required before registry publication?
4. Which capabilities require platform review rather than organization-administrator approval?
5. Which event payloads and action schemas are safe to publish as stable extension points?
6. What is the exact retention and deletion policy for plugin artifacts, configurations, installation history, execution records, and audit records?
7. How will G-007 credential capabilities be represented without exposing provider-specific semantics in plugin contracts?
8. Which declarative UI contribution surfaces, if any, will be supported without creating a browser-side trust boundary?
9. What operational telemetry can be recorded without exposing tenant payloads or secrets?
10. What G-009 deployment checks are mandatory before an environment may enable executable plugins?

These questions do not authorize implementation by default. They are acceptance inputs for the implementation plan and, where necessary, later gate decisions.

## 19. Explicit approval criteria

The maintainer should approve G-005 only if all of the following statements are accepted:

1. A plugin is an optional, versioned, manifest-governed extension and not an unrestricted code injection mechanism.
2. Plugin metadata, executable code, permissions, organization installation state, and runtime execution state remain distinct.
3. Permissions are requested capabilities, not grants, and all execution is deny-by-default and host-mediated.
4. The baseline executable model is an out-of-process, WASM-compatible capability sandbox. In-process trusted code is not accepted as the untrusted-plugin model.
5. The host must not expose raw PostgreSQL, Kysely, filesystem, network, process, environment, internal package, or execution-infrastructure access to plugin code.
6. The architecture explicitly acknowledges that logical isolation is not OS isolation and refuses to enable executable plugins where the selected sandbox guarantees are unavailable.
7. Organization installations, configuration, grants, events, and execution paths are organization-scoped and RLS-protected where tenant-owned.
8. Platform scope is explicit and cannot be used to enumerate or access tenant data.
9. Secrets remain outside the plugin contract and require a later, explicit G-007 credential capability.
10. Plugin invocation consumes G-004 jobs, leases, fencing, retries, idempotency, approvals, execution records, authorization-epoch checks, cancellation, and audit rather than duplicating them.
11. Plugin releases are immutable and bound by digest; upgrades, downgrades, rollback, and changed permissions require explicit lifecycle and compatibility checks.
12. No plugin package, migration, runtime adapter, SDK, artifact store, WASM engine, marketplace, or product feature is implemented until this decision is approved and a separate implementation plan is authorized.
13. The implementation must pass the adversarial verification strategy in this document before executable plugins are enabled.
14. The design remains runnable and maintainable from GitHub with standard tooling and introduces no Manus runtime dependency.

**Decision requested:** Approve, amend, or reject this G-005 proposal. Until approval is recorded, G-005 remains **PROPOSED / AWAITING APPROVAL**.

## References

[1]: ARCHITECTURE.md "Business OS Architecture"
[2]: MULTI-TENANCY.md "Business OS Multi-Tenancy"
[3]: G-004-DECISION-CLOSURE.md "Business OS G-004 Events, Reliable Execution, and Durable Approval Decision Closure"
[4]: REPOSITORY-STRUCTURE.md "Business OS Repository Structure"
[5]: PLUGINS.md "Business OS Plugins"
[6]: DECISIONS.md "Business OS Architecture Decisions"
[7]: ../AGENTS.md "Business OS Contributor Guidance"

<!-- Author: Manus AI -->
<!-- Status: Proposed / awaiting maintainer approval. No G-005 implementation is authorized. -->
