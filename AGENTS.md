# Tangle Lab Agent Instructions

## Working Mode

Before implementation, state the mode you are using:

- `design-faithful`: use when the user asks to match a supplied design, Figma file, screenshot, or visual reference.
- `quick-and-dirty`: use when the user asks for a fast prototype, proof of concept, or functionality-first implementation.
- `balanced`: use when no explicit mode is given.

This repo is maintained by one designer-developer with limited development experience. Prefer simple, readable, low-maintenance choices over elaborate architecture.

## Repository Structure

- New prototypes go in `prototypes/<slug>/`.
- Reusable code goes in `packages/shared/`.
- Repo-wide scripts stay in `scripts/`.
- Every prototype needs `docs/spec.md` before meaningful implementation work.
- Optional design references, screenshots, notes, and sketches go in `docs/references/`.

Each prototype folder should normally contain:

- `package.json`
- `index.html`
- `src/`
- `public/` when static assets or generated data are needed
- `docs/spec.md`

## Prototype Specs

Before creating or changing prototype specs, read `docs/spec-writing.md`.

Keep each prototype's main spec at `prototypes/<slug>/docs/spec.md`. If a spec becomes too long, keep `docs/spec.md` as the shell/index spec and split detailed work into `docs/specs/`.

## Shared Code

Inspect `packages/shared` before adding local helpers, tokens, wrappers, or utilities.

Keep code local to a prototype when it is experimental or used only once. Move it to `packages/shared` only when reuse is real across prototypes and the shared API is obvious.

If a prototype duplicates existing shared functionality, refactor it to import the shared version and remove the local duplicate. Shared code should stay boring, stable, and easy to understand.

## Design-Faithful Work

When working in `design-faithful` mode:

- Treat the supplied design as the source of truth.
- Preserve layout, spacing, typography, color, interaction states, and visual hierarchy.
- Do not simplify visuals unless the user approves it.
- Ask or document assumptions when the design is incomplete.
- Verify visually in the browser when possible.

## Quick-And-Dirty Work

When working in `quick-and-dirty` mode:

- Prioritize functional behavior and speed.
- Use simple UI and minimal styling.
- Avoid polish unless it directly helps the prototype answer its question.
- Document shortcuts in the prototype spec.

## Dependencies

Keep dependencies local to a prototype unless they are genuinely shared. For example, if only one prototype uses an animation or canvas library, keep it in that prototype. If multiple prototypes need the same technology, create a small wrapper or helper in `packages/shared` instead of repeating setup.
