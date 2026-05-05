# Collection Carousel

## Goal

Define the collection browsing screen where albums feel like physical sleeves arranged in a horizontal carousel.

## Inputs / Assumptions

- First implementation uses hardcoded mock data.
- Data wiring later uses `public/data/albums.json`.
- Stickers on sleeves are visible but read-only in the collection.
- No mobile behavior is required for v1.

## Behavior

Layout:

- Header shows `My Collection` and an album count.
- Main area shows a horizontal sleeve carousel with 5 to 9 visible items when space allows.
- Footer shows a sticker strip or preview of available sticker styles.
- The focused album sits centered and visually frontmost.
- Side items angle away from the focused album.

Carousel visual states:

| State | Scale | Rotation | Opacity |
| --- | --- | --- | --- |
| Focused | 1.0 | 0deg | 100% |
| Adjacent | 0.85 | +/-12deg | 80% |
| Far | 0.7 | +/-25deg | 50% |

Interaction:

- Users can drag or scroll horizontally.
- Motion has momentum.
- The carousel snaps to the nearest album center.
- Hovering a sleeve scales it to `1.03` and lifts it `-4px`.
- Clicking the focused or hovered sleeve starts the open/detail flow.
- Final vinyl extraction polish belongs to [Transition And Visual System](transition-and-visual-system.md).

Build stages:

1. **Static Collection Components**
   - Build sleeve card and carousel layout with hardcoded mock data.
   - Show focused, adjacent, and far states.
   - Do not add real data loading, snapping physics, or detail transition.
   - Stop for user review.

2. **Data Wiring**
   - Replace hardcoded mock data with local album JSON.
   - Preserve the same visual states.
   - Stop for user review.

3. **Carousel Interaction**
   - Add drag/scroll, momentum, snapping, hover lift, and click-to-open behavior.
   - Stop for user review.

## Edge Cases

- Empty collection shows `No records yet`.
- Single album is centered with no carousel motion requirement.
- Rapid drag/click interactions cancel or settle safely.
- If sticker data is missing, sleeves still render.

## Acceptance Checklist

- Static collection UI works before data wiring.
- Focused, adjacent, and far states match the table.
- Hover lift does not shift surrounding layout.
- Drag/scroll and snap feel physical, not like a standard list.
- Empty and single-album states are explicitly implemented.

## Dependencies / Links

- [Implementation Plan](implementation-plan.md)
- [Data And Media](data-and-media.md)
- [Stickers](stickers.md)
- [Transition And Visual System](transition-and-visual-system.md)
