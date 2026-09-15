# Business OS Permissions

## Authorization is a platform capability

Authorization is shared infrastructure, not an application-specific feature. It determines whether a principal may perform an action on an object within an organization. Applications, plugins, integrations, automation, background workers, and AI agents must use the same authorization contracts and must not invent parallel permission systems.

The default posture is **deny by default**. A successful interface response or a hidden button never proves authorization. Each state-changing action and sensitive read must be authorized at a trusted server-side boundary.

## Authorization context

A permission decision evaluates a scoped context that includes the organization, principal, membership or service credential, effective roles, teams where relevant, requested action, target object, and policy attributes. The context must be created from trusted identity and organization data. Client-supplied role or organization claims must be verified before use.

| Concept | Role in the model |
|---|---|
| Principal | A human user, service account, integration identity, automation actor, or AI agent |
| Organization membership | Binds a human identity to an organization and its available access context |
| Team | An organization-scoped group used for delegation or policy assignment |
| Role | A named bundle of permissions within an organization or platform scope |
| Permission | A stable capability to perform an action on a resource class |
| Grant or policy | A scoped rule that makes a permission effective for a principal |
| Action | A registered operation that is independently authorized and auditable |

## Policy model

The expected foundation is role-based access control with scoped grants. Roles make common responsibilities manageable, while scopes restrict a grant to an organization, application, object, team, record relationship, or other documented boundary. Attribute-based conditions may be added for cases such as ownership, region, classification, or workflow state, but they must not make routine permission evaluation opaque.

The detailed permission naming convention, built-in administrative roles, delegation model, and policy expression format remain unresolved. They must be selected before implementation and recorded in [`DECISIONS.md`](DECISIONS.md). The selection must support least privilege, explainable decisions, revocation, and auditability.

## Application and extension rules

Applications register the permissions required by their published actions and may define domain-specific permissions. They do not own user identity, memberships, role evaluation, or audit policy. Plugins may request only declared permissions and receive access only through approved APIs or tools. Integrations use organization-bound service credentials with the minimum scopes needed. A plugin or integration must never inherit an administrator's unrestricted session implicitly.

AI agents are principals with narrowly defined tool permissions. An agent tool invocation is authorized as an action in the active organization, records the agent identity and delegated authority, and can require human approval where policy demands it. Automation follows the same rules.

## Administrative safeguards and auditing

High-impact access changes require explicit administrative authorization, event logging, and an auditable actor record. Permission changes must take effect predictably across active sessions, jobs, API tokens, integration credentials, and agent delegations. Emergency access, impersonation, break-glass administration, and service-account governance are unresolved and must be designed before privileged operations are introduced.

Every authorization decision that changes state, grants access, revokes access, or invokes an external side effect must produce audit data sufficient to explain who or what acted, in which organization, under which permission or policy, and with what outcome.

## References

[1]: ARCHITECTURE.md "Business OS Architecture"
[2]: MULTI-TENANCY.md "Business OS Multi-Tenancy"
[3]: AI-AGENTS.md "Business OS AI Agents"
[4]: SECURITY.md "Business OS Security"
[5]: DECISIONS.md "Business OS Architecture Decisions"
