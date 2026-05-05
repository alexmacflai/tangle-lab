# Stickers

## Goal

Define how stickers add expression while staying physically attached to either the sleeve or the vinyl.

## Inputs / Assumptions

- Stickers are read-only in the collection view for v1.
- Sticker editing may be explored later, but v1 focuses on display, tray, and surface behavior.
- Sticker data comes from the album JSON once data wiring begins.
- Sticker images live in `public/media/stickers/`.

## Behavior

Placement:

- Stickers can belong to `sleeve` or `vinyl`.
- Each surface should show no more than 2 to 3 stickers.
- Sticker `x` and `y` use normalized surface coordinates.
- Stickers should snap visually to the surface they belong to.
- Avoid clutter; empty space is part of the visual system.

Surface behavior:

- Sleeve stickers follow sleeve transforms in carousel and detail views.
- Vinyl stickers rotate with the vinyl.
- Vinyl glare does not rotate.
- Stickers on the vinyl do rotate.
- Stickers should not float independently from their parent surface.

Sticker tray:

- The detail screen includes a bottom sticker tray.
- The tray can show available sticker styles, stickers already on the album, or both.
- V1 tray behavior can be display-only unless a later stage explicitly adds editing.

Build stages:

1. **Static Sticker Rendering**
   - Render hardcoded stickers on sleeve and vinyl surfaces.
   - Stop for user review.

2. **Data Wiring**
   - Render stickers from album JSON.
   - Use fallback colored labels if sticker images are missing.
   - Stop for user review.

3. **Surface Transform Behavior**
   - Ensure sleeve stickers follow sleeve transforms.
   - Ensure vinyl stickers rotate with the vinyl.
   - Ensure glare remains static.
   - Stop for user review.

## Edge Cases

- If a surface has more than 3 stickers in data, show only the first 2 to 3 or document the chosen cap.
- Missing sticker image uses a colored fallback label.
- Invalid surface values should not break album rendering.
- Stickers should not cover essential metadata or playback controls.

## Acceptance Checklist

- Stickers visibly attach to the correct surface.
- Sleeve stickers transform with sleeves.
- Vinyl stickers rotate with the vinyl.
- Glare does not rotate.
- Sticker quantity stays visually restrained.

## Dependencies / Links

- [Data And Media](data-and-media.md)
- [Collection Carousel](collection-carousel.md)
- [Album Detail Vinyl Player](album-detail-vinyl-player.md)
- [Transition And Visual System](transition-and-visual-system.md)
