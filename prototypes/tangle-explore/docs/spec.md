# Tangle Explore Prototype Spec

## Goal

Explore ways to browse, compare, organize, and visually understand a Tangle music collection.

## Audience

This prototype is for design and product exploration by a single designer-developer. It should stay easy to run, inspect, and change.

## Current Explorations

- Graph Nodes: graph-based collection browsing.
- Timeline: time-based collection exploration.
- Set Planner: drag-and-drop planning for sets.
- Chromatic Wheel: harmonic and color-based browsing.
- My World: spatial and terrain-like collection views.
- Collection Comparator: comparison and radar-style analysis.
- Ideation Canvas: freeform collection ideation.

## Core Flow

Open the prototype index, choose an exploration, and interact with that view using the shared collection data and controls.

## Design References

No external design source is currently treated as canonical. If future work is based on a Figma file, screenshot, or sketch, add it to `docs/references/` and state whether the implementation mode is `design-faithful`, `balanced`, or `quick-and-dirty`.

## Known Shortcuts

- All current explorations live in one app because they belong to the same feature area.
- Dependencies are currently local to this prototype.
- Shared code should move to `packages/shared` only when another prototype also needs it.

## Open Questions

- Which explorations should become product-grade concepts?
- Which interactions should remain rough tests versus design-faithful prototypes?
