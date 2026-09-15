# Business OS Security

## Security objective

Business OS must protect the confidentiality, integrity, and availability of organization data and platform operations. Security is implemented through multiple controls: tenant isolation, trustworthy identity and session handling, authorization, secure configuration, data protection, auditability, dependency management, resilient operations, and incident response. No single control substitutes for another.

This document establishes the baseline direction. It does not certify compliance, choose an identity provider, or define a final control framework. Those selections require explicit implementation decisions and risk assessment.

## Required control domains

| Domain | Baseline requirement |
|---|---|
| Tenant isolation | Enforce organization scope on every tenant-owned access path, including jobs, files, search, caches, integrations, automation, and AI tools |
| Authentication | Use a standards-based, secure identity and session design; do not store plaintext credentials or trust unverified client claims |
| Authorization | Apply server-side, organization-scoped, deny-by-default permission decisions to sensitive reads and all state changes |
| Secrets | Keep secrets out of Git; supply them through protected runtime configuration and rotate them through documented operations |
| Data protection | Encrypt data in transit and use appropriate encryption at rest, access controls, and minimization for sensitive data |
| Auditability | Record privileged changes, sensitive access, external side effects, authorization-relevant actions, and agent or automation activity |
| Provider security | Isolate provider credentials behind adapters and validate webhook authenticity before processing |
| Supply chain | Pin, review, scan, and update dependencies; preserve a traceable build and deployment process |
| Resilience | Back up data, test restoration, protect against abusive traffic, and document incident recovery procedures |

## Identity, authorization, and audit

Identity establishes who or what is acting. Authorization decides which action is permitted in which organization. Audit records explain material activity after the fact. These functions are related but separate. A successful login does not grant access to every organization; a permission grant does not eliminate the need for an audit record; and an audit record does not repair an unauthorized action.

High-risk operations require stronger safeguards. Examples include administrative role changes, credential connection or revocation, data export, tenant deletion, broad automation enablement, external communications, and AI-agent actions with material side effects. The exact approval and separation-of-duty policies are unresolved, but each operation must be classifiable before production use.

## Secure development and operations

Every change should receive peer review appropriate to its risk, automated validation, and documentation updates where it affects a public or architectural contract. Security-sensitive logic requires negative tests, including cross-organization access attempts and permission-denial cases. Dependencies and infrastructure configuration should be reviewed for known vulnerabilities and unsafe defaults.

Logs and diagnostics must be useful without becoming a tenant-data leak. Do not place secrets, access tokens, credentials, or unnecessary personally identifiable information in logs. Production access must be limited, monitored, and revocable. Operational runbooks, backup restoration tests, and incident procedures must be source-controlled where safe to do so.

## AI, automation, and extensions

AI agents, automation, plugins, and integrations introduce execution paths that may act without a current human session. They must use named principals, least privilege, organization context, rate or budget limits where appropriate, input validation, and audit logging. They must not bypass core authorization or treat a model output, event, or provider callback as inherently trusted.

## References

[1]: MULTI-TENANCY.md "Business OS Multi-Tenancy"
[2]: PERMISSIONS.md "Business OS Permissions"
[3]: AI-AGENTS.md "Business OS AI Agents"
[4]: PLUGINS.md "Business OS Plugins"
[5]: INTEGRATIONS.md "Business OS Integrations"
[6]: DEPLOYMENT.md "Business OS Deployment"
[7]: DECISIONS.md "Business OS Architecture Decisions"
