<!--
Sync Impact Report
- Version change: 0.0.0 → 1.0.0 (initial ratification)
- Added principles:
  - I. Collaborator, Not Judge
  - II. Graph Semantics Over Pixels
  - III. Skateboard First
  - IV. The Prompt Is the Product
  - V. ADRs Are the Meta-Play
- Added sections:
  - Product Boundaries (from "What DesignPair Is NOT")
  - Development Workflow
- Templates reviewed:
  - .specify/templates/plan-template.md ✅ no changes needed
  - .specify/templates/spec-template.md ✅ no changes needed
  - .specify/templates/tasks-template.md ✅ no changes needed
  - .specify/templates/commands/ — no command templates exist
- Follow-up TODOs: none
-->

# DesignPair Constitution

## Core Principles

### I. Collaborator, Not Judge

The AI is a thinking partner, not an evaluator. It asks questions, flags
concerns, and suggests alternatives. It MUST NOT score, grade, or rank
the user's work. The tone MUST feel like a thoughtful senior engineer
pairing with you — curious, constructive, never condescending.

### II. Graph Semantics Over Pixels

The AI reasons about typed nodes and edges (Service → Database), not
visual positions or layout. A well-connected topology MUST produce the
same AI feedback regardless of how the user has arranged it on the
canvas. Implementation decisions MUST preserve this separation between
graph structure and visual presentation.

### III. Skateboard First

Ship the smallest thing that works end-to-end before expanding scope.
The walking skeleton has 5 component types, basic edges, and one-button
AI analysis. Every feature beyond that is roadmap, not prerequisite.
New work MUST NOT block delivery of the current working vertical slice.

### IV. The Prompt Is the Product

The quality of DesignPair depends entirely on how well the graph state
is translated into a prompt the LLM can reason about. This is where
the real engineering challenge lives. Graph-to-prompt construction MUST
go beyond naive serialization — it MUST include topology analysis,
data flow direction, component roles, and connection patterns.

### V. ADRs Are the Meta-Play

Every significant decision MUST get an Architecture Decision Record.
The ADR collection is part of the portfolio value — it demonstrates
leadership thinking and decision-making rigor. ADR bodies are immutable
once accepted; if a decision changes, create a new superseding ADR.

## Product Boundaries

DesignPair is an interactive architecture canvas with a real-time AI
collaborator. The following boundaries are non-negotiable:

- **Not interview prep or scoring.** It MUST NOT grade users or compare
  against reference answers.
- **Not text-to-diagram generation.** The user draws; the AI reasons
  about what they've drawn. This is the inverse of tools like
  Eraser/DiagramGPT.
- **Not a general diagramming tool.** It is specifically for
  system/software architecture.

Any feature proposal that crosses these boundaries MUST be rejected or
redesigned to stay within scope.

## Development Workflow

- CI runs lint + test + build for both frontend (TypeScript) and
  backend (Go) on every push.
- Strict TypeScript — no `any` types. Idiomatic Go — explicit error
  handling, interfaces for external dependencies.
- Test the graph-to-prompt logic and WebSocket message flow thoroughly.
  Don't chase coverage for its own sake.
- Commits SHOULD be atomic and well-described.

## Governance

This constitution defines the non-negotiable principles and boundaries
for the DesignPair project. All implementation work, feature proposals,
and architectural decisions MUST comply with these principles.

**Amendment procedure:**
1. Propose the change with rationale.
2. Document the amendment in a new constitution version.
3. Update the Sync Impact Report at the top of this file.
4. Version increments follow semantic versioning:
   MAJOR for principle removals/redefinitions, MINOR for additions,
   PATCH for clarifications.

**Version**: 1.0.0 | **Ratified**: 2026-04-08 | **Last Amended**: 2026-04-08
