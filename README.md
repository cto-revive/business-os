# Business OS

**Business OS** is an AI-native, modular, multi-tenant SaaS platform. Each company operates in an isolated organization workspace and can adopt Business OS applications, plugins, integrations, AI agents, templates, and themes as its needs evolve.

> **Current status: G-003 persistence foundation implementation.** G-001, G-002, and G-003 are closed. This phase adds only the portable G-003 persistence foundation; it contains no authentication provider, product application, durable execution, AI, integrations, plugins, or Manus-specific runtime dependency.

## Product direction

Business OS will be organized around a shared platform core, domain-focused business applications, and governed extension mechanisms. The complete product map is represented from the start so that future work is deliberate rather than additive by accident.

| Product area       | Initial status | Responsibility                                |
| ------------------ | -------------: | --------------------------------------------- |
| Business OS Home   |        PLANNED | Central organization workspace and navigation |
| Sales & CRM        |        PLANNED | Customer and revenue relationship workflows   |
| Commerce           |        PLANNED | Commercial transactions and catalog workflows |
| Marketing & Growth |        PLANNED | Audience, campaign, and growth workflows      |
| Operations         |        PLANNED | Operational planning and execution            |
| Finance            |        PLANNED | Financial operations and controls             |
| People             |        PLANNED | Workforce and people operations               |
| Work               |        PLANNED | Shared work-management capabilities           |
| Service            |        PLANNED | Customer and internal service workflows       |
| AI                 |        PLANNED | Horizontal agents, tools, and model access    |
| Automation         |        PLANNED | Shared event-driven automation capabilities   |
| Build              |        PLANNED | Governed configuration and composition tools  |
| Marketplace        |        PLANNED | Discovery and distribution of extensions      |
| Admin              |        PLANNED | Organization and platform administration      |

Application lifecycle states are **PLANNED**, **SCAFFOLDED**, **ALPHA**, **BETA**, **ACTIVE**, and **DEPRECATED**. Lifecycle state is a product-governance signal; it is not a substitute for authorization, entitlement, or release controls.

## Architecture commitments

Business OS begins as a **modular monolith**. Its modules will have explicit dependency boundaries so that a component can be extracted later only when scale, reliability, or organizational ownership justifies it. The platform core owns organization membership, authorization, tasks, files, comments, notifications, events, search, and auditability. Applications consume those shared capabilities rather than recreating them.

Every tenant-owned record must be scoped to an organization. AI agents act only through registered tools, permission checks, and auditable actions. Automation uses shared events, triggers, conditions, and actions. External systems are reached through provider adapters. Plugins use documented interfaces and must not modify core source code.

## Repository layout

| Path                                                               | Purpose                                                      |
| ------------------------------------------------------------------ | ------------------------------------------------------------ |
| [`AGENTS.md`](AGENTS.md)                                           | Binding contributor guidance and implementation guardrails   |
| [`docs/REPOSITORY-STRUCTURE.md`](docs/REPOSITORY-STRUCTURE.md)     | Stack-neutral repository boundaries and dependency direction |
| [`docs/IMPLEMENTATION-STATUS.md`](docs/IMPLEMENTATION-STATUS.md)   | Honest implementation inventory, gaps, risks, and phases     |
| [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)                       | Stack-neutral developer and AI-agent workflow requirements   |
| [`docs/G-001-STACK-PROPOSAL.md`](docs/G-001-STACK-PROPOSAL.md)     | Approved G-001 stack and Phase 1 conditions                  |
| [`docs/G-001-DECISION-CLOSURE.md`](docs/G-001-DECISION-CLOSURE.md) | G-001 approval conditions and implementation boundary        |
| [`docs/G-002-DECISION-CLOSURE.md`](docs/G-002-DECISION-CLOSURE.md) | Approved G-002 identity and authorization contract           |
| [`docs/G-003-DECISION-CLOSURE.md`](docs/G-003-DECISION-CLOSURE.md) | Approved G-003 database, persistence, and tenancy contract   |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)                     | Modular-monolith boundaries and dependency rules             |
| [`docs/DATABASE.md`](docs/DATABASE.md)                             | Data architecture and migration principles                   |
| [`docs/MULTI-TENANCY.md`](docs/MULTI-TENANCY.md)                   | Organization isolation model                                 |
| [`docs/PERMISSIONS.md`](docs/PERMISSIONS.md)                       | Shared authorization model                                   |
| [`docs/APPS.md`](docs/APPS.md)                                     | Application structure and lifecycle                          |
| [`docs/PLUGINS.md`](docs/PLUGINS.md)                               | Plugin extension contract                                    |
| [`docs/AI-AGENTS.md`](docs/AI-AGENTS.md)                           | Governed AI-agent architecture                               |
| [`docs/AUTOMATION.md`](docs/AUTOMATION.md)                         | Shared automation architecture                               |
| [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md)                     | Integration-hub and adapter principles                       |
| [`docs/SECURITY.md`](docs/SECURITY.md)                             | Security baseline and control model                          |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)                         | Portable deployment expectations                             |
| [`docs/DECISIONS.md`](docs/DECISIONS.md)                           | Decision record and implementation gates                     |

## Portability commitment

GitHub is the authoritative source of truth for source code, database migrations, configuration templates, tests, and architecture documentation. The eventual system must run from this repository, environment variables, a database, and standard infrastructure. Manus may be used for development, previews, or initial hosting, but it must never be a required runtime dependency without an explicit architecture decision.

The conceptual repository boundaries, module ownership rules, and dependency direction are defined in [`docs/REPOSITORY-STRUCTURE.md`](docs/REPOSITORY-STRUCTURE.md). They are intentionally stack-neutral and do not require every future directory to exist before meaningful implementation begins.

## Implementation gate

Before product implementation begins, future work must preserve the architectural boundaries documented here and resolve the relevant implementation gates in [`docs/DECISIONS.md`](docs/DECISIONS.md). G-001 through G-003 are closed; G-004 through G-010 remain pending.

G-001 is closed for the repository runtime foundation. G-002 is approved as the identity and authorization contract. G-003 is approved for its persistence foundation only; it does not authorize authentication providers, product modules, G-004, or any later gate.

## References

[1]: docs/ARCHITECTURE.md 'Business OS Architecture'
[2]: docs/DECISIONS.md 'Business OS Architecture Decisions'
[3]: docs/REPOSITORY-STRUCTURE.md 'Business OS Repository Structure'
[4]: docs/G-001-STACK-PROPOSAL.md 'Business OS G-001 Stack Proposal'
