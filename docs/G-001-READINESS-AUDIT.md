# G-001 Implementation Readiness Audit and Plan

## Executive summary

Business OS is **not yet ready to begin product implementation**. It is ready for a controlled **decision-closure and repository-foundation phase** only.

The repository is internally consistent at the architecture level. The conceptual modular-monolith boundaries, organization tenancy requirements, authorization posture, provider adapters, AI governance, automation controls, extension model, and portability rules agree with one another. The actual repository contains only documentation and configuration templates; it contains no runtime, application source, database schema, migrations, tests, CI pipeline, or deployment artifact.

The immediate hard blocker is that **G-001 remains PENDING maintainer approval**. The current proposal recommends Node.js LTS, strict TypeScript, NestJS, pnpm workspaces, TypeScript project references, and Vitest, subject to the hardening requirements in [`G-001-STACK-PROPOSAL.md`](G-001-STACK-PROPOSAL.md). The proposal is not an accepted decision.

After G-001 approval, a small repository runtime foundation can be implemented without deciding the later product gates. However, persistent tenant-owned data requires G-003 first, authentication and authorization implementation requires G-002 first, and events, queues, schedules, jobs, webhooks, automation, or agent execution require G-004 first. These gates are not optional details that can safely be inferred from framework defaults.

The recommended next action is therefore: **obtain explicit maintainer approval for the hardened G-001 proposal, record the accepted decision, and then implement only the repository runtime foundation with architecture checks.** Do not begin application functionality, persistence, authentication, durable asynchronous execution, or provider integrations before their governing gates are resolved.

## Current repository facts

The audit inspected the architecture documents named in the task and the actual Git tree. The `main` branch is clean and contains only the following kinds of files:

- Contributor and repository guidance, including `AGENTS.md` and `README.md`.
- Stack-neutral architecture and governance documents under `docs/`.
- A safe `.env.example` and `.gitignore`.
- The pending G-001 proposal and implementation status.

There are no application directories, package manifest, workspace definition, source files, test files, migration files, CI workflows, container files, provider adapters, or runtime dependencies. The repository tree therefore matches the documented **pre-implementation foundation** status. No documentation claims that a runtime feature is already available.

## Audit findings

### Architecture consistency

The core architecture is consistent. `ARCHITECTURE.md` defines a modular monolith with experience surfaces, platform core, business applications, horizontal execution, extension boundaries, and infrastructure adapters. `REPOSITORY-STRUCTURE.md` maps those concepts to conceptual ownership areas without requiring empty directories. `AGENTS.md` and `DEVELOPMENT.md` preserve GitHub as the source of truth and prohibit Manus from becoming a runtime dependency.

The dependency direction is also consistent: applications consume platform public contracts; execution invokes application and platform actions; extensions use published contracts; infrastructure implements ports owned by consuming modules; and the platform cannot depend on optional applications or plugins.

The main unresolved architecture risks are implementation-level rather than contradictions in the documents:

1. **A broad platform or shared package could become a dependency hub.** The G-001 proposal addresses this through small public contracts, package export maps, forbidden-edge checks, and ownership documentation.
2. **NestJS modules could be mistaken for architectural boundaries.** The proposal explicitly rejects that assumption. Package exports and CI graph checks must be the enforceable boundary.
3. **The conceptual structure does not yet define physical package granularity.** The proposal provides a model, but the first implementation must create packages only where meaningful ownership and public contracts exist.
4. **Public contract versioning is not yet a runtime convention.** This can be defined during the foundation and first vertical slice without deciding the database or identity gates.
5. **Some platform responsibilities remain broad.** Tasks, files, comments, notifications, events, search, and audit are shared capabilities, but each must receive a focused owner and public contract before implementation. They should not be created as one generalized platform service.

No contradiction currently requires rejecting the modular-monolith direction.

### Multi-tenancy

The tenancy model is coherent and appropriately strict. Organization is the primary tenant boundary. A human identity may belong to multiple organizations, but membership establishes the active organization context. Every request, API call, webhook, scheduled execution, background job, integration callback, and AI action must establish explicit organization and principal context before accessing tenant-owned resources.

The documents correctly require layered isolation across application queries, persistence, jobs, events, files, search, caches, analytics, exports, audit records, integrations, and AI tools. Organization A/B negative tests are a stated requirement.

The main cross-tenant failure paths are known:

- Trusting a client-selected organization without verifying membership and authorization.
- Reusing a session, cache entry, connection, or service object across organizations.
- Omitting organization scope from a query, relationship, index, event, job, file key, search document, cache key, or audit record.
- Accepting a webhook or integration callback before resolving and validating its owning organization.
- Executing a queued action using stale authorization or an organization identifier without reauthorization.
- Allowing AI retrieval or tools to receive broader context than the active organization and permission scope.
- Logging sensitive tenant data in a way that exposes it through shared operational systems.

The architecture identifies all of these risks, but no implementation currently enforces them. The database-level and application-level defense-in-depth mechanism remains a G-003 decision. Tenant-owned persistence must not begin before G-003.

### Authorization

The documents correctly separate authentication, authorization, and auditing. They define deny-by-default authorization, organization-scoped principals, roles, permissions, grants, registered actions, and audit outcomes. They also state that interactive users, workers, integrations, automations, plugins, and AI agents must use the same authorization contracts.

The following details remain deliberately undefined and are hard blockers for authorization implementation:

- Identity and session semantics.
- Membership lifecycle and organization switching.
- Role names and built-in administrative roles.
- Permission naming and resource/action vocabulary.
- Resource-level and attribute-based policy expression.
- Delegation, impersonation, break-glass access, and separation of duties.
- Service-principal and integration-credential semantics.
- AI-agent and automation-principal semantics.
- Revocation behavior across sessions, tokens, jobs, integrations, and agent delegations.

These are G-002 decisions. A foundation may define type-neutral ports and test seams, but it must not implement authentication or authorization semantics before G-002.

### AI architecture

The AI architecture is consistent with the product requirements. Agents are governed principals rather than privileged users. They must have an owner, purpose, lifecycle, tool allowlist, permission scope, budget, model policy, and audit policy. Tool invocation is a registered action boundary that validates input, checks authorization, executes work, and records the outcome.

The model-provider boundary is replaceable. Prompts, retrieval, tool inputs, outputs, and traces are treated as potentially sensitive tenant data. The documents prohibit treating model output as authority and require human approval for sensitive side effects.

AI execution is not ready to implement because G-002, G-004, and G-006 remain open. In particular, agent principals depend on G-002, durable execution and retries depend on G-004, and model-provider/data-retention/budget policy depends on G-006. The first foundation may define provider-neutral interfaces and test fixtures, but it must not create a production agent runner or connect a model provider.

### Automation

The automation architecture identifies the correct lifecycle: a producer publishes an organization-scoped event after committed state change; the automation platform selects eligible rules; conditions use authorized scoped queries; registered actions reauthorize before execution; and completion records outcomes, retries, failures, and audit data.

The unresolved decisions are material rather than cosmetic:

- Event wire format and versioning.
- Reliable publication and transactional outbox behavior.
- Queue and scheduler selection.
- Stable event identifiers.
- Ordering, retries, timeouts, dead letters, replay, and reconciliation.
- Idempotency semantics.
- Rule language and condition evaluation.
- Principal and delegated authorization semantics.
- Loop detection, quotas, rate limits, approval gates, and suspension.

These are G-004 decisions. No queue, scheduler, worker, outbox, retry system, or event transport should be introduced during G-001 foundation work.

### Plugins and integrations

The extension boundaries are coherent. Plugins are optional and cannot modify core source, import private internals, write another module's data, bypass authorization, or create hidden tenant state. The future plugin manifest must declare identity, versions, requested permissions, extension points, configuration, events, external requirements, data ownership, and lifecycle. Runtime isolation remains deliberately unresolved, as it should be before executable plugins exist.

The Integration Hub correctly owns provider-neutral contracts, credentials, callback verification, provider mapping, error classification, rate limits, provider-specific retries, observability, and reconciliation. Applications must not own external communication providers as internal subsystems. Integrations and callbacks are organization-scoped by default.

Plugin execution is blocked by G-005. External provider connections are blocked by G-007. Storage provider work is blocked by G-008. No integration or plugin should be implemented during the runtime foundation.

### Data architecture

Data ownership rules are clear: platform capabilities own platform data, applications own domain data, and extensions may persist only what their contracts permit. Organization-owned records require verifiable organization scope. Schema changes must be version-controlled migrations with expand-and-contract practices where necessary.

The following data decisions remain unresolved and block persistence:

- Database engine and client.
- ORM or query approach.
- Migration framework.
- Identifier strategy.
- Time and timestamp conventions.
- Transaction boundaries.
- Tenancy enforcement and database-level isolation.
- Indexing and relationship conventions.
- Backup, restoration, and recovery objectives.
- Reliable event publication in relation to committed data.

The proposal must not introduce a generic ORM abstraction, database client, migration tool, or schema model during G-001. These belong to G-003.

### Security

The security baseline is consistent and appropriately defense-in-depth. It covers tenant isolation, standards-based authentication, deny-by-default authorization, secret handling, encryption, auditability, provider credentials, webhook authenticity, dependency supply chain, backups, restoration, incident response, and abuse controls.

The architecture is not security-certified and does not yet supply executable controls. The first implementation must convert the baseline into tests and operational checks. Security-critical behavior cannot be proven through TypeScript compilation or mocked unit tests alone.

### Portability and Manus independence

The repository is strongly aligned with Manus independence. The documents prohibit Manus APIs, runtime services, databases, storage, authentication, queues, deployment mechanisms, environment variables, hidden builder settings, and conversation state as required runtime dependencies. They require source-controlled code, migrations, configuration templates, tests, and deployment definitions.

No current repository file introduces a Manus runtime dependency. The remaining risk is future drift: a hosted preview or convenience integration could accidentally become the only way to run development, tests, jobs, or deployment. The implementation plan therefore requires standard local commands, portable dependency definitions, disposable test infrastructure, environment-variable templates, and CI that runs without Manus.

### Development workflow

The repository gives future engineers and AI agents a strong architectural reading order and clear ownership rules. It does not yet provide executable development commands because G-001 is pending and there is no runtime. That is accurate rather than a defect.

After G-001 approval, `DEVELOPMENT.md` must be updated in the same change as the project foundation. It must document prerequisites, version pinning, dependency installation, environment validation, local processes, tests, formatting, linting, type checking, builds, debugging, CI, and deployment. Every package must also document its owner, contracts, dependencies, tenant strategy, permissions, events, migrations, adapters, audit behavior, and tests.

## Implementation-readiness matrix

| Area | Status | Evidence | Blocking issue | Required decision |
|---|---|---|---|---|
| Repository authority and portability | READY WITH CONDITION | `AGENTS.md`, `README.md`, `DEPLOYMENT.md`, `REPOSITORY-STRUCTURE.md` | Portability is documented but not yet proven by a runnable system | Preserve GitHub authority and require standard non-Manus commands after G-001 |
| Conceptual modular-monolith architecture | READY | `ARCHITECTURE.md`, `REPOSITORY-STRUCTURE.md`, `DECISIONS.md` ADR-001/011 | Physical package layout and graph checks do not yet exist | Adopt the G-001 package model and enforce it during foundation work |
| G-001 runtime/tooling choice | BLOCKED | `G-001-STACK-PROPOSAL.md`, `DECISIONS.md` | Proposal remains pending maintainer approval | Explicitly approve or reject the hardened proposal |
| Framework isolation and package boundaries | READY WITH CONDITION | Hardened G-001 proposal | No implementation or CI checks exist | Build package exports, dependency graph checks, forbidden-edge rules, and architecture tests before feature work |
| Shared boundary | READY WITH CONDITION | `REPOSITORY-STRUCTURE.md`, hardened G-001 proposal | Shared package has not yet been physically constrained | Create only narrow shared contracts and mechanically reject forbidden dependencies |
| Organization tenancy model | READY WITH CONDITION | `MULTI-TENANCY.md`, `DATABASE.md`, `SECURITY.md` | Runtime and persistence enforcement are absent; G-003 is open | Resolve G-003 and implement Organization A/B negative tests |
| Identity and authentication | BLOCKED | `PERMISSIONS.md`, `SECURITY.md`, `DECISIONS.md` G-002 | Identity, sessions, membership, and principal semantics are unresolved | Resolve G-002 before authentication or authorization implementation |
| Authorization | BLOCKED | `PERMISSIONS.md`, `AI-AGENTS.md`, `AUTOMATION.md` | Roles, permissions, delegation, revocation, and principal semantics are unresolved | Resolve G-002 and define the trusted action boundary |
| Database and migrations | BLOCKED | `DATABASE.md`, `DECISIONS.md` G-003 | No engine, ORM/client, migration, ID, transaction, or tenancy strategy | Resolve G-003 before persistent application records |
| Events and reliable publication | BLOCKED | `DATABASE.md`, `AUTOMATION.md`, `DECISIONS.md` G-004 | Outbox, event format, transport, retries, and idempotency are unresolved | Resolve G-004 before events that drive work or integrations |
| API and delivery boundary | READY WITH CONDITION | `ARCHITECTURE.md`, `DEPLOYMENT.md`, G-001 proposal | No runtime or API contract convention exists | Define API delivery adapters after G-001, without placing HTTP in domain/application packages |
| Web/API and worker roles | READY WITH CONDITION | `DEPLOYMENT.md`, `AUTOMATION.md` | Worker semantics depend on G-004 | Create process entry points only after the relevant execution decisions |
| AI execution | BLOCKED | `AI-AGENTS.md`, `PERMISSIONS.md`, `DECISIONS.md` G-002/G-004/G-006 | Principal, durable execution, provider, data, and approval policies are unresolved | Resolve the required gates before production agent work |
| Automation | BLOCKED | `AUTOMATION.md`, `DATABASE.md`, `DECISIONS.md` G-004 | Reliable event and action execution semantics are unresolved | Resolve G-004 before automation implementation |
| Integrations and webhooks | BLOCKED | `INTEGRATIONS.md`, `SECURITY.md`, `DECISIONS.md` G-007 | Credential, provider, callback, and deduplication policies are unresolved | Resolve G-007 before external connections |
| Plugins | BLOCKED | `PLUGINS.md`, `DECISIONS.md` G-005 | Manifest, isolation, lifecycle, and resource/network controls are unresolved | Resolve G-005 before executable plugins |
| Storage and files | BLOCKED | `DATABASE.md`, `DEPLOYMENT.md`, `DECISIONS.md` G-008 | Storage, access, retention, export, deletion, and recovery are unresolved | Resolve G-008 before file handling |
| Observability and deployment | READY WITH CONDITION | `SECURITY.md`, `DEPLOYMENT.md`, `DECISIONS.md` G-009 | Production topology, CI/CD, IaC, and recovery objectives are open | Define a portable development baseline after G-001; resolve G-009 before production |
| Product applications | NOT YET DEFINED for implementation | `APPS.md`, `README.md` | No application domain, contracts, or lifecycle implementation exists | Select the first bounded application after platform prerequisites |
| Test strategy | READY WITH CONDITION | G-001 proposal, `SECURITY.md`, `MULTI-TENANCY.md` | No test runner, fixtures, disposable services, or CI exists | Establish test projects and security invariants in Phase 1 |

## Hard blockers

The following must be resolved before product implementation begins:

1. **Maintainer approval of G-001.** The runtime and implementation tooling remain a proposal.
2. **G-002 before authentication or authorization implementation.** The skeleton may not invent identity, membership, roles, permissions, delegation, or principal semantics.
3. **G-003 before persistent tenant-owned data.** The project may not choose an ORM, database, migration tool, ID strategy, transaction model, or tenancy mechanism implicitly.
4. **G-004 before durable asynchronous work.** No queue, scheduler, worker job system, event transport, outbox, retry, or idempotency implementation may be introduced early.
5. **Architecture enforcement before broad feature work.** Package exports, forbidden-edge checks, framework/provider import restrictions, cycle checks, and architecture tests must exist before multiple domain packages depend on one another.

These blockers do not prevent documentation, decision records, or a narrowly scoped repository foundation after G-001 approval.

## Conditional items

The following can be completed during the first implementation phase without creating architectural risk, provided they remain free of unresolved gate decisions:

- Pin the Node.js and pnpm toolchain and create the root package/workspace configuration after G-001 approval.
- Create the smallest API and worker composition roots without implementing business behavior or durable job execution.
- Add portable configuration loading and validation for non-secret environment variables.
- Add structured logging, error envelopes, health checks, and process shutdown behavior without selecting a provider.
- Add unit, contract, architecture, and bootstrap tests.
- Add package manifests, export maps, dependency graph checks, and documentation templates.
- Add a provider-neutral port convention with no database, queue, storage, identity, or model implementation.
- Update `DEVELOPMENT.md` with commands that can run without Manus.

Conditional work must stop when it reaches G-002, G-003, or G-004 semantics.

## Post-MVP decisions

The following need not be solved before the first foundation and core vertical slice, but they must be resolved before their capabilities are exposed:

- Plugin marketplace distribution and advanced lifecycle governance.
- Multiple frontends and portals.
- Advanced search and analytics architecture.
- Cross-organization sharing.
- Application marketplace and entitlement expansion.
- Advanced AI retrieval, model routing, and cost optimization.
- Multi-region deployment and independent service extraction.
- Detailed disaster-recovery targets beyond the minimum required for the first persistent environment.

“Post-MVP” does not mean optional for production. It means these choices should not block the first validated architecture slice.

## Phased implementation plan

### Phase 0 — Architecture and decision closure

**Goal:** remove the blockers that the first code change would otherwise decide implicitly.

1. Obtain explicit maintainer approval for the hardened G-001 proposal and record the accepted status in `docs/DECISIONS.md` without rewriting accepted history.
2. Confirm the physical package model, root commands, framework-isolation invariants, export-map rules, and CI architecture checks.
3. Resolve G-002 before authentication or authorization source code. Record principal, session, membership, role, permission, delegation, revocation, and audit semantics.
4. Resolve G-003 before persistence. Record database, migration, IDs, timestamps, transactions, indexes, tenancy enforcement, backup objectives, and the relationship between persistence and reliable publication.
5. Resolve G-004 before durable execution. Record event envelopes, publication guarantees, queue/scheduler roles, retries, dead letters, idempotency, ordering, replay, and recovery.
6. Keep G-005 through G-010 deferred unless the first slice needs one of them. Do not select providers merely to make the foundation appear complete.

**Exit criteria:** approved decisions exist in the repository; each decision names its consequences and explicitly preserves portability; unresolved gates are not represented by implementation defaults.

### Phase 1 — Repository runtime foundation

**Goal:** create a runnable, portable development foundation without product functionality.

Create only meaningful packages and files. The first package set should include framework-free contract/domain foundations, one delivery composition root, one worker composition root only if its process role is needed for tests, configuration definitions, and repository tooling. Do not create every conceptual directory.

The foundation should provide:

- Pinned Node.js and pnpm versions.
- A committed workspace lockfile.
- Strict TypeScript configuration and project-reference solution.
- Package export maps and explicit workspace dependencies.
- Dependency graph, forbidden-edge, cycle, manifest, framework-import, and provider-import checks.
- Replaceable runtime schema and validation ports, without selecting business providers.
- Portable configuration loading with safe environment-variable validation.
- Structured logging and error conventions that do not leak tenant data.
- Process bootstrap and graceful shutdown conventions.
- Unit, contract, architecture, and bootstrap test projects.
- Root commands documented identically for local use and CI.
- A completed `DEVELOPMENT.md` for clone-to-validation workflows without Manus.

Do not add database code, migrations, authentication, authorization implementation, queue code, event transport, storage, provider SDKs, or UI during this phase.

**Exit criteria:** a clean clone can install and run the foundation checks without Manus; CI validates the same checks; a deliberate forbidden import fails; a package can be consumed only through its public export; and no unresolved G-002/G-003/G-004 choice is hidden in the foundation.

### Phase 2 — Platform core

**Goal:** implement the minimum shared platform capabilities required by the first business slice.

After G-002 and G-003 are approved, implement organization context, identity linkage, membership, teams, permissions, audit, and the minimum persistence boundary. Add tasks, comments, notifications, files, search, and events only when the first slice requires them and their ownership is explicit. Do not build all shared services as a single platform package.

Each platform capability must own its contracts, data boundary, permissions, migrations, organization-scope strategy, audit behavior, and tests. Applications consume the public contracts. Platform code must not depend on applications or optional plugins.

**Exit criteria:** Organization A/B negative tests pass for all implemented capabilities; authorization denial is explicit and auditable; persistent data is migrated through repository-owned migrations; and the platform cannot read application-private data through an undocumented shortcut.

### Phase 3 — First business application

**Recommended first application: Sales & CRM.** This is an engineering recommendation, not an accepted product decision. Sales & CRM is a suitable first bounded application because it exercises organization context, membership and permissions, domain-owned records, shared tasks and audit, published actions and events, and the provider-neutral communication boundary without requiring the initial slice to decide payments, financial controls, or workforce policy.

The first application should be intentionally small. It should prove that an application owns its private records and rules, consumes platform contracts, exposes public commands and queries, emits documented events, and cannot mutate another application's private data. It should not implement WhatsApp or another communication provider inside the application.

**Exit criteria:** one bounded CRM capability passes unit, contract, integration, e2e, tenant-negative, authorization-negative, audit, and migration tests; the application can be removed or disabled without corrupting platform ownership; and the public contract is documented independently of the UI.

### Phase 4 — Execution layer

**Goal:** add API delivery, webhooks, jobs, automation, and governed AI only after their gates are closed.

Build the API as a delivery adapter over public application and platform contracts. Build webhooks through verified integration boundaries. Build jobs and automation around the G-004 event and action contracts. Add AI tools only after G-002 and G-006 define agent principals, data policy, provider adapters, budgets, approvals, and audit requirements.

Every execution path must re-establish organization context, identify its principal, validate external input, authorize the registered action, apply idempotency and retry policy where applicable, and record an audit outcome.

### Phase 5 — Extensions

**Goal:** add optional capabilities without weakening the core.

Resolve G-005, G-007, and G-008 before implementing executable plugins, external integrations, or file storage. Define manifests, compatibility, permissions, secrets, lifecycle, isolation, network access, resource limits, failure behavior, and auditability. Implement one replaceable adapter or extension as a proof of the boundary, not as a reason to couple the domain to a provider.

### Phase 6 — Additional business applications

Add Commerce, Marketing & Growth, Operations, Finance, People, Work, Service, Home, and other applications one bounded slice at a time. Each application must use existing platform capabilities and must not create duplicate identity, tasks, files, notifications, events, search, or audit systems.

Sequence later applications by dependency and risk. Finance and Commerce may require stronger financial or transactional policies. People may require sensitive-data controls. Marketing and communication-heavy work may depend on integrations. The repository should not treat product-map completeness as a reason to implement unvalidated breadth.

## First vertical slice

### Slice: Organization-scoped CRM contact and follow-up task

This is a proposed architecture-validation slice after G-001, G-002, G-003, and the minimum relevant G-004 decisions are approved. It is not implementation authorization.

**Capability.** A member of an organization can create, view, update, and archive a CRM contact and create a follow-up task associated with that contact. The slice should be small enough to test ownership and broad enough to exercise platform collaboration.

**Modules involved.** Platform organization context; identity and membership; permissions; audit; tasks; events if reliable publication is approved; the Sales & CRM application; API delivery; and the selected database/migration adapter. Files, search, integrations, AI, and plugins are not required for this first slice.

**Public contracts.** Sales & CRM publishes commands and queries for contact creation, retrieval, update, and archival. It publishes the contact object contract, permission requirements, and domain events. The Tasks platform publishes a task-creation command that accepts a typed relation to the CRM contact without allowing CRM to write the task store directly. The authorization platform publishes a decision contract. The audit platform publishes an auditable-action contract. All boundary inputs and outputs have runtime schemas.

**Data ownership.** Sales & CRM owns contact records and contact-specific rules. Platform owns organization, membership, permission, task, event, and audit records. No module writes another module's tables or private repository.

**Organization context.** Every command, query, task relation, event, and audit record carries verified organization context and principal identity. A user who belongs to two organizations receives a fresh context for each selected organization.

**Authorization.** Contact reads and mutations require organization-scoped permissions. Task creation requires the task capability and the permission to relate a task to the contact. Authorization is evaluated at the trusted action boundary, not only in the API controller. Denial and success outcomes are auditable.

**Events.** If G-004 has approved reliable publication, contact-created, contact-updated, contact-archived, and follow-up-task-created events use the approved versioned envelope. If G-004 is not approved, the slice must not introduce an event transport; it can use in-process test contracts only for the foundation.

**Audit events.** Record the principal, organization, action, target resource, authorization result, outcome, and relevant correlation or external reference without leaking sensitive data into logs.

**API/UI boundary.** The API adapter validates input and maps it to application commands. It does not contain CRM rules. A UI is not required to prove the architecture; if added later, it consumes the same public contracts and cannot bypass them.

**Tests.** Cover contact domain rules; command/query contracts; package export and forbidden-import rules; API validation; authorization success and denial; Organization A/B read and mutation isolation; task relation authorization; audit records; migration forward/recovery behavior; duplicate request behavior if applicable; and end-to-end behavior against real selected infrastructure.

**External providers.** None. This is intentional. The slice demonstrates provider neutrality before adding an integration.

**Infrastructure requirements.** Only the approved database and migration infrastructure from G-003, the approved runtime, and the approved test environment are required. Queue, object storage, model provider, and external integration services are excluded unless a later approved gate requires them.

## Testing strategy

Testing must be organized by the risk each layer can detect.

### Unit tests

Use framework-free unit tests for domain invariants, value objects, permission-policy functions, command validation, event construction, organization-context rules, and idempotency calculations. Unit tests must not use a database, provider SDK, Nest testing container, or network service when those dependencies are not part of the behavior under test.

### Contract tests

Contract tests verify public package exports, runtime schemas, commands, queries, events, action registrations, permission requirements, error categories, and adapter ports. They must reject private imports and verify that an implementation can be replaced without changing its consumer-facing contract.

### Architecture tests

Architecture tests inspect package manifests and import graphs. They must fail when protected packages import NestJS, HTTP frameworks, ORM/database clients, provider SDKs, private files, deep paths, undeclared workspace dependencies, or prohibited cycles. They must also verify that shared packages do not depend on applications or implementations.

### Integration tests

Integration tests use the actual selected database, migration mechanism, and other approved infrastructure. They verify transaction boundaries, organization predicates, constraints, migrations, audit persistence, provider-adapter mapping, webhook signature handling, and outbox or reliable-publication behavior after G-004.

### End-to-end tests

End-to-end tests assemble the API, application, platform, and approved infrastructure. They prove that delivery paths reach the same authorized actions as other execution paths and that error responses do not disclose tenant data.

### Required security and isolation tests

The following invariants must never regress:

1. A principal authorized in Organization A cannot read, mutate, search, download, trigger, or infer Organization B data.
2. Organization context cannot be supplied solely by mutable client input.
3. A state-changing action and sensitive read are denied unless the trusted authorization boundary permits them.
4. Revoked membership, permission, credential, delegation, or agent authority cannot continue to authorize work beyond the approved consistency window.
5. Workers, webhooks, integrations, automation, plugins, and AI tools cannot bypass the same authorization and tenant-scope rules.
6. A model response, event, webhook, or provider response is never treated as authority without validation and authorization.
7. Provider credentials and secrets never enter domain contracts, logs, committed configuration, or unauthorized tenant contexts.
8. A duplicate event, job, webhook, or external callback cannot create an unauthorized duplicate side effect.
9. Audit records identify the organization, principal, action, target, authorization basis, and outcome.
10. Removing an optional plugin or provider adapter does not corrupt core behavior or core data ownership.

### Required specialized tests

Before the relevant capabilities ship, the suite must include AI-tool authorization tests, automation authorization tests, webhook authenticity and replay tests, provider-adapter contract tests, migration-forward and recovery tests, failure/retry/idempotency tests, storage authorization tests, and plugin isolation tests.

## Human and AI developer contract

Every future contributor must follow these rules:

1. Read `AGENTS.md`, `README.md`, the governing documents in `docs/`, and the target package README before editing.
2. Make the smallest coherent change. Do not create empty conceptual directories or fake implementations.
3. A module owns its domain rules, private data boundary, public commands and queries, permissions, events, migrations, adapters, and audit behavior.
4. Consume another package only through its declared public exports. Never use private files, deep imports, source-relative cross-package imports, bypassing aliases, or undeclared dependencies.
5. Keep domain and application packages free of NestJS, HTTP, ORM/database-client, and provider SDK dependencies.
6. Keep shared packages small and dependency-light. Never move business policy into shared to avoid a boundary decision.
7. Carry explicit organization context and principal identity through every tenant-owned request, command, event, job, file, search record, cache key, integration callback, automation action, and AI tool invocation.
8. Authorize state changes and sensitive reads at a trusted server-side action boundary. Do not treat UI visibility, model output, event delivery, or client claims as authority.
9. Keep external providers behind replaceable adapters. Never place provider SDK types or credentials in domain contracts.
10. Add runtime validation for every untrusted boundary and version contracts that cross process or provider boundaries.
11. Add migrations only after G-003 and keep them ordered, reviewable, portable, and documented.
12. Add queues, schedulers, jobs, outbox behavior, event transport, retries, or idempotency only after G-004.
13. Test both allowed behavior and denial behavior, especially Organization A/B isolation.
14. Keep secrets out of Git and logs. Update `.env.example` with safe names and placeholders only.
15. Run the canonical repository checks and update documentation in the same change as a material contract or architecture change.
16. Do not introduce Manus runtime dependencies. Any Manus convenience must remain outside portable product runtime behavior.
17. Do not silently resolve an open gate. Stop, document the discrepancy, and request a decision.
18. Pull requests must state ownership, affected contracts, tenant-scope impact, authorization impact, migrations, events, audit behavior, tests, and portability impact.

## Proposed GitHub work breakdown

These are proposed issues only. They should not be created until the maintainer approves the plan.

### Phase 0 issues

| Issue title | Purpose | Dependencies | Expected files/modules | Acceptance criteria |
|---|---|---|---|---|
| Approve and record G-001 | Move the stack from proposal to accepted decision | Maintainer review | `docs/DECISIONS.md`, `docs/G-001-STACK-PROPOSAL.md`, `docs/IMPLEMENTATION-STATUS.md` | Explicit approval recorded; no later gate is silently decided |
| Decide G-002 identity and authorization | Define trusted principals and policy semantics | G-001 approval | `docs/DECISIONS.md`, `docs/PERMISSIONS.md`, `docs/SECURITY.md` | Identity, sessions, memberships, roles, permissions, delegation, revocation, and audit semantics are documented |
| Decide G-003 persistence and tenancy | Select database, migrations, IDs, transactions, and isolation | G-001 approval; G-002 context where relevant | `docs/DECISIONS.md`, `docs/DATABASE.md`, `docs/MULTI-TENANCY.md` | No unresolved persistence choice remains before migrations |
| Decide G-004 reliable execution | Select event, queue, scheduler, retry, outbox, and idempotency semantics | G-001/G-003 | `docs/DECISIONS.md`, `docs/AUTOMATION.md`, `docs/DATABASE.md` | Durable execution and recovery semantics are recorded |

### Phase 1 issues

| Issue title | Purpose | Dependencies | Expected files/modules | Acceptance criteria |
|---|---|---|---|---|
| Create portable runtime foundation | Establish the approved language, workspace, compiler, and root commands | Accepted G-001 | Root manifests, configuration, tooling, documentation | Clone-to-validation workflow runs without Manus |
| Add architecture enforcement | Mechanically enforce package and framework boundaries | Runtime foundation | Package manifests, export maps, graph checks, architecture tests | Forbidden imports, deep imports, cycles, and undeclared dependencies fail checks |
| Add test projects and fixtures | Establish unit, contract, architecture, integration, and e2e structure | Runtime foundation; G-003 for real infrastructure | Test configuration and repository tooling | CI/local commands are identical and security fixtures are documented |
| Add bootstrap and operational conventions | Provide configuration, logging, errors, health, and shutdown behavior | Runtime foundation | Delivery/composition packages and docs | No domain logic depends on framework edges; logs do not leak tenant data |

### Phase 2 issues

| Issue title | Purpose | Dependencies | Expected files/modules | Acceptance criteria |
|---|---|---|---|---|
| Implement organization context | Establish explicit organization and principal scope | G-002/G-003 | Platform organization and context packages | Context is required before tenant-owned access; cross-tenant tests pass |
| Implement membership and authorization core | Apply G-002 decisions at trusted action boundaries | G-002/G-003 | Platform identity, membership, permissions, audit packages | Deny-by-default, revocation, audit, and negative tests pass |
| Implement minimum persistence boundary | Add migrations and data access under G-003 | G-003 | Infrastructure database and owning module migrations | Migrations are source-controlled and scope is enforced in real infrastructure |
| Implement minimum shared capabilities | Add only tasks/audit/events/etc. required by first slice | G-002/G-003/G-004 as applicable | Owned platform packages | Each capability has a public contract and private data boundary |

### Phase 3 issues

| Issue title | Purpose | Dependencies | Expected files/modules | Acceptance criteria |
|---|---|---|---|---|
| Implement CRM contact capability | Prove an application-owned domain slice | Phase 2 | Sales & CRM package and tests | Contacts are organization-scoped, authorized, audited, migrated, and contract-tested |
| Implement CRM follow-up task relation | Prove collaboration through a platform contract | Tasks capability; CRM contact capability | CRM/task public contracts and tests | CRM never writes the task store directly; relation authorization passes |
| Validate first vertical slice end to end | Prove portable assembly and security invariants | Previous Phase 3 issues | API/delivery tests and integration harness | Clone, run, test, migrate, and isolate organizations using standard infrastructure |

### Phase 4 issues

| Issue title | Purpose | Dependencies | Expected files/modules | Acceptance criteria |
|---|---|---|---|---|
| Add public API delivery | Expose stable API contracts without moving business rules to HTTP | Phase 3; G-001/G-002 | Execution API adapters | API validates, authorizes, audits, and uses public actions |
| Add webhook delivery | Receive verified external callbacks | G-004/G-007 | Webhook adapters and tests | Signature, organization resolution, deduplication, and audit pass |
| Add automation execution | Execute approved rules and actions | G-004 | Automation packages and worker role | Retries, idempotency, scopes, approvals, and recovery pass |
| Add governed AI tools | Execute provider-neutral registered tools | G-002/G-004/G-006 | AI execution packages and adapters | Tool allowlists, policy, budgets, approvals, provider replacement, and audit pass |

### Phase 5 and Phase 6 issues

Create extension and additional application issues only after the relevant G-005 through G-010 decisions exist. Each issue must name its manifest or public contract, owner, permissions, tenant strategy, migrations, events, adapter behavior, failure handling, tests, and removal or deprecation path.

## Decisions Requiring Maintainer Approval

### 1. Approve or reject the hardened G-001 stack proposal

**Why it matters.** It determines the runtime and foundation tooling. Without it, implementation would silently choose a stack.

**Options.** Approve the proposal with its boundary hardening; request further changes; or reject and reopen the stack comparison.

**Consequences.** Approval enables Phase 1 only. It does not decide G-002 through G-010. Rejection requires a new portable stack proposal and delays implementation.

**Recommended engineering default.** Approve with the stated CI-enforced package and framework boundaries, because the proposal fits the modular monolith and shared-contract requirements. This is a recommendation, not an accepted decision.

**Record required.** An accepted G-001 entry in `docs/DECISIONS.md` with scope, consequences, deferred gates, and approval date.

### 2. Decide G-002 identity and authorization semantics

**Why it matters.** Every persistent and executable path needs a trusted principal, organization membership, permission decision, delegation rule, and audit basis.

**Options.** Adopt an internally managed standards-based identity and session model; integrate an external identity provider behind an adapter; or use a hybrid model with external authentication and repository-owned organization membership and authorization.

**Consequences.** Internal management increases product ownership and operational burden. An external provider reduces credential burden but adds provider and outage coupling. A hybrid model separates authentication from Business OS authorization but requires precise trust and synchronization rules.

**Recommended engineering default.** Use a standards-based identity adapter with repository-owned organization membership and authorization, because the architecture requires users to be organization members rather than application-owned users. The maintainer must choose the policy and record it.

**Record required.** Identity, sessions, memberships, roles, permission names, delegation, impersonation, service principals, AI/automation principals, revocation, and audit semantics.

### 3. Decide G-003 persistence and tenancy enforcement

**Why it matters.** A single missing organization predicate is a security defect, and the database choice controls migrations, relationships, transactions, recovery, and reliable publication.

**Options.** Use one shared database with defense-in-depth query scoping and database-level policies; use database-per-organization isolation; or use a hybrid model for platform-global and tenant data.

**Consequences.** Shared databases are operationally efficient but demand strong scoping and database controls. Database-per-organization strengthens isolation but increases provisioning, migration, and operations complexity. Hybrid designs can fit different data classes but require clear ownership and routing.

**Recommended engineering default.** Prefer a shared database with explicit organization columns, database constraints/policies where supported, repository scoping, and negative tests, unless the maintainer's risk or scale requirements justify stronger isolation. This is not a selection.

**Record required.** Engine, client/ORM policy, migrations, identifiers, timestamps, transactions, tenancy enforcement, indexes, backups, restoration, and reliable-publication relationship.

### 4. Decide G-004 reliable execution

**Why it matters.** Automation, webhooks, notifications, integrations, and AI work cannot rely on in-process best effort if committed state must produce a side effect.

**Options.** A database-backed outbox with a replaceable queue; a managed queue with an explicit reliable-publication bridge; or a database-native worker model for an initial scope.

**Consequences.** Outbox plus queue is robust but operationally broader. A managed queue can reduce operations but increases provider coupling. A database-native worker may simplify the first slice but can constrain throughput and scheduling.

**Recommended engineering default.** Prefer a transactional outbox with a replaceable queue and explicit idempotency, retry, dead-letter, replay, and reconciliation contracts. The maintainer must approve the operational trade-off.

**Record required.** Event envelope, publication guarantees, queue/scheduler, ordering, retries, idempotency, dead letters, replay, recovery, and principal/organization context.

### 5. Decide whether Sales & CRM is the first application slice

**Why it matters.** The first application establishes whether module ownership, shared capabilities, permissions, tenancy, events, and provider neutrality work in practice.

**Options.** Start with Sales & CRM; start with Work as a platform-adjacent capability; or start with another bounded application selected by evidence.

**Consequences.** Sales & CRM exercises several boundaries without immediately requiring payments or workforce-sensitive data. Work may validate shared tasks earlier but risks blurring platform and application ownership. Another application may be valid if it has a smaller, better-bounded dependency graph.

**Recommended engineering default.** Use the proposed CRM contact and follow-up task slice after the platform prerequisites are approved. This remains a plan recommendation, not a product decision.

**Record required.** The chosen first application, slice scope, dependencies, ownership, and exit criteria.

## Recommended next repository action

**Do not implement code yet.** The single most appropriate next action is to obtain maintainer approval or rejection of the hardened G-001 proposal and record the result in `docs/DECISIONS.md`. If approved, proceed only with Phase 0 closure and the Phase 1 portable runtime foundation. If rejected, create a replacement stack proposal before any implementation.

## Final readiness conclusion

### Already established

The repository has an authoritative architecture contract, a modular-monolith direction, organization-first tenancy requirements, deny-by-default authorization principles, governed AI and automation boundaries, provider adapters, optional extension rules, migration and security expectations, and Manus-independence requirements. The hardened G-001 proposal defines a suitable implementation direction and explicit enforcement requirements.

### Missing

There is no accepted G-001 decision, runtime, package graph, executable architecture enforcement, test harness, CI, database decision, identity decision, authorization implementation, migration system, event transport, queue, storage provider, integration adapter, plugin runtime, AI provider, or product slice.

### Blocking implementation

G-001 approval blocks all implementation. G-002 blocks authentication and authorization. G-003 blocks persistent tenant-owned data and migrations. G-004 blocks durable jobs, events, webhooks, automation, and agent execution. Architecture enforcement must precede broad multi-package feature work.

### Can be decided during implementation

After the relevant gates are approved, the team can decide package granularity, exact runtime schema library, logging library, error serialization details, test fixture organization, API documentation generation, and other replaceable tooling details. These choices must preserve the documented architecture and must not silently select a later gate.

## References

[1]: ../AGENTS.md "Business OS Contributor Guidance"
[2]: ../README.md "Business OS Repository Overview"
[3]: ARCHITECTURE.md "Business OS Architecture"
[4]: REPOSITORY-STRUCTURE.md "Business OS Repository Structure"
[5]: IMPLEMENTATION-STATUS.md "Business OS Implementation Status"
[6]: DEVELOPMENT.md "Business OS Development"
[7]: G-001-STACK-PROPOSAL.md "Business OS G-001 Stack Proposal"
[8]: DATABASE.md "Business OS Database Architecture"
[9]: MULTI-TENANCY.md "Business OS Multi-Tenancy"
[10]: PERMISSIONS.md "Business OS Permissions"
[11]: APPS.md "Business OS Applications"
[12]: PLUGINS.md "Business OS Plugins"
[13]: AI-AGENTS.md "Business OS AI Agents"
[14]: AUTOMATION.md "Business OS Automation"
[15]: INTEGRATIONS.md "Business OS Integrations"
[16]: SECURITY.md "Business OS Security"
[17]: DEPLOYMENT.md "Business OS Deployment"
[18]: DECISIONS.md "Business OS Architecture Decisions"
