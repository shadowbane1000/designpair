---
name: "speckit-adr"
description: "Generate or update Architecture Decision Records (ADRs) from planning artifacts or standalone decisions."
compatibility: "Requires spec-kit project structure with .specify/ directory"
metadata:
  author: "github-spec-kit"
  source: "templates/commands/adr.md"
user-invocable: false
disable-model-invocation: true
---


## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Pre-Execution Checks

**Check for extension hooks (before ADR generation)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_adr` key
- If the YAML cannot be parsed or is invalid, skip hook checking silently and continue normally
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` field, or it is null/empty, treat the hook as executable
  - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation
- For each executable hook, output the following based on its `optional` flag:
  - **Optional hook** (`optional: true`):
    ```
    ## Extension Hooks

    **Optional Pre-Hook**: {extension}
    Command: `/{command}`
    Description: {description}

    Prompt: {prompt}
    To execute: `/{command}`
    ```
  - **Mandatory hook** (`optional: false`):
    ```
    ## Extension Hooks

    **Automatic Pre-Hook**: {extension}
    Executing: `/{command}`
    EXECUTE_COMMAND: {command}

    Wait for the result of the hook command before proceeding to the ADR Directory.
    ```
- If no hooks are registered or `.specify/extensions.yml` does not exist, skip silently

## ADR Directory

All ADRs live in `docs/adr/` at the project root (NOT per-feature). This is a project-wide governance artifact.

## Modes of Operation

This command operates in two modes based on user input:

### Mode 1: Extract from Planning Artifacts (`from-plan` or invoked as post-plan hook)

1. **Setup**: Run `.specify/scripts/bash/check-prerequisites.sh --json` from repo root and parse JSON for FEATURE_DIR and AVAILABLE_DOCS.

2. **Load planning artifacts**: Read from FEATURE_DIR:
   - **Required**: `plan.md` (technical context, constitution check, structure decisions)
   - **If exists**: `research.md` (decisions with rationale and alternatives)
   - **If exists**: `data-model.md` (entity and storage decisions)
   - **If exists**: `contracts/` (interface design decisions)

3. **Scan for existing ADRs**: Read all files in `docs/adr/` to determine:
   - Next available ADR number
   - Existing decisions (to avoid duplicates)
   - Potential supersession or amendment targets

4. **Extract architectural decisions** from the loaded artifacts. A decision is ADR-worthy if it:
   - Chooses between multiple viable alternatives
   - Has significant consequences (positive or negative) for the project
   - Would be non-obvious to a new team member
   - Affects the system's structure, dependencies, or key quality attributes
   - Is NOT a routine implementation detail (e.g., variable naming, file organization within an established pattern)

5. **For each extracted decision**, generate an ADR using the template at `.specify/templates/adr-template.md`:
   - Pull context from `research.md` (why the decision was needed)
   - Pull rationale and alternatives from `research.md` or `plan.md`
   - Pull consequences from the planning discussion
   - Cross-reference related existing ADRs
   - Set status to **Accepted** (it was decided during planning)

6. **Write ADRs** to `docs/adr/ADR-[NNN]-[kebab-case-title].md`

7. **Report**: List all generated ADRs with titles and a one-line summary of each decision.

### Mode 2: Standalone ADR (specific topic provided)

1. **Scan for existing ADRs**: Read all files in `docs/adr/` to determine next number and existing decisions.

2. **Interactive decision capture**: Based on the user's topic, ask structured questions:
   - What is the context/problem?
   - What alternatives were considered?
   - What was decided and why?
   - What are the expected consequences?

   If the user provides enough context in their input, skip redundant questions and draft directly.

3. **Generate ADR** using `.specify/templates/adr-template.md`

4. **Write** to `docs/adr/ADR-[NNN]-[kebab-case-title].md`

5. **Check for related ADRs**: If any existing ADRs are related (same domain, superseded, or depended upon), note the relationship in the Related ADRs section and suggest updating the related ADR's status if appropriate.

## ADR Numbering

- ADRs use a three-digit sequential number: `ADR-001`, `ADR-002`, etc.
- Scan `docs/adr/` for the highest existing number and increment by 1
- Never reuse a number, even if an ADR is deprecated

## ADR File Naming

Format: `ADR-[NNN]-[kebab-case-title].md`

Examples:
- `ADR-001-why-go.md`
- `ADR-005-chunking-strategy.md`

## Quality Checks

Before writing each ADR, verify:
- [ ] Context explains WHY the decision was needed (not just what)
- [ ] At least one alternative was considered (even if it was "do nothing")
- [ ] Consequences include both positive AND negative impacts
- [ ] Rationale connects the decision back to project goals or constraints
- [ ] Status is appropriate (Proposed if uncertain, Accepted if decided)

## Key Rules

- ADRs are project-wide, stored in `docs/adr/` — never in feature-specific directories
- Use absolute paths when reading/writing files
- Match the existing ADR style in the project (check existing ADRs for tone and depth)
- Don't generate ADRs for trivial decisions — focus on decisions that matter
- When extracting from planning artifacts, err on the side of fewer, higher-quality ADRs

## Post-Execution Checks

**Check for extension hooks (after ADR generation)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.after_adr` key
- If the YAML cannot be parsed or is invalid, skip hook checking silently and continue normally
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` field, or it is null/empty, treat the hook as executable
  - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation
- For each executable hook, output the following based on its `optional` flag:
  - **Optional hook** (`optional: true`):
    ```
    ## Extension Hooks

    **Optional Hook**: {extension}
    Command: `/{command}`
    Description: {description}

    Prompt: {prompt}
    To execute: `/{command}`
    ```
  - **Mandatory hook** (`optional: false`):
    ```
    ## Extension Hooks

    **Automatic Hook**: {extension}
    Executing: `/{command}`
    EXECUTE_COMMAND: {command}
    ```
- If no hooks are registered or `.specify/extensions.yml` does not exist, skip silently

## Context

$ARGUMENTS
