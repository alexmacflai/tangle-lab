# Implementation Plan

## Goal

Guide AI implementation in small, reviewable stages. Each stage must complete, then stop for user checking or testing before the next stage begins.

## Inputs / Assumptions

- Main spec: [Vinyl Stickers Prototype Spec](../spec.md).
- Work mode is `balanced`.
- The first implementation stage is environment and project structure setup.
- Specs are created before meaningful implementation files are built.

## Behavior

Implementation must follow these stages in order:

1. **Environment + Structure**
   - Create `prototypes/vinyl-stickers/`.
   - Add package setup for a React + Vite npm workspace prototype.
   - Add `index.html`, `src/`, `public/`, `public/data/`, `public/media/covers/`, `public/media/audio/`, and `public/media/stickers/`.
   - Add minimal source placeholders only where needed to run the app.
   - Add root npm scripts for dev and build if needed.
   - Stop for user review.

2. **Static Album Detail Components**
   - Build sleeve, vinyl, metadata panel, playback controls, and sticker tray with hardcoded mock data.
   - Do not connect to JSON data.
   - Do not connect real audio.
   - Do not link from the carousel.
   - Stop for user review.

3. **Static Collection Components**
   - Build sleeve card and center-focused carousel layout with hardcoded mock data.
   - Include focused, adjacent, and far visual states.
   - Do not add real data loading, snapping physics, or detail transition yet.
   - Stop for user review.

4. **Data + Media Wiring**
   - Add `public/data/albums.json`.
   - Add local data loading helpers.
   - Wire collection and detail screens to the same fake local data.
   - Use stable fallbacks for missing images and audio.
   - Stop for user review.

5. **Carousel Interaction**
   - Add horizontal drag or scroll.
   - Add momentum and snap-to-center.
   - Add hover lift.
   - Add click-to-open behavior without final extraction polish.
   - Stop for user review.

6. **Vinyl Player Physics**
   - Add play spin, hold-to-brake, drag scrubbing, release inertia, and progress mapping.
   - Keep audio state stubbed unless local/open audio is ready.
   - Stop for user review.

7. **Transition + Sticker Surface Behavior**
   - Add vinyl extraction transition.
   - Add sticker placement and surface transform behavior.
   - Ensure glare does not rotate while vinyl stickers do rotate.
   - Cancel or settle rapid interactions safely.
   - Stop for user review.

8. **Polish + Performance Pass**
   - Tune timing, easing, shadows, material details, and responsive desktop constraints.
   - Verify 60fps-friendly transform usage.
   - Check edge cases and failure modes.
   - Stop for final review.

## Edge Cases

- If a stage uncovers a missing product decision, stop and document the open question before continuing.
- If a stage requires taking a shortcut, update the main spec or relevant child spec under Known Shortcuts.
- If a stage changes behavior from the spec, update the spec in the same stage.

## Acceptance Checklist

- Every implementation stage has a clear stop point.
- The first stage is environment setup, not visual feature work.
- Static detail work happens before database and carousel integration.
- Static collection work happens before carousel physics.
- Audio remains stubbed until after visual and data stages are reviewed.

## Dependencies / Links

- [Data And Media](data-and-media.md)
- [Collection Carousel](collection-carousel.md)
- [Album Detail Vinyl Player](album-detail-vinyl-player.md)
- [Vinyl Motion Physics](vinyl-motion-physics.md)
- [Stickers](stickers.md)
- [Transition And Visual System](transition-and-visual-system.md)
