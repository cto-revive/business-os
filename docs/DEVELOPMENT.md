# Business OS Development

## Current status

The repository is still waiting for the implementation-stack decision in G-001. Therefore, there are no valid install, run, test, lint, format, build, migration, or deployment commands yet. This is intentional: documenting commands for an unselected stack would create false guidance and silently decide architecture.

Once G-001 is accepted, this document must become the canonical developer guide for human engineers and AI coding agents. It must be updated in the same change that introduces the project skeleton.

## Required guide contents after G-001

The completed guide must document prerequisites, dependency installation, environment-variable setup, local development, database creation and migrations, deterministic seed or test data, unit/integration/contract/end-to-end tests, formatting, linting, type checking, builds, debugging, CI, deployment, and contribution workflow.

It must identify which commands are safe to run locally, which require external services, how to run tests without Manus, and how to reset local state. It must link each operational command to the repository-owned configuration and source that implements it.

## Development rules

All required development behavior must be reproducible from a clone of GitHub plus documented standard dependencies and environment variables. Do not rely on Manus conversation history, hidden project configuration, hosted builder state, or provider-specific local tooling.

New modules must document their ownership, public contracts, organization-isolation strategy, permissions, events, migrations, adapters, audit behavior, and tests. Changes that establish an architectural behavior must update the relevant documentation and, where material, `docs/DECISIONS.md`.

## AI coding agent workflow

An AI coding agent should read `AGENTS.md`, `README.md`, the relevant documents in `docs/`, and the module-local documentation before editing code. It should inspect existing source and tests, make the smallest coherent change, run the documented validation commands, update documentation, and report what is implemented and what remains unimplemented. It must not claim that a documented boundary is a working feature.

Agents must preserve organization isolation, centralized authorization, provider adapters, public module contracts, source-controlled migrations, and Manus independence. If implementation exposes a conflict or missing decision, the agent must document the discrepancy and stop before silently redesigning the architecture.

## References

[1]: ../AGENTS.md "Business OS Contributor Guidance"
[2]: README.md "Business OS Repository Overview"
[3]: ARCHITECTURE.md "Business OS Architecture"
[4]: REPOSITORY-STRUCTURE.md "Business OS Repository Structure"
[5]: DECISIONS.md "Business OS Architecture Decisions"
[6]: IMPLEMENTATION-STATUS.md "Business OS Implementation Status"
