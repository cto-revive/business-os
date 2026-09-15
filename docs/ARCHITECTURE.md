# Business OS Architecture

## Architectural position

Business OS will start as a **modular monolith**. A single deployable application may host the web experience, public API, domain modules, background-worker entry points, and extension contracts, while each area remains separated by explicit module interfaces. This approach reduces distributed-systems overhead during early product development without treating the codebase as an unbounded monolith.

A future service extraction is justified only when there is evidence of a distinct scaling profile, reliability boundary, security boundary, or independent ownership need. Extraction must preserve the public contracts defined by the originating module. No module should assume that physical deployment location is its architectural identity.

## System composition

| Layer | Owned concerns | Dependency rule |
|---|---|---|
| Experience surfaces | Organization workspace, administration, app surfaces, API clients, and future portals | Depend on public application and platform contracts only |
| Platform core | Organization context, identity linkage, membership, teams, authorization, tasks, files, comments, notifications, events, search, audit logs, and shared object conventions | Does not depend on optional apps or plugins |
| Business applications | Sales & CRM, Commerce, Marketing & Growth, Operations, Finance, People, Work, and Service | Depend on platform contracts and published app contracts only |
| Horizontal execution | AI agents, automation, background work, webhooks, and public API orchestration | Invoke registered actions through authorization and audit controls |
| Extension boundary | Plugins, integrations, templates, themes, Builder, and Marketplace | Use documented APIs, events, permissions, and extension points |
| Infrastructure adapters | Database access, object storage, email, messaging, model providers, queues, and external providers | Are selected behind stable interfaces and configuration |

## Module boundaries

A module owns its domain rules, data access through its designated boundary, public commands, queries, events, permissions, and migrations. A consumer can call a published contract but cannot depend on private internals or write another module's records directly. Shared concepts should be kept deliberately small and stable.

The platform core owns the concepts that must be common across the product. Applications own domain-specific policies and business objects. An application may register domain objects, actions, and events, but it may not redefine the platform's organization, user, membership, task, file, comment, notification, search, or audit systems.

> **Common contract vocabulary:** an **object** is a typed business resource; an **event** is an immutable statement that something occurred; an **action** is an authorized command that changes state or invokes work.

Objects, events, and actions must carry enough organization and actor context to support isolation, permission evaluation, auditability, automation, and integrations. Their exact technical representation remains an implementation decision.

## Dependency direction

Dependencies point inward toward published platform contracts. Experience surfaces depend on public application APIs. Applications depend on platform contracts. Plugins and integrations depend on extension contracts. Infrastructure implementations depend on interfaces owned by the modules that use them; business rules do not depend directly on provider SDKs.

The following dependencies are prohibited: platform core depending on an optional plugin; one application directly mutating another application's private data; a plugin modifying core source; an application owning a duplicate identity or authorization system; and a provider-specific API being invoked from domain logic without an adapter boundary.

## Shared execution model

AI agents and automation are horizontal execution capabilities rather than individual applications. They must invoke registered actions or tools, receive an organization-scoped authorization context, emit auditable records, and follow the same policy controls as interactive users. Background processing and webhooks are delivery mechanisms for these actions, not exceptions to the architecture.

The Integration Hub owns provider-adapter conventions. WhatsApp, for example, is a communication channel integration and not a CRM subsystem. Any application that needs a channel uses its published capability rather than assuming ownership of the provider.

## Future deployment shape

The intended long-term shape can include multiple frontends or portals, a public API, webhook receivers, worker processes, and a marketplace. These components may be deployed independently later, but they should initially be source-controlled parts of the modular monolith and use the same public contracts. No final framework, database engine, queue, or cloud provider is selected by this document.

## Architecture acceptance criteria

A proposed implementation is consistent with this architecture only if it enforces organization isolation, uses shared platform capabilities, maintains documented module contracts, records database evolution as repository migrations, keeps provider dependencies behind adapters, and can run without Manus-specific runtime services. Any exception requires an explicit decision record.

## References

[1]: ../README.md "Business OS Repository Overview"
[2]: MULTI-TENANCY.md "Business OS Multi-Tenancy"
[3]: PERMISSIONS.md "Business OS Permissions"
[4]: DECISIONS.md "Business OS Architecture Decisions"
