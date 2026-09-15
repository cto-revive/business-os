# Business OS Repository Structure

## Purpose

This document defines the **conceptual repository boundaries** for Business OS. The structure is stack-neutral: it describes ownership and dependency direction without selecting a programming language, framework, database, queue, cloud provider, authentication provider, or deployment product.

These boundaries are established before implementation so that human engineers and AI coding agents can work from GitHub alone. A directory should be created only when it contains meaningful source code, tests, configuration, or documentation. Empty placeholder directories are intentionally not committed.

## Conceptual layout

```text
business-os/
├── AGENTS.md
├── README.md
├── LICENSE                         # Added when the project selects a license
├── .gitignore
├── .env.example
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── MULTI-TENANCY.md
│   ├── PERMISSIONS.md
│   ├── APPS.md
│   ├── PLUGINS.md
│   ├── AI-AGENTS.md
│   ├── AUTOMATION.md
│   ├── INTEGRATIONS.md
│   ├── SECURITY.md
│   ├── DEPLOYMENT.md
│   ├── DECISIONS.md
│   └── REPOSITORY-STRUCTURE.md
├── apps/
│   ├── home/
│   ├── sales/
│   ├── commerce/
│   ├── marketing/
│   ├── operations/
│   ├── finance/
│   ├── people/
│   ├── work/
│   └── service/
├── platform/
│   ├── organizations/
│   ├── identity/
│   ├── permissions/
│   ├── teams/
│   ├── tasks/
│   ├── files/
│   ├── comments/
│   ├── notifications/
│   ├── events/
│   ├── search/
│   └── audit/
├── execution/
│   ├── ai/
│   ├── automation/
│   ├── jobs/
│   ├── webhooks/
│   └── api/
├── extensions/
│   ├── plugins/
│   ├── integrations/
│   ├── templates/
│   ├── themes/
│   └── marketplace/
├── infrastructure/
│   ├── database/
│   ├── storage/
│   ├── cache/
│   ├── queue/
│   ├── email/
│   ├── messaging/
│   └── providers/
├── shared/
│   ├── contracts/
│   ├── types/
│   ├── validation/
│   ├── errors/
│   └── utilities/
├── config/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── contract/
│   └── e2e/
└── tooling/
    ├── scripts/
    └── development/
```

The names above are conceptual boundaries, not a requirement to implement every module immediately. Application directories represent future domain modules. Platform directories represent shared capabilities. Execution directories represent horizontal runtime concerns. Extension directories represent governed optional capabilities. Infrastructure directories contain replaceable implementations. Shared directories contain intentionally small cross-module contracts and utilities. Tests and tooling remain repository-owned and portable.

## Boundary ownership

| Boundary | Ownership and purpose |
|---|---|
| `apps/` | Major business capabilities such as Home, Sales & CRM, Commerce, Marketing & Growth, Operations, Finance, People, Work, and Service. Each application owns its domain rules and private data boundary. |
| `platform/` | Organization context, identity linkage, permissions, teams, tasks, files, comments, notifications, events, search, and audit. These are shared platform capabilities and must not be duplicated by applications. |
| `execution/` | Horizontal execution concerns, including AI agents, automation, jobs, webhooks, and API delivery. These invoke published contracts and preserve actor, organization, permission, and audit context. |
| `extensions/` | Plugins, integrations, templates, themes, and marketplace capabilities. These use documented extension points and cannot modify core source code. |
| `infrastructure/` | Database, storage, cache, queue, email, messaging, and external-provider implementations behind interfaces or contracts owned by the appropriate modules. |
| `shared/` | Small, stable contracts, types, validation, errors, and utilities that genuinely cross module boundaries. Shared must not become a dumping ground for domain logic. |
| `config/` | Portable configuration templates and non-secret configuration definitions. Secrets are supplied by the runtime and never committed. |
| `tests/` | Unit, integration, contract, and end-to-end verification. Tests must include organization-isolation and authorization-negative cases when relevant. |
| `tooling/` | Repository-owned scripts and development tooling that can be understood and run outside Manus. |
| `docs/` | Architecture, operational, security, and decision documentation required for independent development and operation. |

## Dependency direction

The conceptual dependency direction is:

```text
apps
  ↓
platform public contracts
  ↓
shared contracts

execution
  ↓
platform + application public contracts

extensions
  ↓
published contracts

infrastructure
  ↓
interfaces/contracts defined by the appropriate modules
```

The arrows describe allowed consumption of published contracts, not direct access to private implementation details. Platform must not depend on applications or optional plugins. One application must not depend on another application's private internals or mutate its private records. Domain modules must not call provider SDKs directly. Infrastructure implementations depend on interfaces or contracts owned by the module that needs the capability.

## Module ownership rules

A module owns its domain rules, public commands and queries, private data boundary, migrations when implementation begins, permissions, emitted and consumed events, and audit behavior. Collaboration occurs through documented public contracts, shared event conventions, registered actions, and authorized extension points.

Every tenant-owned record and execution path must carry organization context. Applications use platform identity, membership, teams, permissions, tasks, files, comments, notifications, events, search, and audit services rather than creating parallel systems. AI agents, automation, plugins, integrations, and background jobs use named principals, scoped authorization, and auditable actions.

## Portability and Manus independence

The repository must remain understandable and runnable by human engineers, AI coding agents, and other development environments that can clone GitHub. Required behavior must be represented in repository source, standard configuration, documented external infrastructure, or a portable provider abstraction.

Business OS must not require Manus APIs, Manus runtime services, Manus-only databases, storage, authentication, queues, deployment mechanisms, environment variables, or application state. If Manus is used for development, preview, or hosting convenience, the integration must be isolated behind a tooling or explicit infrastructure-adapter boundary. Domain and business modules must never import Manus-specific SDKs.

A future developer should be able to clone the repository, install the selected standard dependencies, configure documented environment variables, run the documented development commands, and deploy to standard infrastructure without access to Manus. The final commands and environment requirements will be documented when the implementation stack is selected.

## Implementation rules

Do not create application code, database tables, migrations, or provider-specific infrastructure as part of establishing this conceptual structure. Do not add empty directories merely to represent the tree. When a module is ready for implementation, add its directory with meaningful source, tests, contracts, and documentation, and update the relevant architecture decision and module documentation.

## References

[1]: ARCHITECTURE.md "Business OS Architecture"
[2]: DEPLOYMENT.md "Business OS Deployment"
[3]: DECISIONS.md "Business OS Architecture Decisions"
[4]: MULTI-TENANCY.md "Business OS Multi-Tenancy"
[5]: PERMISSIONS.md "Business OS Permissions"
