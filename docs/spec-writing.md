# Spec Writing Guide

This guide explains how to document prototype specs in Tangle Lab.

Specs should help a designer-developer and an AI agent understand what to build, why it matters, and how to know when it works. Keep them practical. Do not turn them into enterprise process documents.

## Where Specs Live

Each prototype keeps its main spec here:

```text
prototypes/<slug>/docs/spec.md
```

Design references, screenshots, sketches, exports, or Figma notes go here when needed:

```text
prototypes/<slug>/docs/references/
```

If the spec becomes too long, keep `docs/spec.md` as the shell/index spec and split detailed work into:

```text
prototypes/<slug>/docs/specs/
```

## Main Spec Structure

Use this structure for `docs/spec.md`:

```markdown
# Prototype Name Spec

## Status

Draft / In progress / Implemented / Paused

## Goal

What this prototype is trying to learn, prove, or make possible.

## Audience

Who this is for and what they already understand.

## Problem / Opportunity

Why this prototype exists. Keep this short and concrete.

## Core User Flow

The main path a person should be able to take through the prototype.

## Requirements

What must be true for this prototype to count as working.

## Non-Goals

What is intentionally out of scope.

## Design References

Links to Figma files, screenshots, sketches, notes, or `docs/references/` assets.
State whether the work mode is `design-faithful`, `balanced`, or `quick-and-dirty`.

## Implementation Notes

Only include implementation details that prevent ambiguity or help future work.

## Test / Acceptance Checklist

Concrete checks that prove the prototype works.

## Known Shortcuts

Shortcuts, rough edges, mocked behavior, or temporary decisions.

## Open Questions

Decisions that are not settled yet.
```

## Long Specs

Split a spec when `docs/spec.md` becomes hard to scan, mixes several independent features, or contains work that should be implemented and tested separately.

When splitting:

- Keep `docs/spec.md` as the overview and index.
- Create one child spec per user-facing feature, workflow, or independently testable task.
- Put child specs in `docs/specs/`.
- Link each child spec from `docs/spec.md`.
- Include a short purpose and status next to each link.

Example shell section:

```markdown
## Detailed Specs

- [Canvas interactions](specs/canvas-interactions.md) — In progress. Covers selection, dragging, and keyboard behavior.
- [Export flow](specs/export-flow.md) — Draft. Covers export formats and save states.
```

## Child Spec Structure

Use this structure for files in `docs/specs/`:

```markdown
# Task Or Feature Name

## Goal

What this smaller piece should accomplish.

## Inputs / Assumptions

What this work depends on or assumes is already true.

## Behavior

What the user can do and what the system should do in response.

## Edge Cases

Important awkward states, missing data, empty states, errors, or constraints.

## Acceptance Checklist

Specific checks that prove this task is done.

## Dependencies / Links

Links to related specs, design references, or implementation notes.
```

## Writing Rules

- Write specs for clarity, not ceremony.
- Explain what to build and how to tell whether it works.
- Avoid implementation details unless they prevent confusion.
- Prefer short bullets and concrete behavior over long essays.
- Keep specs current when behavior changes.
- If a decision is unknown, write it under `Open Questions` instead of guessing silently.
- If a shortcut is taken, write it under `Known Shortcuts`.

## Design-Faithful Specs

When work is `design-faithful`, the spec must identify the design source of truth and state what fidelity means for the task.

Include relevant notes for:

- layout
- spacing
- typography
- color
- interaction states
- motion or animation
- responsive behavior
- assets or imagery

If the design is incomplete, document assumptions in the spec before implementation.

## Quick-And-Dirty Specs

When work is `quick-and-dirty`, the spec should make the shortcut explicit.

Include:

- the functional behavior that matters most
- what polish is intentionally skipped
- what can be mocked or hardcoded
- what would need revisiting if the prototype becomes more serious

Quick-and-dirty does not mean undocumented. It means the spec is honest about speed, rough edges, and tradeoffs.
