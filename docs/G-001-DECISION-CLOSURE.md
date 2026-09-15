# G-001 Decision Closure

## Purpose and current status

This document converts the completed implementation-readiness audit into a precise maintainer-approval package. It does not accept G-001 and does not authorize implementation.

The repository's committed readiness audit is [`G-001-READINESS-AUDIT.md`](G-001-READINESS-AUDIT.md). The task instruction referred to `G-001-IMPLEMENTATION-READINESS-AUDIT.md`; that filename does not exist in the current repository. The committed `G-001-READINESS-AUDIT.md` is the authoritative audit used here. Inspection of the current `main` branch found no later commit that changes its conclusions: the repository remains documentation-only, G-001 remains pending, and the later gates remain unresolved.

## A. G-001 decision proposed for approval

The exact proposal is the hardened G-001 stack proposal in [`G-001-STACK-PROPOSAL.md`](G-001-STACK-PROPOSAL.md). The proposed decision is:

| Concern | Proposed G-001 decision |
|---|---|
| Runtime | Repository-pinned Node.js LTS runtime |
| Language | TypeScript with strict compiler settings |
| Package manager | pnpm |
| Workspace strategy | pnpm workspaces, one committed lockfile, and explicit `workspace:` dependencies |
| Framework | NestJS for delivery, dependency composition, and API/worker composition roots |
| Test framework | Vitest with separate unit, contract, integration, and end-to-end projects |
| Build and type checking | TypeScript composite project references, a root solution, and a clean `tsc --build` type-check/build gate |
| Public package boundary | Package `exports` maps are the public API boundary. Consumers use only declared public exports. Private files, deep imports, cross-package relative source imports, bypassing path aliases, and undeclared workspace dependencies are prohibited. |
| Architecture enforcement | CI-enforced package dependency graph validation, forbidden-edge validation, framework and provider-SDK import restrictions, cycle detection, package-manifest validation, public-export/deep-import validation, and architecture tests |
| Framework boundary | NestJS remains at delivery/composition edges. Domain and application/use-case packages have no NestJS, HTTP-framework, ORM/database-client, or external-provider SDK dependencies. |
| Runtime validation | A replaceable runtime-schema mechanism validates HTTP, webhook, event, job, plugin, integration-callback, AI-tool, and relevant provider-response boundaries. The concrete schema library is not selected by G-001. |
| Deployment posture | Portable modular monolith with source-controlled Web/API and worker entry points. No Manus runtime dependency. |

This proposal does **not** select a database, ORM, identity provider, queue, scheduler, storage provider, AI provider, plugin runtime, integration provider, cloud platform, or production CI/CD platform.

## B. Approved versus pending decisions

The table distinguishes accepted architectural requirements from the proposed G-001 implementation decision and the later gates that must remain pending.

| Decision | Current status | Proposed decision | Must maintainer approve? | Consequence |
|---|---|---|---|---|
| Start as a modular monolith | Accepted in ADR-001 | Preserve | No new approval; must be preserved | One repository and initial deployment shape; no premature microservices |
| Organization as primary tenant boundary | Accepted in ADR-002 | Preserve | No new approval; must be preserved | Tenant-owned records and execution paths enforce organization scope |
| Users as organization members | Accepted in ADR-003 | Preserve | No new approval; detailed G-002 semantics remain pending | Applications do not own parallel identity systems |
| Shared platform capabilities | Accepted in ADR-004 | Preserve | No new approval; implementation details remain gated | Applications use platform contracts for shared capabilities |
| Distinct apps, plugins, integrations, agents, templates, and themes | Accepted in ADR-005 | Preserve | No new approval; individual gates remain pending | Extension concepts are not collapsed into one generic mechanism |
| AI and automation as horizontal capabilities | Accepted in ADR-006 | Preserve | No new approval; execution decisions remain gated | Agents and automation use registered actions, permissions, scope, and audit |
| Provider adapter boundaries | Accepted in ADR-007 | Preserve | No new approval; provider selections remain pending | Domain rules remain provider-neutral |
| GitHub authority and portability | Accepted in ADR-008 | Preserve | No new approval; must be mechanically demonstrated later | Manus is not required at runtime |
| Optional plugins cannot be core dependencies | Accepted in ADR-009 | Preserve | No new approval; plugin model remains G-005 | Core remains operable without optional plugins |
| Version-controlled database evolution | Accepted in ADR-010 | Preserve | No new approval; database and migration choices remain G-003 | Schema changes remain repository-owned migrations |
| Stack-neutral conceptual repository structure | Accepted in ADR-011 | Preserve | No new approval; physical package implementation follows G-001 | Ownership and dependency direction remain understandable across tooling changes |
| G-001 runtime and language | Pending proposal | Node.js LTS and strict TypeScript | **Yes** | Establishes the portable language/runtime foundation |
| G-001 package manager and workspace | Pending proposal | pnpm workspaces with explicit workspace dependencies | **Yes** | Establishes package installation and local dependency workflow |
| G-001 framework and composition | Pending proposal | NestJS at delivery/composition edges only | **Yes** | Provides outer application composition without making the domain framework-dependent |
| G-001 build and type checking | Pending proposal | TypeScript project references and clean `tsc --build` | **Yes** | Provides strict build/type-check feedback and explicit project relationships |
| G-001 test framework | Pending proposal | Vitest test projects | **Yes** | Establishes unit, contract, integration, and end-to-end test execution |
| G-001 architecture enforcement | Pending proposal | CI graph, forbidden-edge, export, cycle, manifest, import, and architecture checks | **Yes** | Makes package and framework rules executable rather than documentation-only |
| G-001 runtime schema mechanism | Requirement established; library pending | Use a replaceable runtime-schema mechanism | **Yes, for the requirement; no library selection in G-001** | External data is validated without locking the architecture to a schema vendor |
| G-002 identity, sessions, memberships, roles, and authorization | Not yet defined | Remain pending | **Yes, in G-002** | Blocks authentication and authorization implementation |
| G-003 database, ORM, migrations, IDs, time, transactions, tenancy | Not yet defined | Remain pending | **Yes, in G-003** | Blocks persistent tenant-owned records and migrations |
| G-004 events, queue, scheduler, jobs, outbox, retry, idempotency | Not yet defined | Remain pending | **Yes, in G-004** | Blocks durable events, jobs, webhooks, automation, and background execution |
| G-005 plugin package and isolation | Not yet defined | Remain pending | **Yes, in G-005** | Blocks executable or installable plugins |
| G-006 AI provider and data policy | Not yet defined | Remain pending | **Yes, in G-006** | Blocks production AI-agent execution |
| G-007 integrations and credentials | Not yet defined | Remain pending | **Yes, in G-007** | Blocks external provider connections |
| G-008 storage and file policy | Not yet defined | Remain pending | **Yes, in G-008** | Blocks file handling and tenant-data retention implementation |
| G-009 deployment and operations | Not yet defined | Remain pending | **Yes, in G-009** | Blocks production hosting and operational commitments |
| G-010 entitlements and app installation | Not yet defined | Remain pending | **Yes, in G-010** | Blocks application activation and marketplace governance |

## C. Non-negotiable G-001 constraints

Maintainer approval of G-001 must preserve the following requirements:

1. Business OS remains a **modular monolith** by default. Service extraction requires evidence of a distinct scaling, reliability, security, or ownership boundary.
2. **GitHub remains the source of truth** for source code, migrations, configuration templates, tests, architecture records, and operational definitions.
3. Human developers must be able to understand, build, test, and operate the repository without Manus conversation history.
4. Independent AI coding agents must be able to work from repository instructions, module documentation, source, tests, and standard commands without Manus context.
5. Manus must remain optional. No Manus SDK, runtime service, database, storage, authentication, queue, deployment service, environment variable, or conversation/session state may be required by Business OS runtime behavior.
6. Every tenant-owned datum and execution path must carry and enforce explicit organization scope.
7. Authorization remains server-side and deny-by-default. UI state, client claims, model output, events, and provider callbacks are not authority.
8. Consumers use public module contracts and cannot import private internals or write another module's data directly.
9. Forbidden dependency edges remain prohibited, including platform-to-plugin, application-to-private-application, domain-to-provider-SDK, and shared-foundation-to-implementation edges.
10. External providers remain behind replaceable adapters. Provider SDKs and credentials do not enter domain or application contracts.
11. The architecture must remain testable through unit, contract, integration, end-to-end, architecture, tenant-isolation, authorization-negative, webhook, provider-adapter, migration, and failure/idempotency tests as relevant.
12. Local development must be reproducible from a GitHub clone, documented standard dependencies, safe environment templates, and portable commands.
13. CI must run without Manus and must execute the same essential checks documented for local development.
14. Deployment must remain possible on standard infrastructure using repository-owned source, configuration, migrations, and operational documentation.
15. Microservices must not be introduced merely because the API and worker have separate process roles.
16. G-001 must not make premature database, identity, authorization, provider, storage, plugin, AI, queue, scheduler, or deployment decisions assigned to later gates.

## D. Implementation boundary after G-001 approval

G-001 approval permits only the repository runtime foundation. Approval does not mean that the Business OS product is implemented.

### Permitted after approval

The following work may begin after explicit maintainer approval of G-001:

- Repository and package foundation.
- Package manifests and export maps.
- pnpm workspace configuration and lockfile.
- Strict TypeScript configuration and project references.
- Linting and formatting configuration.
- Unit, contract, architecture, integration, and end-to-end test infrastructure without unresolved external services.
- Architecture, dependency-graph, forbidden-edge, cycle, manifest, export, and framework/provider import checks.
- Basic API and process entry-point scaffolding that contains no product behavior and no unresolved gate semantics.
- Portable developer tooling and configuration validation.
- Structured logging, safe error conventions, health checks, and graceful process shutdown.
- CI that runs without Manus.
- Documentation required to clone, install, validate, and operate the repository foundation.

These items must not create fake domain behavior or hide decisions behind placeholder abstractions.

### Prohibited until later gates

The following remain prohibited after G-001 approval:

- **Product functionality.** G-001 chooses a foundation, not a business application. Product behavior belongs after the relevant platform and application design.
- **Tenant-owned persistent data.** Organization scope and persistence enforcement depend on G-003 and must be proven against the selected database.
- **Database schemas and migrations.** G-003 must select the engine, ORM/client policy, migration framework, IDs, timestamps, transactions, indexes, and tenancy mechanism.
- **Authentication implementation.** G-002 must define identity, sessions, trust, membership, and revocation semantics.
- **Authorization implementation.** G-002 must define roles, permissions, delegation, principals, policy evaluation, and audit semantics.
- **Durable jobs and queues.** G-004 must define queue, scheduler, job envelope, retry, dead-letter, recovery, and idempotency semantics.
- **Automation runtime.** Automation depends on G-002 and G-004 action, event, principal, and reliability contracts.
- **AI runtime or model provider.** AI execution depends on G-002, G-004, and G-006 principals, execution reliability, provider, data, cost, and approval policy.
- **External integrations.** G-007 must define contracts, credentials, OAuth/API keys, webhook verification, provider selection, and callback handling.
- **Plugins.** G-005 must define manifests, compatibility, permissions, lifecycle, isolation, resource limits, secrets, and network access.
- **Production provider implementations.** Database, storage, queue, identity, messaging, email, model, and external-provider implementations belong behind later approved decisions.

## E. Required G-001 acceptance criteria

The maintainer should approve G-001 only with the following objective acceptance criteria. They are acceptance criteria for the later implementation, not claims that they currently pass.

1. A new developer can clone the repository from GitHub.
2. Dependencies can be installed with documented standard tooling and a committed lockfile.
3. Strict type checking works from the documented root command.
4. Unit, contract, architecture, and appropriate integration/end-to-end tests work from documented commands.
5. The repository build works from a clean checkout.
6. Architecture and dependency checks work from the same repository-owned command surface.
7. Forbidden dependency edges are automatically detected and fail validation.
8. Public package exports are enforced; private, deep, relative, alias-bypassing, and undeclared imports fail validation.
9. Package manifests accurately declare dependencies and ownership metadata required by the architecture.
10. No Manus dependency is required to install, type-check, test, build, or run the foundation.
11. Local development works without Manus access.
12. CI works without Manus access or Manus-specific services.
13. Documentation tells a new human developer how to install, validate, modify, test, and document the repository.
14. Documentation tells an independent AI coding agent how to inspect ownership, preserve boundaries, run checks, and stop at unresolved decisions.
15. No product or domain functionality is introduced as part of G-001.
16. No G-002 through G-009 decision is silently made by the foundation.
17. Replacing pnpm or TypeScript project-reference tooling would require changing tooling configuration, not redefining the conceptual architecture.
18. Replacing NestJS would primarily affect delivery adapters, controllers, framework wiring, composition roots, and framework-specific tests.
19. Domain and application packages remain free of NestJS, HTTP-framework, ORM/database-client, and external-provider SDK dependencies.
20. Runtime validation is present at each untrusted boundary that the foundation or first slice exposes, using a replaceable schema mechanism.

## F. Remaining gates and dependency map

The following map uses the existing G-002 through G-009 governance. G-001 must not invent substitute gates or silently close these decisions.

```text
G-001 approval
  ├── Phase 1 repository runtime foundation
  ├── G-002 identity and authorization ──┐
  ├── G-003 database and tenancy ────────┼── Platform core and persistent domain data
  └── G-004 reliable execution ──────────┘
          ├── Events and background jobs
          ├── Webhooks and automation
          └── Durable AI execution

G-006 AI provider/data policy + G-002 + G-004 ── AI execution
G-005 plugin model ───────────────────────────── Plugins
G-007 integration/credential policy + G-004 ──── Integrations and webhooks
G-008 storage policy and abstraction ──────────── Storage and files
G-009 deployment/CI/CD/operations ─────────────── Production deployment
```

| Capability | Must happen first | Reason |
|---|---|---|
| Authentication and authorization | G-001, then G-002 | The runtime foundation must exist; identity, membership, roles, permissions, delegation, and revocation must be defined before implementation |
| Database and persistence | G-001, then G-003 | Engine, migrations, IDs, timestamps, transactions, and tenant enforcement cannot be inferred safely |
| Events, jobs, and automation | G-001, G-003, then G-004 | Reliable publication must coordinate committed state with transport, retries, idempotency, and recovery |
| AI execution | G-002, G-004, and G-006 | Agents need defined principals, authorized actions, durable execution, model/data policy, budgets, and approvals |
| Plugins | G-005 | Executable extensions require manifest, compatibility, permissions, isolation, and lifecycle decisions |
| Integrations | G-007 and, for asynchronous callbacks, G-004 | Credentials, provider contracts, webhook verification, organization binding, and deduplication must be defined |
| Storage and files | G-003 and G-008 | File metadata and access need persistence and a storage/retention/export/deletion policy |
| Production deployment | G-001 foundation and G-009 | Production needs artifact, topology, CI/CD, infrastructure, observability, recovery, and incident decisions |

## G. Maintainer approval block

### G-001 Decision: PENDING MAINTAINER APPROVAL

This is the recommended approval form. It is **not an approval by this document**. The maintainer must explicitly accept the exact proposal and all conditions below before G-001 becomes accepted.

Conditions to accept:

1. Approve Node.js LTS, strict TypeScript, pnpm workspaces, TypeScript project references, NestJS at delivery/composition edges, and Vitest exactly as proposed.
2. Require package `exports` maps and declared workspace dependencies as public-contract boundaries, supplemented by CI checks for relative imports, private/deep imports, path-alias bypasses, manifests, and cycles.
3. Require zero NestJS, HTTP-framework, ORM/database-client, and external-provider SDK dependencies in domain and application/use-case packages.
4. Require `shared/` to remain dependency-light and free of business policy, repositories, ORM models, provider clients, service locators, hidden state, and implementation dependencies.
5. Require CI-enforced dependency graph, forbidden-edge, framework-import, provider-SDK, export/deep-import, cycle, manifest, and architecture checks. Compilation, Nest modules, pnpm, and project references alone are not sufficient.
6. Require replaceable runtime validation at every untrusted boundary exposed by implementation.
7. Preserve the modular monolith, public contracts, organization isolation, deny-by-default authorization, provider adapters, portability, testability, and no-premature-microservices rules.
8. Keep G-002 through G-009 pending and prohibit the G-001 foundation from silently deciding or implementing them.
9. Prohibit Manus runtime dependencies, Manus-specific environment variables, and Manus conversation/session state in Business OS.
10. Permit only the Phase 1 Repository Runtime Foundation as the next implementation task.

## H. Exact next task after approval

### Phase 1 — Repository Runtime Foundation

After explicit maintainer approval, the next task is to create the smallest portable repository foundation. It should include the approved workspace/package configuration, strict TypeScript project references, package export maps, dependency and architecture checks, formatting and linting, test infrastructure, configuration validation, basic process entry-point scaffolding, safe logging and error conventions, health/shutdown conventions, CI, and the updated developer/AI-agent guide.

The task must prove clone-to-install-to-check operation without Manus. It must contain no product behavior and no fake domain implementation.

The task must explicitly exclude product functionality, tenant-owned persistence, database schemas, migrations, authentication, authorization, queues, durable workers, automation, AI providers, integrations, plugins, production provider implementations, and any silent G-002 through G-009 decision.

## Review conclusion

No existing architectural decision is contradicted by this closure package. The package makes the pending G-001 proposal precise and defines the exact implementation boundary after approval without accepting G-001 or resolving later gates.

**G-001 remains PENDING maintainer approval.**

## References

[1]: ../AGENTS.md "Business OS Contributor Guidance"
[2]: ../README.md "Business OS Repository Overview"
[3]: G-001-READINESS-AUDIT.md "Business OS G-001 Implementation Readiness Audit and Plan"
[4]: G-001-STACK-PROPOSAL.md "Business OS G-001 Stack Proposal"
[5]: DECISIONS.md "Business OS Architecture Decisions"
[6]: ARCHITECTURE.md "Business OS Architecture"
[7]: REPOSITORY-STRUCTURE.md "Business OS Repository Structure"
[8]: DEVELOPMENT.md "Business OS Development"
[9]: DATABASE.md "Business OS Database Architecture"
[10]: MULTI-TENANCY.md "Business OS Multi-Tenancy"
[11]: PERMISSIONS.md "Business OS Permissions"
[12]: SECURITY.md "Business OS Security"
[13]: DEPLOYMENT.md "Business OS Deployment"
