# G-002 Identity and Authorization Decision Closure

## 1. Status

**Status: APPROVED — GOVERNANCE CLOSED.**

This document is the approved implementation-ready specification for G-002. It closes the identity, authentication, session, membership, principal, authorization, delegation, revocation, and audit decisions needed before authentication or authorization implementation begins. It does not implement any of them.

G-001 is closed. The Phase 1 repository foundation remains unchanged. The current packages expose only shared contracts, validation, runtime configuration, and delivery-edge startup. No identity, session, membership, role, permission, credential, or authorization runtime exists.

The proposal deliberately selects provider-neutral contracts rather than an authentication vendor or SDK. Provider implementations remain replaceable. Database, migrations, persistence, transaction, and tenancy-enforcement mechanisms remain G-003 decisions. Integration credentials and external-provider credential handling remain G-007 decisions. Storage, retention, production operations, AI execution, automation, plugins, and entitlements remain governed by their existing gates.

## 2. Scope

G-002 defines the trusted identity and authorization model that every future interactive and non-interactive execution path must use. It covers:

- Human identity and organization membership.
- Organization context and workspace switching.
- Authentication and external identity linkage.
- Sessions and token transport.
- Roles, permissions, resources, actions, and scopes.
- Human, service, integration, automation, and AI-agent principals.
- Delegation and approval boundaries.
- Impersonation and break-glass policy.
- Separation of duties.
- Credential and revocation contracts.
- Authorization failure semantics.
- Audit requirements.
- Threats, tests, and acceptance criteria.

The decision applies to the modular monolith and to any future extracted service. Physical deployment location must not change principal, organization, authorization, or audit semantics.

## 3. Non-goals

G-002 does not implement or select:

- A database engine, ORM, migration framework, table schema, or tenancy enforcement mechanism. These belong to G-003.
- A queue, scheduler, durable job system, event bus, outbox, retry policy, or automation runtime. These belong to G-004.
- A plugin runtime or plugin credential/isolation model. These belong to G-005.
- A model provider, retrieval system, AI data-retention policy, or AI runtime. These belong to G-006.
- External integration contracts, OAuth/API-key policy for business integrations, provider callbacks, or integration credential storage. These belong to G-007.
- File storage, retention, export, deletion, or restoration implementation. These belong to G-008.
- Production deployment, infrastructure, CI/CD promotion, observability, or incident operations. These belong to G-009.
- Application entitlements, installation, templates, themes, or marketplace governance. These belong to G-010.
- UI implementation, API controllers, database schemas, migrations, production credentials, or provider SDKs.

No part of this document authorizes runtime implementation. It is a decision package for maintainer approval.

## 4. Decision summary

The proposed G-002 model is summarized below.

| Area                     | Proposed decision                                                                                                                                   | Status                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Human identity           | One globally unique Business OS user identity, separate from organization membership                                                                | Proposed; maintainer approval required                   |
| Organization             | Globally unique tenant/workspace owned by the platform                                                                                              | Established by ADR-002; G-002 specifies access semantics |
| Membership               | Explicit organization-scoped relationship with lifecycle, status, role assignments, and authorization epoch                                         | Proposed; maintainer approval required                   |
| Multi-organization users | Supported                                                                                                                                           | Proposed; maintainer approval required                   |
| Authentication           | Provider-neutral standards-based OIDC adapter using Authorization Code with PKCE for interactive sign-in; Business OS does not store user passwords | Proposed; maintainer approval required                   |
| MFA                      | Required for high-risk administrative actions; assurance is carried in the trusted authentication result                                            | Proposed; maintainer approval required                   |
| Sessions                 | Opaque server-side sessions; no self-contained JWT authorization tokens in the baseline                                                             | Proposed; maintainer approval required                   |
| Organization switching   | Explicit switch creates a fresh organization context and re-evaluates membership and permissions                                                    | Proposed; maintainer approval required                   |
| Authorization            | RBAC with scoped grants and narrow explainable ABAC/resource predicates                                                                             | Proposed; maintainer approval required                   |
| Permission vocabulary    | Stable `<resource>:<action>` capability names with explicit scope                                                                                   | Proposed; maintainer approval required                   |
| Principals               | Distinct human, service, integration, automation, and AI-agent principal kinds                                                                      | Proposed; maintainer approval required                   |
| Delegation               | Supported only as explicit, narrower, expiring, one-hop authority                                                                                   | Proposed; maintainer approval required                   |
| Impersonation            | Not supported in the baseline                                                                                                                       | Proposed; maintainer approval required                   |
| Break-glass              | Not supported in the baseline                                                                                                                       | Proposed; maintainer approval required                   |
| Separation of duties     | Required for defined high-risk administrative and security actions                                                                                  | Proposed; maintainer approval required                   |
| Revocation               | Epoch-based membership/session invalidation plus explicit principal, grant, credential, and delegation revocation                                   | Proposed; maintainer approval required                   |
| Audit                    | Structured, organization-scoped audit records for identity, authentication, authorization, delegation, principal, and high-risk events              | Proposed; maintainer approval required                   |

## Decision classification

The following classifications make the proposal's boundary explicit. **DECIDED** means that G-002 specifies the semantic contract. **DEFERRED TO A SPECIFIC LATER GATE** means that the concern is intentionally owned by another gate and is not being selected indirectly. **OPEN BLOCKER** means that G-002 cannot proceed until the named issue is resolved; this proposal has no open blocker within its scope.

| Concern                                                                                             | Classification                        | Resolution                                                                                                                                           |
| --------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Human identity, organization, membership, multi-organization membership, and organization switching | **DECIDED**                           | Globally unique user identities; explicit organization-scoped memberships; fresh authorization context and session rotation on switching             |
| Authentication mechanism and assurance                                                              | **DECIDED**                           | Provider-neutral OIDC Authorization Code with PKCE; no Business OS password storage; explicit assurance and MFA requirements                         |
| Authentication provider/vendor and SDK                                                              | **DEFERRED TO A SPECIFIC LATER GATE** | Provider selection and external credential/callback details remain behind replaceable adapters and require G-007 or a recorded amendment             |
| Session/token semantics, revocation, logout, and fixation protection                                | **DECIDED**                           | Opaque server-side sessions, explicit lifetime, rotation, revocation, secure transport, and epoch checks                                             |
| Database, session persistence, membership persistence, migrations, and transaction semantics        | **DEFERRED TO A SPECIFIC LATER GATE** | G-003 selects the engine, schema, migration, identifier, time, and tenancy-enforcement mechanisms                                                    |
| Roles, permissions, scopes, policy decisions, RBAC, and narrow resource predicates                  | **DECIDED**                           | Deny-by-default RBAC with scoped grants and explainable resource predicates                                                                          |
| Human, service, integration, automation, and AI principals                                          | **DECIDED**                           | Distinct principal kinds with explicit scope, action allowlists, lifecycle, revocation, and audit                                                    |
| Delegation                                                                                          | **DECIDED**                           | Narrower, expiring, one-hop, revocable, auditable delegation; no further delegation                                                                  |
| Impersonation and break-glass                                                                       | **DECIDED**                           | Both are unsupported in the baseline                                                                                                                 |
| Separation of duties                                                                                | **DECIDED**                           | Independent authority is required for named high-risk administrative and security actions                                                            |
| Credential storage, external credential lifecycle, and provider recovery                            | **DEFERRED TO A SPECIFIC LATER GATE** | G-003, G-007, and G-009 own persistence, external credential, and operational recovery mechanisms; G-002 owns the principal and revocation contract  |
| Durable approval work, revocation propagation, asynchronous execution, and events                   | **DEFERRED TO A SPECIFIC LATER GATE** | G-004 owns queues, events, jobs, retries, idempotency, and durable approval execution                                                                |
| Audit event semantics and required fields                                                           | **DECIDED**                           | Structured, attributable, organization-scoped audit records for identity, authentication, authorization, delegation, principal, and high-risk events |
| G-002 conceptual scope                                                                              | **DECIDED**                           | The approved contract is complete; implementation remains governed by the later persistence and provider gates where specified                       |

## 5. Terminology

The following terms are normative.

| Term                         | Definition                                                                                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User identity**            | A globally unique Business OS identity representing a human. It is not organization membership and does not itself grant tenant access.                                 |
| **Organization**             | The primary tenant boundary and workspace for a company or independently administered business entity.                                                                  |
| **Membership**               | An organization-scoped relationship between a user identity and an organization. It carries lifecycle status, role assignments, authorization epoch, and audit history. |
| **Principal**                | Any identifiable actor that can request or perform an action: human user, service principal, integration principal, automation principal, or AI-agent principal.        |
| **Role**                     | A named bundle of permissions assignable within a defined scope.                                                                                                        |
| **Permission**               | A stable capability to perform an action on a resource class.                                                                                                           |
| **Resource**                 | A typed business or platform object on which an action may operate.                                                                                                     |
| **Action**                   | A registered operation that reads, creates, changes, deletes, exports, invokes, or otherwise affects a resource.                                                        |
| **Scope**                    | The boundary within which a permission applies, such as an organization, team, object, relationship, or platform scope.                                                 |
| **Grant**                    | A rule assigning a role or permission to a principal within a scope and validity period.                                                                                |
| **Policy decision**          | A server-side result of `allow`, `deny`, or `requires_approval`, together with the policy basis and audit context.                                                      |
| **Delegation**               | An explicit, constrained transfer of authority from one principal to another.                                                                                           |
| **Authentication**           | Establishing that a claimed identity has passed the configured identity-verification process.                                                                           |
| **Authorization**            | Deciding whether an identified principal may perform an action on a resource in an organization and scope.                                                              |
| **Organization context**     | The trusted organization, principal, membership or credential, authorization epoch, and request correlation needed before tenant-owned access.                          |
| **Authentication assurance** | Evidence about how strongly the identity provider verified the principal, including whether an approved MFA factor was used.                                            |

Authentication does not imply authorization. A user identity without an active organization membership cannot access organization-owned resources.

## 6. Identity model

### Organization/membership model

The organization is the primary tenant boundary. A membership is the explicit relationship that grants a human identity an organization context; identity alone never grants tenant access. The membership lifecycle, multi-organization behavior, organization switching, authorization epoch, and owner safeguards defined in this section are normative for future implementation.

### 6.1 Human users

A human user is represented by one globally unique Business OS user identity. The identity is independent of applications and organizations. A user may belong to zero, one, or many organizations.

The identity owns only platform-level identity attributes and links to external authentication subjects. It does not contain organization-specific roles or permissions. Organization-specific access is derived from an active membership and its grants.

The canonical identity identifier is an opaque, immutable identifier generated by Business OS. Email address, phone number, display name, and external-provider subject are attributes or links, not authorization identifiers. Email and phone values must not be used as the stable primary key because they may change or may be reused under provider policy.

A human identity has a lifecycle independent of memberships. At minimum, the identity lifecycle supports `active`, `suspended`, and `deleted` states. A suspended or deleted identity cannot authenticate or authorize new work. Historical audit records retain the immutable identity reference and a privacy-safe display snapshot where policy permits.

### 6.2 Organizations

An organization is a globally unique, platform-owned tenant and workspace. Its identifier is opaque and immutable. An organization may have multiple owners and administrators. It must not be represented as a user, role, application, or provider account.

Organization lifecycle is separate from G-002 authentication. Provisioning, suspension, deletion, transfer, retention, export, and restoration workflows must be implemented under the applicable platform and G-003/G-008/G-009 decisions. G-002 requires that a suspended or deleted organization deny tenant-owned access regardless of the principal's otherwise valid identity.

### 6.3 Memberships

A membership is unique for the pair `(user_identity_id, organization_id)`. It is the required link for a human user to access an organization.

A membership has an explicit lifecycle:

- `invited`: an invitation exists but the user has not completed the required acceptance flow.
- `active`: the user may receive authorization according to grants and roles.
- `suspended`: access is temporarily denied while the membership remains identifiable.
- `revoked`: access is permanently removed; re-entry requires a new membership flow.
- `expired`: a time-bounded membership has ended and cannot authorize work.

Memberships carry an authorization epoch. Any membership status change, role change, organization switch, or security action that invalidates prior access increments the relevant epoch. A request, session, job, or delegated action with a stale epoch must be denied or revalidated before tenant-owned access.

An organization must retain at least one active owner. Removing or demoting the last owner requires a separately authorized ownership-transfer action and independent confirmation under the separation-of-duties rules.

### 6.4 Multiple organization membership

A user may belong to multiple organizations. Memberships are independent. A role, permission, team, grant, session context, cache entry, or authorization decision from Organization A must never be reused for Organization B.

A user identity without an active membership in an organization cannot read organization metadata beyond what a separate public or invitation policy explicitly permits. Invitations are not membership until accepted and validated.

## 7. Authentication model

### 7.1 Provider-neutral mechanism

G-002 decides the provider-neutral authentication protocol and contract: OIDC using the Authorization Code flow with PKCE for interactive sign-in. The adapter translates a trusted provider result into a Business OS authentication result. G-002 owns the protocol semantics, authentication assurance semantics, Business OS identity-linkage semantics, and authentication-result contract.

G-007 owns external identity-provider and vendor selection, the provider SDK, provider-specific configuration, callback and provider-integration details, external credential handling, and provider-specific recovery or operational behavior. G-007 must implement the G-002 contract and must not silently replace the OIDC Authorization Code with PKCE model. Changing the authentication protocol requires an explicit architecture amendment.

The architecture does not select an OIDC vendor, SDK, cloud service, or credential storage provider in G-002.

Business OS does not store human passwords in the baseline. Passwordless, password, recovery, email verification, and MFA factor management are responsibilities of the selected identity provider, subject to the assurance requirements below. A future decision may add a first-party credential mechanism only through an explicit architectural amendment; it is not implied by this document.

An external provider subject is linked to a Business OS user identity through a provider-qualified subject key. Provider subject values are not exposed as Business OS authorization identifiers. A provider replacement requires an account-linking or migration procedure, not a rewrite of domain or application modules.

### 7.2 Authentication result

The authentication adapter must return a validated result containing at least:

- The linked Business OS user identity or a controlled account-linking outcome.
- Provider-qualified subject reference.
- Authentication time.
- Authentication assurance level.
- MFA satisfaction state and factor assurance where available.
- Email-verification state where available and relevant.
- Provider session or transaction reference needed for logout or revocation.
- Correlation identifier for audit.

The result is an authentication assertion, not an authorization grant. The application must resolve organization membership and permissions separately.

### 7.3 MFA

MFA is required before high-risk actions, including ownership transfer, role or permission administration, credential connection or revocation, organization deletion or export, and any future action classified as financially, legally, externally, or destructively consequential.

The policy does not require Business OS to store MFA factors. The authentication adapter must expose sufficient assurance information to allow the authorization policy to require an approved MFA level. If the provider cannot prove the required assurance, the action is denied or returned as `requires_approval` according to the action policy.

### 7.4 Authentication assurance contract

The authentication adapter reports a provider-neutral assurance level. The baseline vocabulary is:

- `AAL1`: the identity provider authenticated the principal using the baseline assurance without an approved additional factor for the current authentication.
- `AAL2`: the identity provider authenticated the principal with an approved multi-factor assurance that meets the Business OS requirement for high-risk actions.
- `AAL3`: reserved for a future stronger assurance level. The baseline must not assume that AAL3 is available or require it.

The adapter result must include the assurance level, the authentication time, the time at which the required assurance was satisfied, and whether the assurance is provider-verified or unavailable. It must also expose a `recentAuthentication` result relative to a server-defined action-specific freshness window. A recent authentication is a trusted server-side comparison between the authentication timestamp and the freshness requirement; it is not a client assertion.

Authorization policies declare the minimum assurance and freshness required for an action. Ordinary authenticated actions may accept AAL1. High-risk actions require AAL2 and recent authentication unless a stricter action policy applies. If assurance is absent, stale, downgraded, or unverifiable, the authorization result is `deny` or `requires_approval`; it is never treated as sufficient by default.

Client-supplied assurance, MFA, authentication-time, or recent-authentication claims are never trusted. A provider adapter must fail closed when it cannot validate the required assurance. No MFA vendor, factor type, or implementation is selected by this contract.

### 7.5 Authentication failures and rate limits

Authentication failure responses must not reveal whether a user, organization, email, or external subject exists. Repeated failures, callback replay, invalid state, invalid PKCE verifier, and suspicious authentication patterns must be rate-limited and auditable.

Exact thresholds are operational configuration, not a provider or database decision. The authentication boundary must support account/provider rate limits, IP or device abuse controls where available, and incident response without placing rate-limit logic in domain modules.

### 7.6 Account recovery and email verification

Account recovery and primary email verification are delegated to the selected identity provider in the baseline. Business OS may require a verified email or equivalent assurance for invitations and high-risk actions, but it must not infer verification from an untrusted client claim.

## 8. Session and token model

### 8.1 Opaque server-side sessions

G-002 owns opaque server-side session semantics, including lifecycle, rotation, expiration, idle timeout, revocation, fixation protections, organization-switch behavior, authorization-epoch semantics, and security requirements for session records. Business OS does not use self-contained JWT claims as the source of authorization.

An opaque session identifier points to a replaceable session record through an adapter. G-003 owns the session persistence technology, database engine, storage schema, indexes, migrations, transaction semantics, persistence implementation, and tenancy enforcement for persisted session, membership, and grant records. G-003 must implement the storage required by G-002 without silently changing these security semantics. Any change to G-002 session semantics requires an explicit architecture amendment.

Browser sessions use a `Secure`, `HttpOnly`, and appropriate `SameSite` cookie. Non-browser clients may use an opaque bearer session token through a documented delivery adapter. Token transport does not change the authorization contract.

The session record contains or resolves:

- Session identifier hash or equivalent non-replayable representation.
- User identity reference.
- Current organization context, if selected.
- Membership and authorization epoch observed at issue or last revalidation.
- Authentication assurance.
- Issued time, last-used time, expiry time, and idle timeout.
- Reauthentication requirement state.
- Device or client metadata minimized to operational need.
- Revocation state and reason.

Raw session tokens must not be stored in logs or ordinary persistent records. The token is shown or transmitted only through the approved authentication boundary.

### 8.2 Lifetime and reauthentication

Sessions have both an absolute lifetime and an idle timeout. Exact durations are security configuration, but they must be explicit per client class and documented in deployment configuration. High-risk actions require recent authentication and may require MFA even when the session is otherwise active.

A session must rotate after login, organization switching, privilege elevation, and other fixation-sensitive transitions. The old session identifier must not remain valid beyond the defined rotation grace policy.

### 8.3 Logout and revocation

Logout revokes the current session and clears the client transport. “Logout all sessions” revokes all sessions for the user identity or organization membership according to the requested scope. Provider logout is attempted through the authentication adapter where supported, but local Business OS session revocation remains authoritative for Business OS access.

Session validation must reject suspended or deleted identities, suspended or revoked memberships, suspended or deleted organizations, stale authorization epochs, expired sessions, and explicitly revoked sessions.

### 8.4 Organization switching

Organization switching is an explicit action. The server verifies that the user has an active membership in the target organization, then creates a fresh organization context and rotates the session identifier. It must re-evaluate roles, permissions, teams, authentication assurance, policy restrictions, and authorization epoch for the target organization.

A client-supplied organization ID is only a selection request. It is never proof of membership or authority. Existing organization-scoped caches, loaded resources, transactions, and pending actions must not be reused across the switch.

### 8.5 Session fixation and hijacking controls

The implementation must rotate identifiers after authentication and organization switching, use secure cookie attributes, apply CSRF protection for cookie-authenticated state changes, validate origin or equivalent delivery controls where relevant, avoid session identifiers in URLs, and avoid logging secrets. Suspicious reuse, impossible transitions, or replay must be revocable and auditable.

## 9. Authorization model

### 9.1 Core policy

Authorization is server-side, deny-by-default, organization-scoped, and evaluated at a trusted action boundary. Every sensitive read and every state-changing action must be authorized independently. A UI control, route guard, model response, event, webhook, or client-supplied role is not authorization.

The policy decision is one of:

- `allow`: the principal may perform the action within the stated scope.
- `deny`: the principal may not perform the action.
- `requires_approval`: the principal may request the action, but a separate approved authority must complete it.

The default for missing, stale, ambiguous, or unverifiable context is `deny`.

### 9.2 RBAC with scoped grants and narrow resource policies

The primary model is role-based access control with scoped grants. A role bundles stable permissions. A grant assigns a role or permission to a principal within an organization, team, resource relationship, or approved platform scope.

Resource-level and attribute-based rules are allowed only as narrow, named predicates evaluated after the base grant. Examples include “may edit records owned by the principal,” “may access resources assigned to the principal's team,” or “may access a classified resource after the required assurance.” These predicates must be explainable, testable, and visible in audit output. They must not become an opaque general-purpose policy language in G-002.

The authorization evaluation order is:

1. Validate the principal is active and identifiable.
2. Establish and validate the organization context.
3. Validate organization and membership lifecycle.
4. Validate session, credential, delegation, or agent authorization epoch.
5. Resolve the registered action and resource type.
6. Resolve role and permission grants.
7. Evaluate narrow resource or attribute predicates.
8. Enforce approval, MFA, separation-of-duties, and rate/budget controls.
9. Return `allow`, `deny`, or `requires_approval` with an auditable reason.

### 9.3 Authorization context

A trusted authorization context contains at least:

- Organization identifier.
- Principal identifier and principal kind.
- Human membership or non-human credential/delegation reference.
- Organization and authorization epochs.
- Effective roles and grants, resolved server-side.
- Requested action and resource type.
- Target resource identifier, if applicable.
- Scope and relationship attributes.
- Authentication assurance and recent-authentication state.
- Correlation and causation identifiers.
- Delegation chain, if present.

The context is created by trusted server-side code and is immutable for the action evaluation. It must not be assembled from client-supplied roles, organization claims, or model output.

## 10. Permission vocabulary

### 10.1 Stable names

Permissions use the stable form `<resource>:<action>`, with lowercase resource and action identifiers separated by a colon. Examples include `organization:read`, `membership:invite`, `membership:revoke`, `role:assign`, `audit:read`, and `task:create`.

Permission names are capabilities, not UI labels. They are versioned public contracts. Renaming or changing the meaning of a permission requires a decision record, compatibility plan, and migration/rollout plan under G-003 where stored grants are affected.

### 10.2 Resource and action vocabulary

A resource identifies the object class. An action identifies the operation. The initial action vocabulary is:

- `read`: view a resource or approved representation.
- `list`: enumerate resources within scope.
- `create`: create a new resource.
- `update`: change an existing resource.
- `delete`: remove or request removal of a resource.
- `archive`: transition a resource to an inactive state.
- `export`: produce a material data export.
- `manage`: perform administrative operations explicitly documented for the resource.
- `execute`: invoke a registered side-effecting action.
- `approve`: approve a pending action requiring independent authority.

A module may add a domain-specific action only when generic vocabulary is insufficient. Each new action must document its target, scope, side effects, approval requirement, audit event, and tests.

### 10.3 Scopes

The initial scope vocabulary is:

- `platform`: platform-wide scope, reserved for explicitly designated platform principals.
- `organization`: all authorized resources in one organization.
- `team`: resources assigned to a named organization team.
- `resource`: a specific resource or resource relationship.
- `self`: resources owned by or directly representing the principal.

Scopes are restrictive. A broader grant cannot be inferred from a narrower grant, and an organization grant does not automatically authorize platform-global actions. Cross-organization scope is not available in the baseline.

### 10.4 Roles

The baseline organization roles are:

- **Owner:** manages organization ownership and the highest organization-level administration, subject to separation-of-duties and approval rules.
- **Administrator:** manages ordinary organization configuration, memberships, roles, and platform capabilities allowed by policy, but cannot unilaterally perform owner-transfer or protected security actions.
- **Member:** receives only explicitly granted operational permissions and has no administrative authority by default.
- **Auditor:** can read permitted audit and compliance information but cannot change organization state by role membership alone.

Roles are not immutable privileges. A role is a named bundle whose permissions are evaluated in organization context. Custom roles may be supported after the baseline implementation demonstrates safe role and permission administration; they must use the same vocabulary and cannot create platform-wide authority.

No role is an implicit superuser. Platform operators, service principals, integrations, automations, and AI agents do not become Owners or Administrators by inheritance.

## 11. Principal model

Every action is attributable to one effective principal and, where applicable, an originating principal and delegation chain.

### 11.1 Human principals

A human principal references a user identity and an active organization membership. It receives effective permissions only from that membership's grants and applicable policy. A user may be authenticated without being authorized in the selected organization.

### 11.2 Service principals

A service principal represents a Business OS-controlled non-human process or internal subsystem. It has:

- Stable principal identifier and kind.
- Named owner and purpose.
- Explicit organization or platform scope.
- Registered action allowlist.
- Least-privilege grants.
- Credential or workload-identity reference.
- Expiry, rotation, and revocation state.
- Audit policy.

A service principal cannot assume a human's permissions implicitly. Platform scope is exceptional and requires explicit approval and separation of duties.

### 11.3 Integration principals

An integration principal represents an external provider connection owned by an organization or an explicitly documented platform scope. It is distinct from the human administrator who installed it. It can invoke only the registered integration actions and scopes associated with its credential and installation.

Credential issuance, OAuth/API-key policy, webhook verification, and provider-specific lifecycle remain G-007 decisions. G-002 requires only that the resulting principal be explicit, scoped, revocable, auditable, and unable to inherit administrator authority implicitly.

### 11.4 Automation principals

An automation principal represents a published rule or workflow execution. It has an owner, organization, rule identifier, action allowlist, execution budget, and authorization policy. An automation run may act only through registered actions and must reauthorize at execution time.

An automation principal does not inherit the permissions of the user who created the rule. Any delegated authority must be explicit, narrower than the creator's authority, time-bounded, and revocable.

### 11.5 AI-agent principals

An AI-agent principal represents a governed agent configuration, not a human user. It has an organization or platform scope, owner, purpose, lifecycle, model/provider policy reference, tool allowlist, budget, approval policy, and audit policy.

An AI agent can invoke only registered tools. It cannot use a model response as authority, obtain unrestricted user impersonation, access data outside its context, or bypass domain authorization. A human request may be the origin of an agent run but does not automatically transfer the human's complete permissions.

## 12. Delegation

Delegation is supported only as explicit constrained authority. A delegator may grant a delegate a subset of the delegator's effective authority for named actions, named resources or scopes, a defined purpose, and an expiry.

Delegation rules are:

- A delegation must identify the delegator, delegate, organization, allowed actions, resource/scope boundary, purpose, creation time, expiry, and revocation state.
- A delegate cannot receive broader authority than the delegator currently holds.
- A delegation cannot cross organizations unless a future cross-organization decision explicitly permits it; the G-002 baseline prohibits that.
- Delegated principals cannot further delegate. One-hop delegation is the maximum baseline depth.
- Delegation cannot bypass MFA, approval, separation-of-duties, rate, budget, or audit requirements.
- Revocation invalidates future use and must be checked at the trusted action boundary.
- Audit records include the complete delegation chain and the originating principal.

Requests that need more authority than the delegation allows are denied, not automatically escalated.

## 13. Impersonation and break-glass

### 13.1 Impersonation

Impersonation is **not supported in the G-002 baseline**. Support staff and administrators must not act through a hidden user session or silently become another human principal.

A future support or administrative access model may be proposed as a separate decision, but it must define consent or legal basis, scope, time limit, approval, notification, audit, and revocation before implementation. No current role or service principal may infer impersonation authority.

### 13.2 Break-glass

Break-glass access is **not supported in the G-002 baseline**. If production operations later require emergency access, G-009 must define the operational control and a future architecture amendment must define the identity, approval, time limit, notification, audit, and revocation semantics. An unavailable break-glass path is preferable to an undocumented permanent superuser.

## 14. Separation of duties

The following actions require independent authority or an approval workflow rather than a single actor's ordinary grant:

- Transferring organization ownership.
- Removing or demoting the last active owner.
- Granting or revoking organization administrator authority.
- Changing permission policy for privileged administration.
- Connecting, rotating, or revoking a high-impact external credential.
- Exporting or deleting an organization or a materially sensitive data set.
- Enabling an automation or AI tool with external, destructive, financial, legal, or broad data side effects.
- Disabling or materially weakening audit or security controls.

The requester and approver must be distinct principals. A principal cannot approve its own request, approve through a delegation it created, or satisfy separation of duties by changing roles during the same action. The approval record includes the requested action, policy version, requester, approver, organization, target, reason, timestamps, and outcome.

The exact workflow transport is outside G-002 and depends on G-004 where durable approval work is required. The authorization rule itself is decided here.

## 15. Credential lifecycle

G-002 defines the identity and authorization contract for credentials without selecting a storage provider.

All credentials must have an owner, principal kind, organization or platform scope, purpose, allowed actions, issue time, expiry or rotation policy, last-used information, revocation state, and audit reference. Secrets must be encrypted or irreversibly protected at rest according to their type, must never be logged, and must not be returned after initial creation except through an explicit rotation flow.

Credential lifecycle states are `issued`, `active`, `rotating`, `expired`, `revoked`, and `compromised`. A credential in any state other than `active` must not authorize new work. Rotation creates a new credential before retiring the old one when the provider supports overlap; the overlap window is bounded and auditable.

Human authentication credentials are managed by the selected identity provider in the baseline. Service and integration credential storage and provider-specific lifecycle are deferred to G-007 and G-009 where applicable. G-002 still requires that every resulting credential resolve to an explicit principal and organization scope.

## 16. Revocation semantics

Revocation must be explicit, observable, and enforced at the trusted action boundary.

### 16.1 Authentication and session revocation

A session is rejected when it is expired, explicitly revoked, linked to a suspended/deleted identity, linked to a suspended/revoked membership, linked to a suspended/deleted organization, or based on a stale authorization epoch. Logout revokes the current session. Security response may revoke all sessions for an identity, membership, organization, or principal.

Provider-side logout or token revocation does not replace local Business OS revocation. Local denial remains authoritative.

### 16.2 Permission and membership revocation

Membership suspension, revocation, organization suspension, role removal, permission removal, delegation revocation, and principal revocation increment the relevant authorization epoch or otherwise invalidate cached decisions. New sensitive actions must observe the change before execution.

In-flight actions must re-check authorization at the side-effect boundary. Revocation does not retroactively erase already audited facts, but it must prevent subsequent use. Durable jobs and events require G-004 semantics for reauthorization and cancellation; G-002 defines the rule, not the worker mechanism.

### 16.3 Credential revocation

Credential revocation is immediate for new authorization decisions. Compromised credentials require principal containment, session invalidation where linked, rotation, audit, and an operational incident process. Provider-specific recovery remains governed by G-007/G-009.

## 17. Audit model

Audit records are organization-scoped when the activity concerns an organization. Platform-global identity and security events carry a platform scope and the affected organization when known. Every record is append-oriented, access-controlled, time-stamped, and attributable.

An audit record contains at least:

- Event type and schema version.
- Event time and server clock context.
- Organization identifier or explicit platform scope.
- Effective principal and principal kind.
- Originating principal and delegation chain, if applicable.
- Session, credential, or authentication transaction reference where applicable.
- Action, resource type, target identifier, and scope.
- Authorization result: `allow`, `deny`, or `requires_approval`.
- Policy or permission basis, without exposing secrets.
- Outcome, error category, and correlation/causation identifiers.
- External reference or approval reference where applicable.

At minimum, the following events are auditable:

| Category       | Required events                                                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity       | Identity creation, link, unlink, suspension, deletion, recovery, and security attribute changes                                                                |
| Authentication | Login success, logout, failed authentication, invalid callback/state/PKCE, MFA assurance changes, account-linking attempts, and authentication-provider errors |
| Session        | Session creation, rotation, switch, revocation, expiry, logout-all, suspicious reuse, and fixation/hijacking rejection                                         |
| Membership     | Invitation, acceptance, activation, suspension, revocation, expiry, ownership changes, and organization switching                                              |
| Authorization  | Allowed high-risk action, denial, `requires_approval`, stale-context denial, policy change, role change, permission change, and scope failure                  |
| Principals     | Service/integration/automation/AI principal creation, grant, scope change, credential issue, rotation, suspension, and revocation                              |
| Delegation     | Creation, use, rejection, expiry, revocation, and attempted further delegation                                                                                 |
| Administration | Separation-of-duties request, approval, rejection, ownership transfer, audit-control change, and protected export/deletion request                             |

Audit access itself requires authorization and must not allow a principal to erase or rewrite its own audit history. Retention, storage, export, and deletion implementation remain G-003/G-008/G-009 concerns.

## 18. Multi-tenancy threat model

| Threat                                       | Required control                                                                               | Test that must prove it                                                                                             |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Cross-organization resource access           | Require active organization context and scope every authorization decision and resource access | A principal active in Organization A cannot read or mutate an equivalent target in Organization B                   |
| Forged organization ID                       | Treat client organization input as a selection request; validate membership server-side        | Send Organization B's ID while authenticated only in Organization A; expect denial and an audit record              |
| Stale membership                             | Check membership status and authorization epoch at the trusted action boundary                 | Revoke membership after session creation; the next sensitive action is denied                                       |
| Revoked user                                 | Reject suspended/deleted identities and revoke linked sessions                                 | Suspend the identity and attempt a new request and existing-session request; both are denied                        |
| Stale session                                | Use session expiry, revocation, rotation, and epoch checks                                     | Use a revoked or pre-switch session token; expect denial                                                            |
| Privilege escalation                         | Resolve effective grants server-side and deny self-grant or unauthorized role changes          | A Member attempts to grant Administrator or alter its own grants; expect denial                                     |
| Role escalation                              | Restrict role and permission administration and enforce separation of duties                   | An Administrator attempts protected role changes without independent approval; expect `requires_approval` or denial |
| Service-principal overreach                  | Give each service principal explicit scope and action allowlist                                | A service principal invokes an unregistered action or another organization's resource; expect denial                |
| AI privilege escalation                      | Treat AI agents as distinct principals with tool allowlists and scoped grants                  | An agent attempts a tool outside its allowlist or a user's unrelated permission; expect denial                      |
| Automation privilege escalation              | Reauthorize each registered action at execution time                                           | A rule created by an Administrator attempts an action after its grant is revoked; expect denial                     |
| Delegated authority escape                   | Enforce narrower scope, expiry, one-hop depth, and revocation                                  | A delegate attempts broader scope, further delegation, or post-expiry use; expect denial                            |
| Impersonation abuse                          | Do not support implicit impersonation or hidden user sessions                                  | Any request claiming another user without an approved future capability is denied and audited                       |
| Cache/session organization confusion         | Qualify cache/session context with organization and authorization epoch                        | Switch from Organization A to B and verify no A decision or resource is returned for B                              |
| Missing organization in background execution | Require explicit organization context and principal on every executable action                 | Attempt execution with missing or mismatched context; expect denial before resource access                          |
| Forged provider/authentication claims        | Validate adapter results and never trust client role or organization claims                    | Alter claims or callback data; expect authentication failure or authorization denial                                |
| Audit evasion                                | Require audit at authorization and high-risk action boundaries                                 | A denied or side-effecting action without a corresponding audit record fails the test                               |

## 19. Security controls

The G-002 implementation must enforce the following controls:

1. Authentication establishes identity; authorization independently establishes permission.
2. Organization context is created from trusted membership or non-human credential data.
3. Authorization defaults to deny when identity, organization, membership, scope, policy, or epoch is missing or stale.
4. Every sensitive read and state-changing action uses a trusted authorization boundary.
5. Sessions use secure transport and rotation controls and do not expose authorization claims as client authority.
6. Provider-specific identity code remains in adapters. Domain and application packages depend only on provider-neutral contracts.
7. No principal kind receives implicit human-user privilege.
8. Delegation is explicit, narrower, expiring, one-hop, revocable, and auditable.
9. Impersonation and break-glass are not available in the baseline.
10. High-risk actions require recent authentication, appropriate MFA assurance, independent approval, or all three according to policy.
11. Revocation is checked before sensitive side effects and invalidates stale cached decisions.
12. Error responses do not reveal account, organization, membership, or authorization details beyond the safe policy.
13. Audit data is append-oriented, access-controlled, organization-scoped where applicable, and protected from self-erasure.
14. Secrets and session tokens never appear in logs, source, committed configuration, or ordinary audit fields.
15. Security controls are tested with negative cases, not only successful flows.

## 20. Testing strategy

G-002 implementation must be tested at multiple layers without requiring product application behavior.

### Unit tests

Test permission-name parsing, scope comparison, role-to-permission expansion, narrow policy predicates, authorization decision precedence, epoch comparison, session lifecycle transitions, delegation narrowing, delegation expiry, MFA requirement classification, and safe denial categories.

### Contract tests

Test the provider-neutral authentication adapter result, session adapter contract, principal contract, organization-context contract, authorization decision contract, permission registration contract, delegation contract, and audit event schemas. Provider SDK types must not appear in these contracts.

### Integration tests

After G-003 selects persistence, test membership uniqueness, epoch invalidation, session revocation, role/grant persistence, transaction boundaries, audit writes, and organization-scoped queries against the selected infrastructure. These tests must not be written before the relevant G-003 decision.

### End-to-end tests

After delivery authentication is implemented, test login callback, session rotation, organization switch, safe logout, revoked-session denial, authorization denial, high-risk approval, and audit visibility through the API boundary.

### Security-negative tests

Every authorization-capable module must include Organization A/B isolation, forged organization ID, stale membership, revoked session, stale epoch, role escalation, service-principal overreach, AI-agent overreach, automation overreach, delegation escape, missing organization context, and audit-completeness tests.

## 21. Implementation boundaries

This decision phase creates documentation only. It must not create:

- Authentication provider integrations or OAuth implementation.
- Sessions or membership tables.
- Database schemas or migrations.
- Authentication, authorization, identity, credential, or role code.
- Durable queues, events, jobs, or AI execution.
- Plugins, integrations, storage, or production infrastructure.
- Fake implementations or placeholder services.

After G-002 approval, implementation may begin only after the relevant G-003 decision is closed for persistent identity/membership/session/grant data. Authentication adapters may be developed behind provider-neutral contracts, but no provider SDK may enter domain or application modules. G-004 is required for durable approval, revocation propagation, jobs, or events. G-007 is required for external integration credentials and callbacks.

## 22. Dependencies on G-003 through G-010

| Gate  | G-002 dependency and boundary                                                                                                                                                                                                                                                                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-003 | Owns database engine, schemas, migrations, identifier strategy, transaction boundaries, session persistence, indexes, epoch persistence, and tenancy enforcement for persisted session, membership, and grant records. G-002 supplies security semantics but not storage.                                                                                                       |
| G-004 | Owns durable approval work, event propagation, job cancellation, reauthorization timing, retries, and idempotency. G-002 requires reauthorization at execution boundaries.                                                                                                                                                                                                      |
| G-005 | Owns plugin principal installation, sandboxing, manifest permissions, and lifecycle. Plugins must use G-002 principal and action contracts.                                                                                                                                                                                                                                     |
| G-006 | Owns AI provider, model/data policy, budgets, retrieval, and approval details. G-002 defines AI agents as distinct principals without implicit user privilege.                                                                                                                                                                                                                  |
| G-007 | Owns external identity-provider/vendor selection, provider SDKs, provider-specific configuration and callbacks, integration credentials, OAuth/API keys, provider recovery, and external provider contracts. G-002 defines the OIDC protocol contract, authentication result, integration principals, and authorization scope; G-007 must not silently replace those semantics. |
| G-008 | Owns credential/file secret storage, retention, export, deletion, and restoration implementation where applicable.                                                                                                                                                                                                                                                              |
| G-009 | Owns production identity operations, secret delivery, session-store operations, monitoring, recovery, and incident response.                                                                                                                                                                                                                                                    |
| G-010 | Owns application installation, entitlement, configuration, and marketplace governance. G-002 permissions must not imply entitlement.                                                                                                                                                                                                                                            |

## 23. Open blockers

The G-002 proposal has no unresolved conceptual blocker within its scope. It has three explicit implementation dependencies:

1. **G-003 must be closed before persistence implementation.** G-002 does not choose the session, membership, role, grant, credential, or audit storage mechanism.
2. **G-004 must be closed before durable asynchronous authorization work.** Approval tasks, revocation propagation, background authorization, and event-driven policy effects cannot be implemented as in-process best effort.
3. **G-007 must be closed before external identity-provider or integration credentials are connected.** G-002 defines an OIDC adapter contract but does not select a provider, SDK, or credential-storage implementation.

These are dependencies, not reasons to leave G-002 terminology vague. The semantics in this document are intended to be decided now and implemented only after the owning gates permit the relevant infrastructure.

## 24. Acceptance criteria

G-002 may be marked accepted only when the maintainer confirms that:

1. Human identity, organization, and membership semantics are explicit.
2. Multi-organization membership and organization switching are explicit.
3. Authentication is separate from authorization and uses a provider-neutral contract.
4. OIDC protocol semantics are decided as Authorization Code with PKCE, while external identity-provider/vendor selection remains separately governed by G-007.
5. External identity-provider/vendor SDK, provider configuration, callbacks, credentials, and provider-specific recovery remain separately governed by G-007 and cannot replace the G-002 protocol without an architecture amendment.
6. Password, recovery, email-verification, and MFA responsibilities are explicit.
7. Authentication assurance semantics are provider-neutral and define AAL1, AAL2, AAL3, recent authentication, fail-closed behavior, and untrusted client claims.
8. Authorization can distinguish ordinary authentication from the AAL2 and recent-authentication assurance required for high-risk actions.
9. Session semantics are decided, including transport, lifetime, rotation, expiry, idle timeout, logout, revocation, authorization epochs, and fixation protections.
10. Session persistence technology, schema, indexes, migrations, transactions, and tenancy enforcement remain G-003 responsibilities and cannot silently change the G-002 session semantics.
11. Client-supplied organization, role, permission, assurance, and authentication-time claims are never trusted as authority.
12. Authorization uses deny-by-default RBAC with scoped grants and narrow explainable resource predicates.
13. Permission names, resource/action vocabulary, scopes, roles, and policy decision outcomes are explicit.
14. Human, service, integration, automation, and AI principals have distinct semantics and no implicit privilege inheritance.
15. Delegation is explicit, narrower, expiring, one-hop, revocable, and auditable.
16. Impersonation and break-glass status is explicit: both are unsupported in the baseline.
17. Separation-of-duties actions are identified and require independent authority.
18. Credential lifecycle and revocation states are explicit without silently selecting a storage provider.
19. Audit events and required audit fields are explicit.
20. The multi-tenancy threat model maps each required threat to a control and a test.
21. The testing strategy includes positive, negative, tenant-isolation, revocation, principal, delegation, and audit tests.
22. G-003 through G-010 dependencies are explicit and no later gate is silently resolved.
23. No database schemas, migrations, authentication code, authorization code, provider SDK, credentials, queue, event, AI, plugin, integration, storage, or production infrastructure is introduced by G-002 closure.

## 25. Decision record

### Proposed decision

Adopt this document as the G-002 identity and authorization contract, with the following concrete defaults:

- Globally unique human identities independent of organizations.
- Organization-scoped memberships supporting multiple organizations per user.
- Provider-neutral OIDC Authorization Code with PKCE for interactive authentication.
- No Business OS password storage in the baseline.
- Opaque server-side sessions rather than self-contained JWT authorization tokens.
- Explicit organization switching with session rotation and fresh authorization context.
- Deny-by-default RBAC with scoped grants and narrow explainable resource predicates.
- Stable `<resource>:<action>` permissions and explicit scope vocabulary.
- Distinct principal kinds for humans, services, integrations, automation, and AI agents.
- Explicit one-hop, narrower, expiring, revocable delegation.
- No baseline impersonation or break-glass access.
- Separation of duties for high-risk administrative and security actions.
- Explicit epoch-based and state-based revocation.
- Structured, attributable, organization-scoped audit records.

### Current decision status

**G-002: APPROVED.** This document is the authoritative identity and authorization contract. It does not authorize runtime implementation outside the approved later-gate boundaries.

### Required record after approval

The acceptance record must include the approval date, maintainer or owner, this document's commit, any approved deviations, and the statement that implementation remains gated by G-003, G-004, and G-007 where identified above.

## References

[1]: ../AGENTS.md 'Business OS Contributor Guidance'
[2]: ../README.md 'Business OS Repository Overview'
[3]: ARCHITECTURE.md 'Business OS Architecture'
[4]: MULTI-TENANCY.md 'Business OS Multi-Tenancy'
[5]: PERMISSIONS.md 'Business OS Permissions'
[6]: SECURITY.md 'Business OS Security'
[7]: DECISIONS.md 'Business OS Architecture Decisions'
[8]: REPOSITORY-STRUCTURE.md 'Business OS Repository Structure'
[9]: DEVELOPMENT.md 'Business OS Development'
[10]: G-001-DECISION-CLOSURE.md 'Business OS G-001 Decision Closure'
