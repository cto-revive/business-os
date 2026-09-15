# G-001 Stack Proposal

## Executive summary

**Proposed stack: TypeScript on a repository-pinned Node.js LTS runtime, NestJS, pnpm workspaces, TypeScript project references, and Vitest.** The proposal is **PENDING maintainer approval**. No implementation should begin on the basis of this proposal alone.

The recommendation is for a portable modular monolith with one repository and source-controlled Web/API and worker entry points. NestJS should provide delivery and composition at the edge. Framework-free domain and application packages should expose narrow public contracts. Package exports, workspace dependencies, TypeScript project references, import-boundary checks, cycle checks, runtime schemas, and architecture tests should enforce the boundaries. Nest modules alone are not sufficient as an architectural firewall.

The proposed stack does not select the database, identity model, authorization semantics, queue, event transport, storage, plugin runtime, AI provider, integration credentials, or production deployment topology. Those remain the later gates G-002 through G-010.

## Business OS constraints considered

The evaluation considered the accepted requirements in the repository: a modular monolith; organization isolation from Day 1; centralized authorization; shared platform capabilities; strong application boundaries; provider-neutral integrations; governed AI agents and automation; source-controlled background work; explicit tests; GitHub as the source of truth; and portability outside Manus.

The stack must allow a developer or AI coding agent to clone GitHub, install documented dependencies, configure environment variables, start standard infrastructure, and run the same validation commands used by CI. It must not require Manus APIs, Manus environment variables, Manus databases, Manus storage, Manus authentication, Manus queues, Manus deployment, or Manus conversation history.

## Candidate stacks evaluated

### TypeScript + NestJS + pnpm + project references + Vitest

**Overview.** This candidate uses TypeScript on a pinned Node.js LTS runtime. NestJS supplies HTTP, dependency-injection, module composition, and worker/application bootstrapping. pnpm workspaces organize meaningful packages. TypeScript project references and package export maps make published contracts more explicit. Vitest provides unit, contract, integration, and end-to-end test projects.

**Advantages.** Nest modules encapsulate providers and expose only explicitly exported providers to importing modules, which maps to the published-contract rule. pnpm workspaces and the `workspace:` protocol provide strict local-package references. TypeScript project references can structure programs into smaller pieces and support incremental builds. One language can represent API contracts, actions, events, job payloads, authorization context, and tests. Node processes can run the Web/API and worker roles from the same repository. The ecosystem provides strong hiring, editor, CI, container, and observability support.

**Disadvantages.** Nest dependency injection and decorators add runtime indirection. Nest module encapsulation is not a complete boundary: source imports, broad shared packages, global modules, ORM clients, and barrel exports can bypass ownership. TypeScript types disappear at runtime, so external HTTP, webhook, event, job, plugin, and AI-tool inputs still require runtime validation. Workspace and project-reference configuration adds complexity. A queue integration would add operational dependencies but would not itself solve transactional outbox, idempotency, retries, or recovery.

**Architectural fit.** High when workspace packages, export maps, project references, and import-boundary checks are treated as the primary boundaries. Domain and application code should remain framework-free. Nest controllers, guards, delivery adapters, provider SDKs, queue consumers, and composition roots should remain at the edges.

**Portability.** High. The base runtime is standard Node.js and can run in conventional containers, virtual machines, or managed process environments. NestJS, pnpm, TypeScript, and Vitest are repository-managed tools, not Manus services. Later providers must remain behind the adapters already required by the architecture.

**Testing.** Strong, provided the test hierarchy is mandatory. Use framework-free domain tests, Nest wiring tests, public-contract tests, import-boundary tests, and real-dependency integration/e2e tests. Tenant-isolation tests must cover requests, jobs, events, files, search, caches, webhooks, integrations, automation, and AI tools.

**Developer experience.** Strong but configuration-heavy. A single lockfile, root commands, workspace filters, project references, Nest conventions, and targeted Vitest projects can provide a coherent workflow. Templates and documentation are needed to prevent configuration drift.

**AI-agent experience.** Favorable. TypeScript signatures, compiler output, exports, runtime schema conventions, lint/import rules, and deterministic tests provide useful feedback. Agents still need explicit instructions because compilation does not prove authorization or tenant isolation.

**Long-term maintenance.** Good if the codebase prohibits framework leakage into domain packages, controls dependency cycles, pins the toolchain, and tests runtime wiring. Operational complexity will come from Business OS requirements such as persistence, storage, queues, audit, observability, and recovery rather than from Nest alone.

**Risks.** Boundary erosion, runtime-validation gaps, DI misconfiguration, tenant-context loss, asynchronous side-effect duplication or loss, project-reference drift, and optional provider lock-in. Mitigations are described below.

### Python + FastAPI + uv + pytest + Ruff + mypy

**Overview.** This candidate uses Python with FastAPI for API delivery, uv for project and dependency management, pytest for tests, Ruff for linting and formatting, and mypy for static analysis.

**Advantages.** FastAPI provides type-driven request and response validation, OpenAPI generation, dependency injection, and security primitives. Python packages can map to the conceptual repository boundaries. uv provides a modern environment, dependency, and lockfile workflow. pytest has a mature fixture and integration-testing model. Ruff offers fast linting and formatting, while mypy adds static analysis.

**Disadvantages.** FastAPI organizes API delivery but does not enforce domain-module boundaries. Python typing is gradual and can be weakened by `Any`, untyped dependencies, casts, and suppressions. FastAPI background tasks are not a durable mechanism for Business OS jobs, retries, schedules, webhooks, agent runs, or dead-letter recovery. The ecosystem offers many choices, which can increase dependency and compatibility burden.

**Architectural fit.** Strong but more convention-led. Explicit packages, public modules, typed protocols, and import checks can implement the architecture. The project would need more custom enforcement to prevent routers from reaching persistence or providers directly.

**Portability.** High and Manus lock-in is low. Python, ASGI, uv, pytest, Ruff, and mypy run on standard infrastructure. Later choices for the database, queue, identity, storage, and model providers would determine practical lock-in.

**Testing.** Strong with pytest and HTTPX, especially for API and fixture-driven tenant-negative tests. Real database, queue, storage, migration, outbox, and webhook tests would still be required.

**Developer experience.** Very good for API work, with a concise toolchain and generated API documentation. Async/sync conventions and later worker, ORM, and typing choices could fragment the workflow.

**AI-agent experience.** Good if strict typing, import rules, runtime schemas, and CI are enforced. Python readability is an advantage, but agents can easily add an unscoped query, a provider import, or a route-level business rule.

**Long-term maintenance.** Favorable, but it depends heavily on strict conventions and dependency governance. The language would not remove the need for explicit architectural tests.

**Risks.** Gradual typing escapes, convention-based boundaries, event-loop misuse, in-process background work, and broad ecosystem choice. These are manageable but require more project-specific enforcement for this repository.

### Go + standard library HTTP/context + Go modules + go test + go vet + golangci-lint

**Overview.** This candidate uses Go with standard `net/http` and `context`, Go modules, the standard testing package, gofmt, go vet, and a pinned golangci-lint configuration. A narrow `chi` router could be added later if its routing and middleware features are needed.

**Advantages.** Go provides static typing, a small standard-library baseline, compiled artifacts, deterministic formatting, built-in testing, fuzzing, race testing, and straightforward deployment. Go's `internal/` packages can hide implementation details. Separate API and worker commands can share application contracts. The base runtime has very low vendor lock-in.

**Disadvantages.** Package visibility does not enforce the full conceptual architecture. The project must define public-package and `internal/` conventions and add import-graph checks. Standard HTTP does not provide validation, OpenAPI, API error conventions, migrations, authorization, or job execution. More delivery and contract conventions would be assembled by the project. Concurrency makes cancellation, resource limits, and leak prevention important.

**Architectural fit.** Strong, with more bespoke composition. Domain packages can expose interfaces and typed commands while delivery and infrastructure remain at the edges. This is compatible with the repository but provides fewer integrated conventions for the cross-cutting contract surface.

**Portability.** Highest base-runtime portability. Standard Go binaries can run on ordinary infrastructure. Practical lock-in still depends on later choices for database, queue, storage, identity, and model providers.

**Testing.** Strong standard tooling, including HTTP tests, fuzzing, race testing, and benchmarks. More harness work is required for API contracts, schema validation, and assembled application tests.

**Developer experience.** Good after deliberate scaffolding. The core command surface is simple, but API validation, documentation, error handling, migrations, observability, and background execution need explicit project conventions.

**AI-agent experience.** Favorable because compiler, formatter, tests, and interfaces offer deterministic feedback. Semantic risks remain: compiled code can still omit organization scope or bypass authorization.

**Long-term maintenance.** Good with a small dependency set and strict package ownership. The thin baseline shifts more design responsibility into repository-owned conventions.

**Risks.** Boundary erosion in a single module, ad hoc selection of critical libraries, context misuse, concurrency defects, and larger bespoke API/contract surface. These are manageable but increase the foundation work before a productive vertical slice.

## Comparative decision matrix

The matrix uses qualitative assessments based on the repository's actual constraints. “Strong” means the candidate supplies useful mechanisms with moderate project configuration. “Conditional” means the candidate can fit but relies more heavily on conventions or custom enforcement. No candidate automatically provides tenant isolation or authorization.

| Criterion | TypeScript/NestJS | Python/FastAPI | Go | Basis |
|---|---|---|---|---|
| Modular-monolith fit | Strong, conditional | Strong, convention-led | Strong, bespoke | All can host one deployable system; TypeScript provides the most direct package/contract/tooling combination for the prescribed layout. |
| Boundary enforcement | Best layered option | Moderate without custom checks | Strong private-package option, moderate overall | Workspace exports, project references, cycle checks, and import rules complement Nest encapsulation; all still need architecture tests. |
| Public contracts and runtime validation | Strong static surface; runtime schemas required | Strong runtime API validation; gradual static typing | Strong static interfaces; runtime validation must be assembled | Business OS has many typed commands/events/tools but untrusted inputs need runtime schemas in every candidate. |
| API and worker readiness | Strong composition path | Strong API; worker system additional | Strong process model; conventions additional | All support separate source-controlled roles; durable asynchronous semantics remain G-004. |
| Testing | Strong with Vitest projects and Nest test utilities | Strong pytest fixture model | Strong standard tooling, race and fuzz support | All can support the required test pyramid; none currently has tests in the repository. |
| Developer experience | Strong but configuration-heavy | Very good initial ergonomics | Good, explicit plumbing | The recommendation values shared contracts and multi-agent feedback over minimal initial configuration. |
| AI coding-agent feedback | Strong | Good | Strong | Compiler, exports, schemas, lint, and tests are useful only when CI enforces architecture and security invariants. |
| Portability | High | High | Very high | All are portable and Manus-independent at the base layer; later infrastructure choices dominate practical lock-in. |
| Long-term maintenance | Good with guardrails | Favorable with strict conventions | Good with disciplined packages | Business OS operational complexity exists regardless of language. |
| Main risk | Framework/boundary leakage and DI indirection | Convention drift and gradual typing escapes | Bespoke conventions and dependency sprawl | Each risk is manageable; TypeScript offers the best balance for the repository's cross-cutting contracts. |

## Proposed stack

The proposed G-001 stack is:

| Concern | Proposal |
|---|---|
| Runtime/language | Node.js LTS, pinned in repository-owned version metadata; TypeScript with strict compiler settings |
| Primary framework | NestJS for delivery, dependency composition, and application/worker bootstraps |
| Package manager | pnpm workspaces with one committed lockfile and explicit `workspace:` dependencies |
| Build system | TypeScript composite project references and a root solution build using `tsc --build`; the final bundling strategy remains part of the implementation skeleton |
| Test framework | Vitest with separate unit, contract, integration, and end-to-end projects |
| Linting/formatting | ESLint with import-boundary rules and a repository-selected formatter; exact configuration is part of the post-approval skeleton |
| Type checking | TypeScript strict mode and a clean project-reference build; type checking is separate from test execution |
| Module-boundary enforcement | Package export maps, no deep cross-package imports, explicit workspace dependencies, project references, cycle rejection, import-graph checks, architecture tests, and module ownership documentation. Nest module encapsulation is supplementary. |
| Local development | Standard Node/pnpm installation from a clone; root commands for API and worker entry points. No Manus service is required. Later external services are started through standard, documented infrastructure after G-003/G-004/G-008. |
| CI commands | `pnpm install --frozen-lockfile`; format check; lint; typecheck via clean `tsc --build`; unit tests; contract tests; build; then integration/e2e against disposable selected infrastructure. Exact scripts are not created until approval. |
| Development tooling | Pinned Node and pnpm versions, root configuration, project-reference solution, runtime schema library selected during implementation, dependency-cycle/import-boundary checks, test coverage and security checks as appropriate. |

### Proposed module shape

A meaningful workspace package may represent a platform capability, business application capability, execution contract or entry point, extension contract, or infrastructure adapter. The project should not turn every conceptual directory into a package.

Framework-free domain and application packages should expose small public command, query, event, permission, action-registration, and runtime-schema contracts through package export maps. Nest controllers, guards, interceptors, HTTP delivery, worker consumers, ORM implementations, provider SDKs, and bootstrap composition should remain in delivery or infrastructure packages. Module-owned interfaces should be injected through runtime tokens rather than erased TypeScript interfaces. Global Nest modules should be prohibited except for narrowly controlled composition-root infrastructure.

The physical module shape remains subject to refinement after approval, but it must preserve the documented `apps`, `platform`, `execution`, `extensions`, `infrastructure`, `shared`, `tests`, and `tooling` ownership model.

## Why this stack fits Business OS

Business OS requires many shared contracts that cross application, execution, integration, automation, and AI boundaries. A common TypeScript contract surface reduces translation friction for commands, queries, events, registered actions, job envelopes, authorization context, and tool inputs. The compiler, project references, package exports, and Vitest provide machine-checkable feedback for both human engineers and AI coding agents.

NestJS provides useful outer composition without forcing domain logic into framework classes. Its module encapsulation maps to published providers, while separate API and worker bootstraps support the documented modular-monolith process roles. The stack can evolve toward extracted services because public contracts and adapters are explicit, but it does not require microservices now.

The recommendation is conditional. TypeScript types do not enforce organization isolation, authorization, reliable event publication, or runtime validation. The approved implementation must add explicit organization context, server-side authorization, runtime schemas, persistence scoping, import-boundary checks, and adversarial tests. NestJS must not become an excuse for global modules, direct provider access, or framework-dependent domain rules.

## Rejected alternatives

**Python/FastAPI** is a serious alternative and remains suitable for Business OS. It was not selected because the proposed TypeScript workspace, export-map, project-reference, and shared-contract combination offers a more direct enforcement path for the repository's modular boundaries and cross-cutting execution contracts. FastAPI's API ergonomics are excellent, but domain-module boundaries would rely more on project-specific conventions and custom checks.

**Go** is a serious alternative with the strongest base-runtime portability and excellent standard testing. It was not selected because a larger amount of API validation, contract composition, and delivery convention would need to be assembled by the project before the same cross-cutting developer and AI-agent workflow was available. Go should remain a viable future alternative if the maintainer prioritizes minimal runtime and compiled-artifact simplicity over the proposed shared TypeScript contract surface.

The alternatives are rejected for this proposal only, not declared technically unsuitable or permanently excluded from future projects.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Organization context is lost in queries, jobs, events, caches, search, files, integrations, or AI tools | Use explicit, runtime-validated context envelopes; select persistence defense in depth in G-003; require Organization A/B negative tests across every execution path |
| Authorization is bypassed by workers, webhooks, automation, integrations, or agents | Make registered server-side actions the state-changing boundary; reauthorize every invocation; use named principals; audit attempts and outcomes |
| Compile-time contracts are trusted for untrusted input | Standardize versioned runtime schemas for HTTP, webhook, event, job, plugin, and AI-tool boundaries |
| Nest globals, shared packages, aliases, or direct ORM access erode boundaries | Enforce package exports, project references, import-graph rules, cycle rejection, ownership review, and architecture tests |
| Dependency injection compiles but fails or resolves incorrectly at runtime | Use explicit runtime tokens, prohibit interface-name injection, and run bootstrap smoke and integration tests |
| Queue integration loses or duplicates side effects | Defer queue selection to G-004; require outbox or equivalent, idempotency, retries, dead-letter, replay, reconciliation, and audit tests |
| Toolchain drift between local development and CI | Pin Node and pnpm, commit the lockfile, centralize TypeScript configuration, and use identical root commands in CI |
| The recommendation is mistaken for a database, identity, queue, cloud, or deployment decision | Keep G-002 through G-010 explicitly deferred in the accepted ADR history and this proposal |

## Decisions deferred to G-002 through G-010

- **G-002:** identity, sessions, memberships, roles, permission names, administrative delegation, and authorization semantics.
- **G-003:** database engine, migrations, identifiers, time conventions, indexes, tenancy enforcement, transaction boundaries, and recovery objectives.
- **G-004:** event contracts, reliable publication, queue, scheduler, idempotency, retry, dead-letter, ordering, and recovery.
- **G-005:** plugin manifests, package model, isolation, review, versioning, lifecycle, resource limits, and network access.
- **G-006:** model providers, AI data policy, retrieval, prompts, budgets, safety, approvals, and production agent execution.
- **G-007:** integration contracts, credentials, OAuth/API keys, webhook verification, provider selection, and callback reconciliation.
- **G-008:** storage provider, file access, retention, export, deletion, backup, and restoration.
- **G-009:** production deployment topology, artifacts, CI/CD service, infrastructure as code, environment promotion, observability, and incident operations.
- **G-010:** entitlements, application installation, configuration, templates, themes, and marketplace governance.

## Final architecture review

### Modular-monolith boundary model

The proposed stack survives review only when **workspace packages and package export maps**, not NestJS modules alone, define the enforceable architectural boundary. A Nest module is a composition mechanism inside a package or at a delivery edge. It is not permission to import another module's private records or infrastructure.

The recommended implementation model is:

| Conceptual boundary | Recommended package responsibility | Allowed dependencies | Public surface |
|---|---|---|---|
| `platform/organizations` | Organization identity, organization context contracts, and organization-scoped actions | Shared contracts only; later persistence through owned ports | Context types, commands, queries, events, and action registrations |
| `platform/identity` | Provider-neutral identity linkage and principal contracts | Shared contracts and organization public contracts | Principal and membership-facing contracts; no provider SDK |
| `platform/permissions` | Authorization policies, permission evaluation contracts, and registered authorization actions | Organization and shared contracts | Permission/action contracts and decision results |
| `platform/teams` | Team domain rules and team-facing actions | Organizations, permissions, shared contracts | Team commands, queries, events, and permissions |
| `apps/sales` and `apps/commerce` | Domain rules, use cases, owned records, and application contracts | Platform public contracts and shared contracts; never private sibling internals | Published application commands, queries, events, permissions, and action registrations |
| `execution/ai` | Agent/tool orchestration and provider-neutral agent contracts | Platform/application public contracts and shared contracts | Registered tool/action contracts; no model SDK in domain packages |
| `execution/automation` | Triggers, conditions, rule execution, and action orchestration | Event/action contracts and platform authorization contracts | Automation contracts and execution outcomes |
| `extensions/plugins` | Plugin contract and later runtime boundary | Published extension contracts only | Manifest, capability, permission, and lifecycle contracts |
| `extensions/integrations` | Provider-neutral integration contracts and adapter registration | Platform/application contracts and infrastructure ports | Commands, queries, callbacks, statuses, and error categories |
| `infrastructure/database` | Database and migration implementations selected in G-003 | Module-owned persistence ports; never domain rules | Implementations wired only at composition roots |
| `infrastructure/storage` | Object/file storage implementations selected in G-008 | Module-owned storage ports | Provider-neutral storage implementation |
| `shared/contracts` | Small stable cross-module primitives and wire contracts | No apps, platform implementations, execution implementations, or providers | Versioned primitives only; no domain policy |

These are ownership targets, not directories to create during this review. Each implemented package must have one owner, a concise README, a public export list, a private implementation area, allowed dependencies, forbidden dependencies, organization-scope rules, permissions, events, migrations, adapters, audit behavior, and test commands.

### How bypasses are prevented

A developer or AI agent could bypass a boundary by using a deep relative import, a broad barrel export, a path alias that reaches private code, a direct ORM client, a Nest global module, an erased TypeScript interface as an injection token, a circular package dependency, or a provider SDK imported into domain code. The prevention model is layered:

1. Package `exports` expose only public entry points. Private files are not valid package imports.
2. Consumers declare explicit `workspace:` dependencies. Undeclared package use fails installation or lint/build checks.
3. TypeScript composite project references and a root solution build make package relationships explicit and reject invalid project graphs.
4. ESLint import-boundary rules and a repository dependency-graph check reject forbidden edges, deep imports, cycles, provider imports outside adapters, and framework imports in domain packages.
5. Architecture tests inspect package manifests and import graphs. They are separate from ordinary unit tests.
6. CODEOWNERS or equivalent ownership review protects platform, shared contracts, and infrastructure boundary changes.
7. Runtime bootstrap tests verify Nest tokens, module composition, and worker/API wiring because DI errors can compile successfully.

The `shared` boundary must be kept deliberately narrow. It may contain stable contracts, types, validation primitives, errors, and utilities, but it must not contain application policy, a shared ORM model layer, a global service locator, or a provider client.

### Framework isolation strategy

**Yes, Business OS can use NestJS as an outer application and delivery framework while keeping the actual business architecture framework-independent.** The exact boundary is the package export boundary:

- Domain packages contain pure TypeScript rules and value types. They do not import NestJS, HTTP types, ORM entities, database clients, provider SDKs, decorators, or framework-specific exceptions.
- Application packages contain use cases and ports. They may depend on domain packages and public platform contracts, but they do not require NestJS when a plain function or class is sufficient.
- Delivery packages contain Nest controllers, guards, interceptors, pipes, HTTP serialization, and composition modules. They translate external input into validated commands and invoke application contracts.
- Infrastructure packages implement module-owned ports for persistence, storage, queues, email, messaging, model providers, and external services. Provider SDKs stop at these adapters.
- Composition roots wire runtime tokens to implementations. TypeScript interfaces are not injection tokens because they are erased at runtime; tokens must be explicit and testable.

Global NestJS modules are prohibited except for narrowly controlled composition-root infrastructure. Circular Nest module references are treated as defects, not solved by `forwardRef` as a default. Nest decorators and DI are therefore replaceable delivery concerns, not part of the domain architecture.

### Human and AI developer maintainability

The repository has enough architectural guidance to start, but the implementation must make the guidance executable. Every package should include ownership, public exports, allowed and forbidden imports, organization-scope rules, permissions, events, migrations, adapters, audit behavior, and validation commands. Root commands must be the only canonical commands documented for CI and local development. A change template should require affected modules, contracts, tenant-scope analysis, authorization analysis, tests, and documentation updates.

Agents and junior engineers are most likely to make semantic errors that TypeScript cannot catch: an unscoped query, a direct provider import, a route-level business rule, a job that trusts stale authorization, or a broad shared utility. Mandatory architecture tests, Organization A/B negative tests, runtime schemas, import checks, and small vertical slices are stronger safeguards than additional framework features.

### Manus-independence verification

Nothing in the proposed base stack requires Manus. A human developer needs a supported Node.js LTS runtime, pnpm, the repository clone, documented environment variables, and later-selected standard infrastructure. Another AI coding agent needs only the repository, its version-controlled instructions, the same dependencies, and the same root validation commands. GitHub stores the source, package manifests, lockfile, configuration templates, tests, migrations, contracts, architecture records, and operational definitions.

The future environment may require a database, object storage, queue/cache, email or messaging provider, identity provider, and model provider, but those are later decisions and must be configured through documented environment variables and adapters. No Manus API, runtime service, database, storage, authentication, queue, deployment mechanism, build tool, environment variable, or conversation state is part of the proposal. Any optional Manus convenience must live outside the Business OS runtime and outside domain packages.

### Compatibility with G-002 through G-010

The proposal leaves sufficient freedom for every later gate. G-002 can select standards-based identity and authorization without changing domain packages because principals, scopes, and permission decisions are contracts. G-003 can select a database, migration tool, and tenancy enforcement method behind module-owned ports. G-004 can select event delivery, queues, scheduling, outbox, and idempotency without making Nest or a specific queue provider part of domain logic. G-005 can choose a plugin manifest and isolation model without making workspace packages executable plugins. G-006 can choose model providers and data policy behind agent/tool interfaces. G-007 can select credentials, OAuth, webhook verification, and providers behind integration adapters. G-008 can select storage behind file/storage ports. G-009 can choose containers, CI/CD, infrastructure as code, and observability using standard Node processes. G-010 can govern installation and entitlements through application and extension contracts.

The stack therefore creates no accidental later-provider commitment, provided the implementation rejects direct SDK imports, provider-shaped domain objects, global infrastructure access, and framework-dependent domain rules.

## Required Changes Before Approval

**No required architectural changes identified.** The proposal already states that NestJS is not the architectural firewall, keeps G-002 through G-010 deferred, and requires package-level contracts and framework-free business code.

Before implementation begins after approval, the accepted G-001 record must preserve these requirements as non-optional acceptance criteria: package export maps; explicit workspace dependencies; project-reference and cycle checks; import-boundary checks; runtime schemas; no NestJS imports in domain packages; no provider SDKs in domain/application packages; explicit runtime injection tokens; and architecture plus tenant-negative tests.

## Optional Improvements

These improvements are useful but should not block G-001:

- Add package-local `README.md` templates and a module manifest format after the first real package exists.
- Add a dependency-graph visualization for maintainers and AI coding agents.
- Add a change template that asks for ownership, contract, tenant, authorization, event, and audit impact.
- Add generated API and contract documentation after the API representation is selected.
- Add CODEOWNERS and automated dependency-review policy when implementation begins.
- Reconsider whether a narrower HTTP framework is preferable after the first vertical slice, without moving framework concerns into domain packages.

## Final recommendation

### APPROVE G-001

The proposed TypeScript/NestJS/pnpm stack survives the final architecture review. NestJS can be used as an outer delivery and composition framework while the business architecture remains framework-independent. The recommendation is suitable to proceed to implementation **after explicit maintainer approval**, with the package-boundary, framework-isolation, runtime-validation, import-graph, and architecture-test controls above treated as binding requirements.

G-001 is still **PENDING maintainer approval**. This review does not accept the decision and does not authorize implementation.

## Approval required

G-001 is **PENDING**. The maintainer must explicitly approve or reject this proposal before implementation begins. Approval should confirm the proposed stack, the boundary-enforcement requirements, the proposed root command surface, and the fact that G-002 through G-010 remain unresolved.

No `package.json`, framework source, database file, migration, application directory, UI, API implementation, CI workflow, Docker deployment, authentication, or infrastructure implementation was created for this proposal.

## References

[1]: ../AGENTS.md "Business OS Contributor Guidance"
[2]: ../README.md "Business OS Repository Overview"
[3]: ARCHITECTURE.md "Business OS Architecture"
[4]: REPOSITORY-STRUCTURE.md "Business OS Repository Structure"
[5]: IMPLEMENTATION-STATUS.md "Business OS Implementation Status"
[6]: DEVELOPMENT.md "Business OS Development"
[7]: DECISIONS.md "Business OS Architecture Decisions"
[8]: DATABASE.md "Business OS Database Architecture"
[9]: MULTI-TENANCY.md "Business OS Multi-Tenancy"
[10]: PERMISSIONS.md "Business OS Permissions"
[11]: DEPLOYMENT.md "Business OS Deployment"
[12]: https://docs.nestjs.com/modules "NestJS Modules"
[13]: https://www.typescriptlang.org/docs/handbook/project-references.html "TypeScript Project References"
[14]: https://pnpm.io/workspaces "pnpm Workspaces"
[15]: https://vitest.dev/guide/workspace "Vitest Workspace Projects"
[16]: https://fastapi.tiangolo.com/ "FastAPI Documentation"
[17]: https://go.dev/doc/modules/layout "Go Module Layout"
