# Vinyl Stickers Prototype Spec

## Status

Draft.

## Goal

Create a tactile vinyl collection and player prototype where browsing feels like flipping record sleeves, opening an album feels like extracting vinyl, playback is controlled through the record itself, and stickers add expressive personality.

## Audience

This prototype is for design and product exploration by a single designer-developer. It should stay easy to run, inspect, change, and hand off to an AI agent one stage at a time.

## Problem / Opportunity

Most music collection interfaces feel like utilities. This prototype explores whether a web interface can make collection browsing and playback feel physical, slow, expressive, and object-like.

## Core User Flow

1. Open the collection view.
2. Browse a horizontal carousel of album sleeves.
3. Select a focused sleeve.
4. Watch the vinyl extract into the album detail view.
5. Control playback by playing, holding, dragging, and releasing the vinyl.
6. See stickers attached to sleeves or records in a way that respects each surface.

## Requirements

- Work mode is `balanced`.
- The prototype slug is `vinyl-stickers`.
- The prescribed stack is React + Vite.
- Use fake local data for v1.
- Use a local JSON database at `public/data/albums.json` once data wiring begins.
- Use local placeholder or generated media first.
- Stub audio playback before adding local or open-licensed audio.
- Keep experimental code local to this prototype unless reuse becomes real across prototypes.
- Implementation must happen in staged review stops, as defined in [Implementation Plan](specs/implementation-plan.md).

## Detailed Specs

- [Implementation Plan](specs/implementation-plan.md) — Draft. Defines staged implementation and user review stop points.
- [Data And Media](specs/data-and-media.md) — Draft. Defines the local JSON database, fake data policy, media folders, and schema.
- [Collection Carousel](specs/collection-carousel.md) — Draft. Defines collection browsing, sleeve card states, and carousel interaction.
- [Album Detail Vinyl Player](specs/album-detail-vinyl-player.md) — Draft. Defines the detail layout, vinyl player components, controls, and staged wiring.
- [Vinyl Motion Physics](specs/vinyl-motion-physics.md) — Draft. Defines playback spin, braking, scrubbing, inertia, and playback mapping.
- [Stickers](specs/stickers.md) — Draft. Defines sticker tray, placement, surface behavior, and visual rules.
- [Transition And Visual System](specs/transition-and-visual-system.md) — Draft. Defines extraction timing, easing, materials, color, depth, and performance expectations.

## Non-Goals

- No mobile spec for v1.
- No accessibility spec for v1.
- No filtering or search for v1.
- No scaling concerns for large collections.
- No real commercial music or copyrighted album art unless the user later provides licensed assets.

## Design References

No external design source is currently canonical. Add screenshots, sketches, Figma notes, or generated references to `docs/references/` if future work becomes design-faithful.

The current mode is `balanced`: preserve the intended tactile feel while keeping implementation simple, readable, and maintainable.

## Implementation Notes

- Vinyl is the anchor object; surrounding UI appears after or around it.
- Separate physics state, visual rotation, and audio state.
- Decouple animation timing from interaction physics.
- Prefer GPU transforms: `translate`, `scale`, `rotate`, and `opacity`.
- Do not depend on remote media for a working v1.

## Test / Acceptance Checklist

- The setup stage creates a runnable npm workspace prototype.
- Each implementation stage ends with a documented user review stop.
- Static album detail components work before database wiring.
- Static collection components work before carousel physics.
- Data wiring works without remote network access.
- Empty collection and single-album states are accounted for.
- Vinyl glare remains visually static while vinyl stickers rotate.
- Vinyl interaction avoids instant stops and slider-like drag.
- Rapid clicks and drags cancel or settle animations safely.

## Known Shortcuts

- Albums, covers, stickers, and audio are fake or placeholder assets in v1.
- Playback can be visually stubbed before real audio is connected.
- No mobile behavior is specified.
- No accessibility behavior is specified.

## Open Questions

- What visual direction should the first generated album and sticker assets use?
- Should sticker editing become interactive, or stay display-only in v1?
- Which open-licensed audio source should be used if real audio becomes useful?
