# Business OS Deployment

## Portability requirement

Business OS must be deployable from the GitHub repository, environment variables, a database, and standard infrastructure. Manus may be used for development, preview, or initial hosting, but it must not be required to run the application. No essential runtime behavior may exist only in a Manus configuration, a builder-only API, or an undocumented hosted setting.

The repository will eventually contain the source code, dependency definitions, database migrations, configuration templates, test suite, and deployment documentation required to reproduce the system elsewhere. Deployment should be possible in a conventional containerized or otherwise standard application environment after a future stack decision.

## Intended deployment components

The modular monolith may initially be deployed as a small set of source-controlled process roles. The exact topology is not yet selected.

| Component | Responsibility | Portability expectation |
|---|---|---|
| Web and API process | Serves organization-facing surfaces and public API contracts | Stateless where practical; configured by environment variables |
| Worker process | Executes background jobs, event consumers, automation, and agent runs | Uses source-controlled queues and job definitions |
| Database | Stores platform and application data | Evolves only through repository migrations and has tested backups |
| Object storage | Stores files and large artifacts | Accessed through a provider abstraction and organization-safe namespace |
| Cache or queue | Supports performance and asynchronous delivery when needed | Replaceable provider behind documented operational contracts |
| Edge or ingress | Terminates traffic and routes HTTP requests | Standard reverse-proxy or managed-infrastructure capability |

These are architecture roles rather than a final bill of materials. A role can initially share a deployment unit when operationally appropriate, provided its contracts and failure modes remain clear.

## Configuration and secrets

Configuration must use environment variables or equivalent standard runtime configuration. The repository may contain a safe configuration template that documents required variable names, purpose, format, and non-secret example values. Secrets, private keys, access tokens, production credentials, and unredacted connection strings must never be committed.

Infrastructure-specific values must be isolated from business logic. Storage, database, messaging, email, communications, identity, and AI-model providers require adapters or configuration boundaries so they can be replaced without changing core domain behavior.

## Delivery and database evolution

A release process must build from a traceable revision of this repository, validate tests, apply migrations using a documented procedure, and expose enough health information to detect failure. Database migrations must be compatible with the deployment strategy and should use expand-and-contract patterns for changes that cross versions. Roll-forward and recovery procedures must be documented before destructive migrations are introduced.

Background jobs, schedules, recurring work, webhook consumers, and workers must be represented in source code and version-controlled configuration. They may be executed by a managed platform, but their definition cannot live only in a platform control panel.

## Operational baseline

Production deployment must include encrypted transport, access-controlled configuration, application and dependency observability, health checks, database backup, restoration testing, log retention policy, alerting, and incident-response procedures. The project must select recovery objectives, environment promotion rules, CI/CD tooling, container strategy, and infrastructure-as-code approach before production implementation.

## Portable container package

The repository includes a standard `Dockerfile` for the current web and API process roles. It pins Node.js `22.13.0` and pnpm `11.24.0`, installs from the committed lockfile, builds the TypeScript workspace, and starts the API and framework-free web server through `tooling/start-production.mjs`.

The container exposes the web process on `PORT` (default `3000`) and runs the API edge on `API_PORT` (default `3001`). The web server proxies `/api/*` and `/health` to that API port. `DATABASE_URL` is read only at runtime; it must point to a standard PostgreSQL 16-or-later service. The image does not run migrations automatically, so deployments must apply the repository-owned migrations as a release step before routing traffic to the application.

The unauthenticated `GET /health` endpoint returns JSON with `status: "ok"`. `tooling/healthcheck.mjs` validates that response and is wired into the Docker `HEALTHCHECK` instruction. It can also be run directly:

```sh
docker build -t business-os:local .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=postgresql://business_os_app:change-me@db:5432/business_os \
  business-os:local
```

For a clean-clone deployment, apply `pnpm db:migrate:g004` with the deployment database credentials before starting the image. The current production image intentionally does not enable the development login; production identity remains a later implementation gate.

## References

[1]: README.md "Business OS Repository Overview"
[2]: ARCHITECTURE.md "Business OS Architecture"
[3]: DATABASE.md "Business OS Database Architecture"
[4]: SECURITY.md "Business OS Security"
[5]: DECISIONS.md "Business OS Architecture Decisions"
