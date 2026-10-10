# Contributor Guidance for Business OS

## Repository authority and scope

This repository is the authoritative source of truth for Business OS. All production source code, database migrations, configuration templates, automated tests, and architecture documentation must be committed here. Do not place required business logic, schema changes, or operational configuration solely in a hosted builder, a personal workspace, or an undocumented external setting.

The current repository phase is **bounded Product Readiness Home slice implemented; G-005 remains implementation-plan-only**. G-001 is closed for the repository runtime foundation. G-002 is approved as the identity and authorization contract; the implemented local development subset does not select a production provider. G-003 is closed, approved, implemented, and verified. G-004 is approved, implemented, and verified according to `docs/G-004-DECISION-CLOSURE.md`. G-005 architecture is approved according to `docs/G-005-DECISION-CLOSURE.md`; no executable plugin work is authorized. Do not implement plugins, plugin runtime adapters, migrations, SDKs, or any G-006 through G-010 work.

## Non-negotiable architectural rules

Business OS is a modular monolith by default. Keep domain boundaries explicit and avoid creating microservices before a concrete operational need exists. Platform capabilities such as organizations, users, teams, permissions, tasks, files, comments, notifications, events, search, and audit logs are shared services. Business applications must use those services instead of introducing parallel versions.

Every tenant-owned datum, request, event, job, search entry, cache entry, file reference, and audit record must carry and enforce organization scope. Users belong to organizations rather than to individual applications. The default authorization posture is deny unless an organization-scoped permission explicitly permits the action.

Apps add major business capabilities. Plugins extend a capability through documented extension points. Integrations connect external systems through adapters. AI agents perform governed work through registered tools. Templates configure behavior, and themes control presentation. The core must never depend on an optional plugin.

## Engineering and change controls

Maintain database changes as version-controlled migrations in this repository. Never commit secrets; use documented environment-variable names and configuration templates with safe placeholders. Use provider and storage abstractions where infrastructure is replaceable. Background work must be represented by source-controlled code and configuration rather than by hidden platform-only settings.

When implementing a new module, document its ownership, dependencies, organization-isolation strategy, permissions, emitted and consumed events, data migrations, external adapters, and audit behavior. Do not bypass a module boundary by importing private internals, writing another module's data directly, or changing core source to accommodate a plugin.

## Required documentation review

Before merging a material architectural or implementation change, review the documents in `docs/` that govern the affected concern. Update `docs/DECISIONS.md` when a decision is accepted, superseded, or newly blocked. Keep application lifecycle state current in `docs/APPS.md`.

## Portability rule

Manus may support development, previews, or initial hosting, but it is not an application runtime dependency. Prefer portable standards and adapters. Any proposal that would make Manus required at runtime needs explicit approval and a recorded decision before adoption.

## References

[1]: README.md 'Business OS Repository Overview'
[2]: docs/DECISIONS.md 'Business OS Architecture Decisions'
