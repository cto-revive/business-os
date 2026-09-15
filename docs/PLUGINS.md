# Business OS Plugins

## Definition and boundary

A **plugin** extends an existing Business OS capability through documented extension points. It is not an application replacement, an unrestricted code injection mechanism, or a way to modify core source code. Plugins add optional behavior; Business OS Core and its essential applications must remain operable when every optional plugin is absent.

Plugins use documented APIs, registered actions, events, permissions, UI extension points, and configuration contracts. They do not import private module internals, write directly to another module's data store, bypass authorization, or create hidden organization-scoped state outside the platform's isolation and audit model.

## Supported extension categories

The plugin platform may ultimately support UI contributions, custom object enrichments, registered actions, event subscribers, automation steps, integration adapters, agent tools, templates, and themes. Each extension category must define its capability limits, input and output contracts, organization scope, permission requirement, lifecycle, versioning rule, error behavior, and audit behavior before it becomes public.

An extension point is not an implicit permission grant. The host module retains ownership of its data and policies. It decides which extension points are available, while organization administrators decide which eligible plugin versions are installed and enabled in their organization.

## Plugin contract

A future plugin manifest must declare a stable identifier, publisher identity, compatible platform and host-module versions, requested permissions, declared extension points, configuration schema, event subscriptions, external network or provider requirements, data ownership, and support lifecycle. This requirement does not select the manifest format or package mechanism.

Plugin actions and callbacks execute with a distinct plugin identity. If they act on behalf of a user, automation, integration, or AI agent, the delegation must be explicit, scoped, and included in audit records. Plugin failures must not silently compromise core data integrity or authorization.

## Governance and safety

Plugins require a controlled discovery, review, versioning, enablement, upgrade, disablement, and removal process. Organizations need visibility into requested permissions, data access, provider connections, and operational impact before enabling a plugin. The Marketplace may distribute plugins in the future, but distribution does not waive compatibility or security controls.

The runtime isolation model is intentionally unresolved. The project must decide whether plugins execute in-process, in a sandboxed worker, as remote extensions, or through another mechanism before executable plugins are supported. The decision must address dependency containment, resource limits, secrets, network access, upgrade safety, observability, and tenant isolation.

## References

[1]: ARCHITECTURE.md "Business OS Architecture"
[2]: APPS.md "Business OS Applications"
[3]: PERMISSIONS.md "Business OS Permissions"
[4]: SECURITY.md "Business OS Security"
[5]: DECISIONS.md "Business OS Architecture Decisions"
