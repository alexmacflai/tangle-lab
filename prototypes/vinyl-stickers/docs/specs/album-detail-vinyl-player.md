# Album Detail Vinyl Player

## Goal

Define the album detail screen where the vinyl dominates the interface and acts as the primary playback control surface.

## Inputs / Assumptions

- First implementation uses hardcoded mock data.
- Data wiring later uses the same album JSON as the collection.
- Playback is visually stubbed before real audio is connected.
- Vinyl interaction details live in [Vinyl Motion Physics](vinyl-motion-physics.md).

## Behavior

Layout:

- Left side contains sleeve and vinyl.
- Vinyl dominates the screen and visually anchors the layout.
- Sleeve sits behind or partially behind the vinyl.
- Right side contains metadata and playback controls.
- Bottom area contains the sticker tray.

Components:

- Sleeve display with visible sleeve stickers.
- Vinyl display with a fixed base/glare layer, spinning dust texture, spinning center art, and a spinning clipped sticker surface.
- Metadata panel with album title, artist, year, and track list.
- Playback controls for play/pause and visible progress.
- Album info and playback panel can be reviewed as a standalone component before full detail page assembly.
- Sticker tray with available stickers or current album stickers.

Vinyl layer order:

1. Base vinyl image. Supports color variants later; does not spin during playback.
2. Dust texture. Spins during playback.
3. Center art image. Comes from album media later; spins during playback.
4. Sticker container. Circular, clips stickers outside the disc, and spins during playback.

Playback surface states:

| State | Trigger | Behavior |
| --- | --- | --- |
| Idle | Default | Vinyl is still. |
| Playing | Play action | Vinyl spins. |
| Braking | Hold on vinyl | Vinyl slows with resistance. |
| Scrubbing | Drag on vinyl | Vinyl follows pointer angle. |
| Release | Mouseup after drag | Vinyl continues with inertia, then settles or blends back to play speed. |

Build stages:

1. **Static Album Detail Components**
   - Build sleeve, vinyl, metadata panel, playback controls, and sticker tray with hardcoded mock data.
   - Do not connect to JSON data.
   - Do not connect real audio.
   - Do not link from the carousel.
   - Stop for user review.

2. **Data Wiring**
   - Load album data from the local JSON source.
   - Preserve static component layout and fallbacks.
   - Stop for user review.

3. **Playback State Stub**
   - Add play/pause state, visual progress, and disabled or stubbed audio behavior.
   - Keep actual vinyl physics separate.
   - Stop for user review.

4. **Vinyl Physics Integration**
   - Connect visual playback state to the vinyl physics model.
   - Keep audio state decoupled from visual rotation.
   - Stop for user review.

## Edge Cases

- Missing tracks disable or stub playback controls while keeping the detail screen visible.
- Missing sleeve image uses a local placeholder or CSS-generated sleeve.
- Missing audio keeps the play control in visual-only mode.
- Rapid play, hold, drag, and release interactions settle safely.

## Acceptance Checklist

- Static detail screen works before database wiring.
- Vinyl is visually dominant.
- UI feels secondary to the vinyl.
- Playback controls are visible but do not become the main interaction.
- Audio can remain stubbed without blocking interaction design.

## Dependencies / Links

- [Implementation Plan](implementation-plan.md)
- [Data And Media](data-and-media.md)
- [Vinyl Motion Physics](vinyl-motion-physics.md)
- [Stickers](stickers.md)
- [Transition And Visual System](transition-and-visual-system.md)
