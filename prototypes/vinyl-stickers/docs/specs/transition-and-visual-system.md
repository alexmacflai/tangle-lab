# Transition And Visual System

## Goal

Define the tactile transition, motion principles, material treatment, and visual constraints that make the prototype feel physical rather than utilitarian.

## Inputs / Assumptions

- Vinyl is the visual anchor.
- UI appears after the object motion starts.
- Use GPU-friendly transforms and opacity for major animation.
- No mobile visual spec is required for v1.

## Behavior

Vinyl extraction transition:

| Time | Event |
| --- | --- |
| 0ms | User clicks sleeve. |
| 0-120ms | Sleeve lifts. |
| 80-420ms | Vinyl slides out. |
| 220-520ms | Vinyl scales up. |
| 300-600ms | Info fades in. |
| 420-700ms | Stickers fade in. |

Easing:

- Vinyl motion uses `cubic-bezier(0.16,1,0.3,1)`.
- UI motion uses `cubic-bezier(0.22,1,0.36,1)`.
- Do not use linear easing for object motion.

Visual system:

- Base color is dark.
- Primary accent is purple.
- Sticker accents can use cyan, green, and pink.
- Vinyl shows grooves and a static highlight or glare.
- Sleeve uses minimal texture.
- UI is mostly flat and secondary.
- Depth uses soft shadows, subtle vignette, and optional restrained reflection.

Motion principles:

- Maintain object continuity from collection to detail.
- Avoid abrupt stops.
- Keep the vinyl as the anchor.
- Let UI arrive after object motion.
- Do not rotate glare with the vinyl.

Performance:

- Target 60fps.
- Use `transform` and `opacity` for animation.
- Avoid heavy blur.
- Avoid layout thrashing during drag, scroll, or physics loops.

Build stages:

1. **Basic Visual Direction**
   - Establish dark base, purple accent, sticker accent colors, sleeve texture, vinyl grooves, and static glare.
   - Stop for user review.

2. **Extraction Transition**
   - Add sleeve lift, vinyl slide, vinyl scale, info fade, and sticker fade using the defined timing.
   - Stop for user review.

3. **Performance And Failure Mode Pass**
   - Tune easing, animation cancellation, transform usage, and rapid interaction handling.
   - Stop for user review.

## Edge Cases

- Rapid clicks during transition cancel or settle safely.
- Reduced data should not leave broken visual layers.
- Static glare must stay aligned to the viewport or vinyl container, not the rotating record texture.
- Stickers should not create visual noise or cover the core object.

## Acceptance Checklist

- The transition feels like revealing an object.
- Vinyl motion starts before secondary UI appears.
- No major animation depends on layout-changing properties.
- Glare remains static while vinyl and vinyl stickers rotate.
- Visual failure modes are checked: instant stop, linear drag feel, rotating glare, and sticker clutter.

## Dependencies / Links

- [Collection Carousel](collection-carousel.md)
- [Album Detail Vinyl Player](album-detail-vinyl-player.md)
- [Vinyl Motion Physics](vinyl-motion-physics.md)
- [Stickers](stickers.md)
