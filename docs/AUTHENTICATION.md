# Business OS Authentication

## Google Workspace / Cloud Identity

Business OS uses the provider-neutral G-002 contract with a Google Workspace OIDC adapter. The implementation uses standard Authorization Code with PKCE, verifies the Google ID-token signature and claims against Google discovery/JWKS metadata, creates durable opaque server-side sessions, rotates session context during organization switching, and preserves the existing membership authorization and RLS boundaries. No Google SDK, password store, JWT session, or Manus runtime dependency is used.

Configure these runtime variables from a secret manager or deployment environment:

```sh
OIDC_ISSUER=https://accounts.google.com
OIDC_CLIENT_ID=...
OIDC_CLIENT_SECRET=...
OIDC_REDIRECT_URI=https://your-business-os-origin.example/api/v1/auth/google/callback
OIDC_HOSTED_DOMAIN=your-workspace.example
```

Register the exact redirect URI in Google Cloud Console under the OAuth client. For local development, the redirect URI may use `http://localhost:3000/api/v1/auth/google/callback`; for Manus HTTPS Preview, use the stable Preview origin and keep `COOKIE_CROSS_SITE=true`.

## User provisioning

Google authentication does not grant organization access. Before a user can sign in, an administrator must provision a Business OS user with the matching verified Google email and an active organization membership. On the first successful sign-in, Business OS links the stable Google subject to that pre-provisioned user. A Google account with no matching user or no active organization membership is denied.

The current local fixture can be provisioned in a disposable database with a platform-level SQL operation such as:

```sql
UPDATE users SET email = 'person@your-workspace.example'
WHERE user_id = '00000000-0000-0000-0000-000000000001';
```

Production provisioning UI and invitation workflows are intentionally separate work. Do not grant membership by trusting a client-supplied organization or role claim.

## Routes

- `GET /api/v1/auth/providers` reports enabled login surfaces without exposing secrets.
- `GET /api/v1/auth/google/login` starts the Google OIDC flow.
- `GET /api/v1/auth/google/callback` validates the callback, links the identity if pre-provisioned, creates the opaque session, and redirects to `/`.
- `POST /api/v1/dev/login` remains available only when `NODE_ENV=development`; production returns `404`.

OIDC login state, PKCE verifier, nonce, redirect URI, and expiry are stored in the repository-owned `oidc_login_states` table and consumed once. Expired or replayed state is rejected.
