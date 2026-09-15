# Business OS AI Agents

## AI is horizontal

AI is a horizontal Business OS capability. It does not belong to one business application. Applications may expose governed domain actions and information through registered contracts, while the AI platform manages agent identity, model-provider access, tool registration, authorization, policy enforcement, execution records, and observability.

An **AI agent** is an organization-scoped or platform-governed worker that can reason over authorized context and invoke registered tools. It is not an unrestricted user impersonation mechanism. An agent receives only the permissions, data scope, execution budget, and side-effect authority granted for its purpose.

## Governed execution

Every agent must have a declared identity, owner, purpose, lifecycle state, tool allowlist, permission scope, configuration, model-provider policy, budget or rate limits, and audit policy. A tool is a registered action with typed inputs, outputs, authorization requirements, side-effect classification, timeout or retry behavior, and audit requirements.

| Execution stage | Required control |
|---|---|
| Context assembly | Restrict retrieved data to the active organization and authorized scope |
| Planning | Preserve the agent identity, request origin, and policy constraints |
| Tool selection | Permit only registered and allowlisted tools |
| Authorization | Evaluate organization-scoped permissions for every tool invocation |
| Sensitive side effect | Apply approval, separation-of-duty, or other policy where required |
| Result handling | Record outcome, affected resources, errors, and external references in audit data |

Agents must use the same organization isolation and permission rules as interactive users, integrations, and automation. A model response alone is never authority to mutate data, communicate externally, or spend resources. The registered tool boundary is the point at which the system validates inputs, authorizes the action, performs the work, and records the outcome.

## Provider and data boundaries

Model providers are external dependencies and must be accessed through an adapter interface. The final provider, model-selection policy, retention policy, prompt handling, retrieval architecture, content-safety controls, and cost controls are unresolved. They must be selected in a way that protects organization data, permits provider replacement, and makes data flow understandable to administrators.

Agent prompts, retrieved data, tool inputs, outputs, and traces may contain sensitive tenant information. Their retention, redaction, export, deletion, and access controls must be designed with the security and data-lifecycle policies before production agent execution begins.

## Human oversight and auditability

The platform must support human review or approval for actions that are externally consequential, privileged, financially material, legally sensitive, destructive, or otherwise designated by policy. Automation may initiate an agent, but it does not eliminate the approval requirement. Agent activity must be attributable to the agent, its owner, its originating trigger or user, its organization, each invoked tool, and the resulting action.

## References

[1]: ARCHITECTURE.md "Business OS Architecture"
[2]: PERMISSIONS.md "Business OS Permissions"
[3]: MULTI-TENANCY.md "Business OS Multi-Tenancy"
[4]: AUTOMATION.md "Business OS Automation"
[5]: SECURITY.md "Business OS Security"
[6]: DECISIONS.md "Business OS Architecture Decisions"
