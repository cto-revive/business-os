# G-005 Implementation Plan Architecture Consistency Audit

## 1. Audit status and conclusion

**Audit date:** 2026-09-23
**Audited document:** [`G-005-IMPLEMENTATION-PLAN.md`](G-005-IMPLEMENTATION-PLAN.md)
**Reference architecture:** [`G-005-DECISION-CLOSURE.md`](G-005-DECISION-CLOSURE.md)
**Decision authority:** [`DECISIONS.md`](DECISIONS.md)

The G-005 implementation plan is consistent with the approved G-005 architectural contract and security posture. It preserves the ownership boundaries of G-002, G-003, and G-004. It keeps plugin capabilities deny-by-default and installation-specific, preserves the permission-expansion invariant, and prevents approval reuse when release or other binding material changes.

The plan also preserves the distinction between architectural approval and implementation authorization. It does not select a concrete WASM engine, runtime, component model, host ABI implementation, native sandbox dependency, deployment topology, or production enablement policy.

**No implementation was performed by this audit.** No source code, package, migration, table, dependency, runtime adapter, WASM engine, ABI, executable plugin, product module, AI runtime, integration, storage implementation, or marketplace functionality was created.

## 2. Required result

# G-005 IMPLEMENTATION PLAN AUDIT COMPLETE

# READY FOR IMPLEMENTATION AUTHORIZATION

This result is limited to a separately authorized implementation phase beginning with the plan’s stages 1 through 8. It does not authorize concrete executable runtime implementation or controlled plugin enablement. Those stages require the separate criteria and approvals defined in Sections 27 and 28 of the plan.

## 3. PASS findings

| Audit objective | Result | Evidence |
|---|---|---|
| Preserve every G-005 architectural boundary | **PASS** | Plan Sections 1–2 preserve capability mediation, deny-by-default permissions, organization/platform scope, immutable releases, runtime isolation, and the separation between architecture approval and implementation authorization. The approved architecture requires the same boundaries in Sections 1, 5, 6, and 7 of the decision package. [1] |
| Preserve G-002 identity and authorization ownership | **PASS** | Plan Section 2 names G-002 as the authority for identity, principals, authorization, delegation, revocation, separation of duties, and epochs. Sections 8, 9, 11, and 12 require effective principal, delegation, epoch, and reauthorization checks. [2] |
| Preserve G-003 persistence, organization context, RLS, and tenancy ownership | **PASS** | Plan Sections 2, 4, 7, and 8 place PostgreSQL, Kysely, `pg`, transactions, migrations, repositories, organization context, and RLS behind the existing persistence boundary. [3] |
| Preserve G-004 durable execution and audit ownership | **PASS** | Plan Sections 2, 3, 11, 12, 17, 20, 21, and 22 reuse G-004 jobs, queues, leases, fencing, retries, idempotency, approvals, execution records, audit, and outbox semantics. [4] |
| Avoid duplicate infrastructure | **PASS** | Plan Section 4 explicitly rejects separate queue, scheduler, approval, audit, secrets, marketplace, and WASM packages. Sections 11 and 22 prohibit duplicate execution and audit pipelines. |
| Keep capabilities deny-by-default and installation-specific | **PASS** | Plan Sections 5, 6, and 9 distinguish manifest requests, review, installation grants, and per-invocation authorization. Unlisted capabilities are denied. |
| Preserve the manifest-request invariant | **PASS** | Plan Sections 6, 9, and 27 state that a manifest requests capabilities but never grants them. The plan includes the `read.customer` / `write.customer` upgrade example and explicit permission-diff review. |
| Require reapproval for broader releases | **PASS** | Plan Sections 6, 9, 12, 21, and 27 require explicit review and new approval bindings when a release adds capabilities or changes other binding material. |
| Prevent narrower releases from regaining authority | **PASS** | Plan Sections 6, 10, 21, and 27 state that downgrade and rollback cannot restore previously removed capabilities. |
| Prevent approval-binding reuse | **PASS** | Plan Sections 5, 6, 11, 12, 21, and 27 bind release digest, action version, permission set, targets, canonical input, resource preconditions, scope, policy, and epoch according to G-004 semantics. |
| Preserve organization isolation | **PASS** | Plan Section 8 requires explicit organization context, forced RLS, fail-closed policies, platform-scope separation, and negative tests for switching, missing context, mismatches, and cross-tenant access. Section 17 expands the adversarial cases. |
| Keep secrets outside G-005 and preserve G-007 ownership | **PASS** | Plan Sections 2, 7, 9, 13, 14, 17, 27, and 28 exclude secret material from plugin configuration and the ABI and defer credential capabilities to G-007. |
| Deny direct access to protected host surfaces | **PASS** | Plan Sections 1, 2, 4, 5, 8, 9, 14, 16, 17, 18, and 25 deny direct access to authentication internals, persistence internals, secrets, filesystem, network, processes, environment variables, private packages, other plugins, and other organizations. |
| Keep the WASM decision as posture only | **PASS** | Plan Sections 1, 2, 14, 15, 25, 27, and 28 state that the approved posture is WASM-compatible capability isolation, not approval of a concrete engine, component model, ABI, native dependency, deployment topology, or production enablement policy. |
| Avoid premature runtime selection | **PASS** | Plan Sections 14, 15, 26, and 27 keep engine, ABI, component model, provenance, and deployment choices open for later implementation/security review. |
| Separate test-only adapter from production runtime | **PASS** | Plan Sections 3, 4, 15, 16, 18, 27, and 29 define a deterministic test-only adapter and prohibit treating it as a production execution mechanism. |
| Preserve the ten-stage lifecycle | **PASS** | Plan Section 3 reproduces the required ten-stage sequence and states that stages must not be skipped or collapsed. Section 30 repeats the planning-stage stop condition. |
| Require separate security review for executable runtime work | **PASS** | Plan Sections 3, 15, 17, 26, 27, and 29 require concrete runtime and sandbox security review before stage 9. |
| Require separate operational/deployment review for enablement | **PASS** | Plan Sections 3, 19, 25, 27, 28, and 29 require later deployment review and explicit authorization before stage 10. |
| Preserve human and independent AI developer usability | **PASS** | Plan Sections 1, 4, 5, 23, 24, and 25 require repository-owned contracts, standard tooling, explicit gate checks, and reproducible validation without Manus. |
| Preserve Manus independence | **PASS** | Plan Sections 1, 4, 18, 19, 23, 24, and 25 explicitly prohibit Manus SDK/runtime/service/deployment dependencies and require standard GitHub tooling. |
| Avoid G-006 and later-gate implementation | **PASS** | Plan Sections 1, 2, 13, 19, 24, 25, 27, and 28 defer AI, credentials, integrations, storage, deployment, marketplace, and later gates. |
| Preserve implementation ordering | **PASS** | Plan Section 3 exactly matches the mandated sequence: contracts, validation, registry, persistence, permissions, G-004, test adapter, adversarial verification, runtime, enablement. |

## 4. FAIL findings

**No architectural FAIL findings were identified in the implementation plan.**

The plan is sufficiently specific for an authorized implementation phase covering stages 1 through 8. It does not incorrectly authorize stage 9 or stage 10.

## 5. Missing requirements

No required planning objective is missing. The plan contains all 28 requested planning areas, including exact package paths, file paths, planned tables, contract order, RLS, permissions, lifecycle, G-004 integration, approval binding, configuration, provenance, runtime ports, test adapter, security testing, architecture checks, CI, migrations, rollback, audit, human and AI workflows, portability, risks, open decisions, stage completion criteria, and runtime/enablement gates.

The following details are intentionally left as implementation decisions rather than silently selected by the plan:

- Concrete WASM engine and version.
- WASM core model versus component model.
- Host ABI and serialization format.
- Artifact signing, trust roots, provenance, and revocation mechanism.
- Supported plugin languages and deterministic build toolchains.
- Registry transport and artifact storage.
- Runtime resource-limit defaults.
- Initial stable capabilities, actions, and events.
- Declarative UI surfaces.
- Retention, export, deletion, and organization-offboarding behavior.
- G-009 deployment controls.

These are not omissions in the planning stage. They are explicitly gated before executable runtime implementation or controlled enablement, as required by the approved architecture. [1]

## 6. Risks requiring resolution before implementation stages

The following risks must be resolved during the relevant implementation stage:

1. **Runtime security claims:** A concrete runtime must demonstrate memory, time, output, host-call, filesystem, network, process, environment, and dependency isolation. A claim of WASM compatibility alone is insufficient.
2. **ABI authority leakage:** The ABI must not expose engine-specific handles, arbitrary host references, persistence objects, secrets, or unrestricted capability dispatch.
3. **Permission expansion:** Upgrade and downgrade tests must prove that manifests cannot grant authority and that newly requested capabilities require explicit installation review.
4. **Approval replay:** G-004 approval binding must include all material release, capability, target, input, policy, scope, and epoch values.
5. **RLS bypass:** Every organization repository must use the G-003 context and non-owner role. Adapter-level bypass tests are required.
6. **Duplicate side effects:** Ambiguous completion and at-least-once delivery require G-004 idempotency, fencing, reconciliation, and audit behavior.
7. **Artifact provenance:** Before executable runtime work, the project must select and review the provenance, digest, signing, and revocation model.
8. **Credential exposure:** No credential capability may be implemented before G-007 defines the host-mediated secret boundary.
9. **Deployment enforcement:** An environment that cannot enforce the selected sandbox guarantees must refuse executable plugin enablement.
10. **Declarative UI drift:** UI contributions must remain declarative and server-authorized rather than becoming browser-side executable code.

Risks 1, 2, 7, and 9 block stage 9 and stage 10. Risks 3 through 6 must be addressed before the corresponding contract, persistence, and G-004 stages are considered complete. Risk 8 blocks credential-using capabilities until G-007 authorization exists.

## 7. Governance-document consistency finding

There is one non-architectural documentation inconsistency outside the implementation plan: the heading in `docs/DECISIONS.md` still says **“G-005 — Proposed plugin runtime and isolation architecture”**, while the entry body correctly records **“ARCHITECTURE APPROVED / IMPLEMENTATION PLAN REQUIRED.”** The approved G-005 decision document, implementation status, and contributor guidance use the correct approved-planning status.

This heading is a documentation-label issue, not an implementation-plan defect and not a change to G-001 through G-004 semantics. It should be corrected before a future governance cleanup or implementation merge so that the authoritative decision index is internally consistent. No correction was made during this audit because the instruction limited this task to audit documentation.

## 8. Implementation authorization boundary

The plan is ready for a separately authorized implementation phase beginning with stages 1 through 8:

- Framework-free contracts.
- Validation and architecture tests.
- Non-executable registry and installation model.
- G-003-bound persistence implementation.
- Capability and permission enforcement.
- G-004 integration.
- Test-only runtime adapter.
- Adversarial security verification.

The audit does **not** authorize those stages. It records that the plan is ready for authorization. A future authorization must identify the stages, files, and acceptance evidence allowed in that authorization.

Stage 9, concrete executable runtime implementation, requires a separate engine, ABI, component-model, native-dependency, deployment, and security review. Stage 10, controlled plugin enablement, requires a separate operational and deployment review and explicit authorization. If the selected runtime cannot demonstrate the required sandbox guarantees, executable untrusted plugins must not be enabled.

## 9. Scope verification

The audit introduced only this document. No plugin-like package or WASM implementation exists in the repository. The package tree contains the existing G-001 through G-004 packages only. No migration, table, dependency, source file, runtime adapter, ABI, engine, executable example, AI runtime, integration, storage implementation, marketplace functionality, or later-gate implementation was added.

G-001, G-002, G-003, and G-004 ownership and semantics remain unchanged. G-006 through G-010 remain pending, except that G-005 architecture is approved and its implementation plan is now audited.

## References

[1]: G-005-DECISION-CLOSURE.md "G-005 Plugin Runtime and Isolation Decision Package"
[2]: G-002-DECISION-CLOSURE.md "G-002 Identity and Authorization Decision Closure"
[3]: G-003-DECISION-CLOSURE.md "G-003 Persistence and Tenancy Decision Closure"
[4]: G-004-DECISION-CLOSURE.md "G-004 Events, Reliable Execution, and Durable Approval Decision Closure"
[5]: DECISIONS.md "Business OS Architecture Decisions"
[6]: ../AGENTS.md "Business OS Contributor Guidance"

<!-- Author: Manus AI -->
<!-- Status: Audit complete; ready for separate implementation authorization; no implementation performed. -->
