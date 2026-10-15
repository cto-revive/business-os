# Manus Preview

Business OS can run in a Manus Preview without making Manus a runtime dependency. The GitHub repository remains authoritative; the Manus project is a preview copy of the committed repository state.

## Runtime shape

The preview uses the repository's existing processes:

- `pnpm build` compiles the API and worker packages.
- `pnpm dev:api` listens on port `3000` and uses the standard PostgreSQL `DATABASE_URL`.
- `pnpm dev:web` listens on port `4173`, serves `apps/web`, and proxies `/api/*` and `/health` to the API edge.
- `COOKIE_CROSS_SITE=true` enables `SameSite=None; Secure` session cookies for the cross-site HTTPS Preview iframe. Leave it unset or `false` for ordinary local HTTP development.

## Reproduce from GitHub

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm build

# Provide a standard PostgreSQL database, then apply repository migrations and fixtures.
DATABASE_URL=postgresql://business_os_app:change-me@127.0.0.1:5432/business_os \
  pnpm db:migrate:g004
DATABASE_URL=postgresql://business_os_app:change-me@127.0.0.1:5432/business_os \
  pnpm seed:first-screen

DATABASE_URL=postgresql://business_os_app:change-me@127.0.0.1:5432/business_os \
NODE_ENV=development COOKIE_CROSS_SITE=true PORT=3000 pnpm dev:api
WEB_PORT=4173 pnpm dev:web
```

The preview configuration points at the web process on port `4173`; this is separate from the API process on port `3000`. No required application behavior, migration, secret, or business rule is stored only in Manus configuration.
