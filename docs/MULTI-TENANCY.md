# Business OS Multi-Tenancy

## Tenant model

An **organization** is the primary tenant boundary in Business OS. It represents one company or other independently administered business entity. Each organization has an isolated workspace, its own memberships, teams, roles, installed applications, configurations, integrations, automations, agents, and tenant-owned business records.

A human identity may be a member of more than one organization. Membership, rather than identity alone, establishes the organization context and the permissions available in that context. Users do not belong to individual applications; applications receive an already-scoped membership and authorization context from the platform.

## Organization context

Every interactive request, API call, webhook, scheduled execution, background job, integration callback, and AI-agent action must establish an explicit organization context before accessing organization-owned resources. The context must include at least the organization, authenticated or service principal, applicable membership or credential, and authorization scope. It must not be inferred from a mutable client-side value alone.

A user who can switch organizations must receive a fresh authorization context for the selected organization. No active session, cache, queue message, or connection pool may carry permissions from one organization into another.

## Isolation controls

Organization isolation is a layered requirement. The application layer restricts commands and queries to the active organization. The persistence layer verifies organization scope. Asynchronous work preserves that scope in its message contract. Search, files, caches, analytics, exports, and audit records use namespacing that includes the organization. Observability must support diagnosis without exposing another tenant's business data.

| Surface | Required control |
|---|---|
| Interactive and API requests | Establish organization context before authorization and data access |
| Database access | Apply verifiable organization scope to every tenant-owned query and relationship |
| Jobs and events | Include organization context and validate it before execution |
| Files and storage | Namespace objects and metadata by organization; authorize retrieval separately |
| Search and cache | Use organization-qualified indexes and keys; prevent cross-tenant cache reuse |
| Integrations and webhooks | Bind credentials and callbacks to one organization or a documented shared policy |
| AI agents and automation | Pass organization scope to every tool invocation and audit the result |

## Shared and platform-global data

Platform-global configuration, public product metadata, and service-level operational records may exist outside an organization only when they are explicitly identified as global and do not contain tenant business data. A record that can reveal, affect, or be acted upon for one organization should normally be organization-owned.

Cross-organization sharing is prohibited by default. If a future feature requires it, the design must name the sharing relationship, consent model, authorization semantics, audit behavior, export behavior, and revocation process. Such a feature requires a recorded decision before implementation.

## Tenant lifecycle

Organization provisioning must create the minimum platform context needed to operate a workspace without copying application schemas or hidden configuration. Organization suspension, deletion, export, restoration, membership changes, and transfer of administrative control require documented workflows and audit records. The final retention schedule is not yet selected.

## Verification expectations

Every module must test that a principal authorized in Organization A cannot read, mutate, search, download, trigger, or infer tenant-owned data in Organization B. Testing must cover ordinary requests, administrative flows, jobs, events, file access, caches, search, integration callbacks, automation, and AI tools.

## References

[1]: ARCHITECTURE.md "Business OS Architecture"
[2]: DATABASE.md "Business OS Database Architecture"
[3]: PERMISSIONS.md "Business OS Permissions"
[4]: SECURITY.md "Business OS Security"
