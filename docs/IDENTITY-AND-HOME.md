# Business OS — Identity, Authorization, Session, and Home Contracts

**Status:** Authorized first-screen milestone
**Scope:** Local development authentication only; staging/production provider selection remains deferred to G-007.

## Identity and membership model

A `UserIdentity` is globally unique and is not itself tenant access. An `Organization` is the primary tenant boundary. An `OrganizationMembership` connects a user to one organization and carries a role, lifecycle state, and authorization epoch.

The first milestone uses these roles:

- `owner`
- `admin`
- `member`

All three roles may read Home only when the membership is `active` and the server-side permission check grants `platform.home.read`.

Membership lifecycle states are:

- `active`
- `suspended`
- `revoked`

The authorization epoch increments when membership authority changes. A stale session or request context must not continue to authorize protected Home access after the epoch changes.

## Session boundary

Sessions are opaque server-side records identified by a secure cookie. The browser never receives provider tokens, session secrets, database credentials, or authorization internals.

The local development fixture creates a deterministic server-side session. It is enabled only when the explicit development fixture configuration is active and must fail closed outside local development. Login and organization switching rotate the session identifier. Logout revokes the session. Membership revocation or an authorization-epoch change rejects stale authority.

Cookie-authenticated state changes use CSRF protection. The first implementation uses a same-origin API and a CSRF token issued by the development session endpoint; the token is required on logout and organization-switch operations.

## Persistence model

The first migration set owns these records:

- `users`
- `external_identities` (provider-neutral linkage structure; local fixture uses a development provider namespace)
- `organizations`
- `organization_memberships`
- `sessions`
- `workspace_items`

Every organization-owned table has a non-null `organization_id`. Sessions are associated with the user and active organization context. Runtime access uses the non-owner database role and transaction-local organization context through the existing persistence boundary.

## Authorization policy

Authorization is deny-by-default. The Home policy is:

```text
allow platform.home.read
when authenticated
and membership.organization_id = requested organization
and membership.state = active
and membership.role in {owner, admin, member}
and membership.authorization_epoch = current membership epoch
```

The organization context is resolved server-side from the session and current membership. A client-provided organization identifier is only a selection request; it is never proof of access.

## Home API contract

### `GET /api/v1/home`

A valid session and active organization membership are required.

Success response:

```json
{
  "organization": { "id": "org-1", "name": "Acme" },
  "viewer": { "userId": "user-1", "displayName": "Alice", "role": "owner" },
  "workspace": {
    "itemCount": 2,
    "items": [
      { "id": "item-1", "title": "Welcome to Business OS" },
      { "id": "item-2", "title": "Review your workspace" }
    ]
  }
}
```

`itemCount` is the total count of returned items in this first read-only slice. The response contains no provider claims, secrets, session identifiers, database details, or authorization internals.

Error response:

```json
{
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Authentication is required"
  }
}
```

Stable codes are used for `401`, `403`, and `500` outcomes. Messages are safe for browser display; diagnostic details are server-side only.

## Security-test matrix

The required database-backed tests use PostgreSQL 16 with a non-owner runtime role.

| Case | Expected result |
|---|---|
| No session → Home | `401 AUTHENTICATION_REQUIRED` |
| Unknown/revoked session → Home | `401 AUTHENTICATION_REQUIRED` |
| Authenticated user without membership | `403 ORGANIZATION_ACCESS_DENIED` |
| Suspended or revoked membership | `403 ORGANIZATION_ACCESS_DENIED` |
| Missing Home permission | `403 PERMISSION_DENIED` |
| Organization A session requests organization B | `403 ORGANIZATION_ACCESS_DENIED`; no B data disclosed |
| Organization A repository scope queries B | No rows returned / write rejected by RLS |
| Missing organization context | No tenant rows; protected operation denied |
| Stale authorization epoch | `403 AUTHORIZATION_STALE` |
| Active member in own organization | Home response with only approved fields |
| Logout then Home | `401 AUTHENTICATION_REQUIRED` |
| Organization switch | Membership revalidated and session rotated |
| CSRF token missing on state change | `403 CSRF_INVALID` |
| Runtime role bypass attempt | RLS rejects cross-tenant access |
| Empty organization workspace | `itemCount: 0`, `items: []` |

The milestone is not complete if these tests are skipped. CI must provision PostgreSQL, apply migrations, create the non-owner runtime role, seed deterministic fixtures, and execute the tests.
