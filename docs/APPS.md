# Business OS Applications

## Definition

An **application** adds a major business capability to Business OS. Applications are domain modules, not independent tenant systems. They use the platform's organization context, identity linkage, teams, authorization, tasks, files, comments, notifications, events, search, audit logs, integrations, automation, and AI-agent controls.

Applications have strong domain boundaries. A domain module owns its business objects, rules, published actions, events, permissions, migrations, and user-facing surfaces. It must use public contracts to collaborate with another module and must not directly mutate another application's private data.

## Product map and lifecycle

| Application or area | Initial lifecycle | Boundary statement |
|---|---:|---|
| Business OS Home | ALPHA | Protected local-development workspace Home slice; production authentication remains deferred |
| Sales & CRM | PLANNED | Customer relationship and revenue workflows; does not own communication channels |
| Commerce | PLANNED | Commercial transactions and catalog-related workflows |
| Marketing & Growth | PLANNED | Audience, campaign, and growth workflows |
| Operations | PLANNED | Operational planning and execution |
| Finance | PLANNED | Financial operations, reporting, and controls |
| People | PLANNED | Workforce and people operations |
| Work | PLANNED | Shared work-management domain capabilities |
| Service | PLANNED | Customer and internal service workflows |
| AI, Automation, Build, Marketplace, Admin | PLANNED | Cross-product and governance capabilities defined in separate architecture documents |

The allowed lifecycle states are **PLANNED**, **SCAFFOLDED**, **ALPHA**, **BETA**, **ACTIVE**, and **DEPRECATED**. A state communicates maturity, support expectations, and release governance. It does not override feature flags, subscriptions, permissions, security controls, or data-retention obligations.

## Installation and activation

An organization should be able to install or activate applications according to its entitlement and administrative permissions. Installation configures an organization's use of a module; it does not create a second identity system or an unmanaged copy of platform capabilities. Application activation may expose navigation, object types, actions, templates, automation triggers, and integration capabilities only when their contracts are ready.

The future application manifest must declare the module identifier, lifecycle state, dependencies, organization eligibility, registered permissions, object types, actions, events, configuration requirements, and migration ownership. This is a contract requirement, not a prescribed file format.

## Shared-service obligations

Tasks are a core Business OS service. An application may create or relate tasks to its domain objects but must not create a separate task system. The same rule applies to files, comments, notifications, events, search, and audit logs. Domain-specific information may enrich a shared capability through published metadata or extensions, subject to authorization and organization isolation.

WhatsApp and other external communication providers are integrations or channels. They do not become part of the Sales & CRM application's core model merely because a sales workflow uses them.

## Change and deprecation discipline

A new application or material change must document its domain boundary, ownership, public contracts, tenant model, permissions, shared-service use, migration plan, events, automation surface, AI-tool surface, integration needs, audit behavior, lifecycle state, and deprecation plan. A deprecated application remains responsible for secure access, retained data, exports, and migration paths until its documented end-of-life process completes.

## References

[1]: ARCHITECTURE.md "Business OS Architecture"
[2]: PERMISSIONS.md "Business OS Permissions"
[3]: PLUGINS.md "Business OS Plugins"
[4]: INTEGRATIONS.md "Business OS Integrations"
[5]: DECISIONS.md "Business OS Architecture Decisions"
