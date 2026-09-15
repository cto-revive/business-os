# Business OS Integrations

## Integration Hub

The **Integration Hub** connects Business OS to external systems through provider adapters and documented contracts. An integration is not a business application and does not become part of an application's private core model. It provides a controlled connection to an external provider, such as a communications channel, accounting system, payment service, storage provider, or model provider.

WhatsApp is a communication integration or channel. Sales & CRM or another application may use its capabilities through the Integration Hub, but no application owns WhatsApp as an internal subsystem. This rule prevents domain modules from becoming coupled to a provider's data model, credentials, and delivery behavior.

## Adapter boundary

A provider adapter translates a stable Business OS contract into a provider-specific API, webhook, authentication mechanism, or data format. Domain rules depend on the stable contract rather than on a provider SDK. The adapter owns provider credentials, request mapping, callback validation, error classification, rate-limit behavior, observability, and provider-specific retries.

| Contract layer | Responsibility |
|---|---|
| Application or platform capability | Defines the provider-neutral business intent and consumes the result |
| Integration Hub contract | Defines validated commands, queries, events, statuses, and error categories |
| Provider adapter | Implements the contract for a specific external provider |
| Credential and secret boundary | Stores and accesses organization-bound credentials with least privilege |
| Webhook boundary | Verifies origin, resolves organization context, deduplicates, and publishes internal events |

Adapters must not expose a provider's proprietary abstractions throughout the domain model unless a documented domain need makes the concept intrinsic. A provider replacement should require work at the adapter boundary rather than a rewrite across business applications.

## Organization scope and credentials

Integration installations, OAuth grants, API keys, webhook secrets, and service credentials are organization-scoped by default. They must be encrypted and accessed only through authorized runtime components. The system must identify which organization owns a callback before tenant data is accessed or an event is emitted.

A shared platform integration requires an explicit decision that specifies its permitted scope, data handling, billing or quota ownership, audit behavior, and separation from tenant-owned data. No integration receives broad access merely because it was installed by an administrator.

## Reliability and data protection

Provider requests and callbacks must account for retries, duplicate deliveries, delayed events, partial failures, rate limits, provider outages, and API version changes. The Integration Hub must provide a consistent way to classify outcomes, surface health, reconcile state, and avoid duplicating external side effects. Sensitive data should be minimized, redacted from logs where appropriate, and retained only under documented policy.

Provider selection, contract versioning, credential storage technology, webhook-signature policy, and the initial integration set are unresolved. The future implementation must remain portable and must keep configuration in environment variables or secure runtime configuration, never in committed secrets or hidden builder-only settings.

## References

[1]: ARCHITECTURE.md "Business OS Architecture"
[2]: MULTI-TENANCY.md "Business OS Multi-Tenancy"
[3]: SECURITY.md "Business OS Security"
[4]: AUTOMATION.md "Business OS Automation"
[5]: DECISIONS.md "Business OS Architecture Decisions"
