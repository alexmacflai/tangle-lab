# Data And Media

## Goal

Define a simple local JSON database and media strategy that supports the prototype without remote dependencies or licensing risk.

## Inputs / Assumptions

- V1 uses fake local data.
- Database file: `public/data/albums.json`.
- Media folders:
  - `public/media/covers/`
  - `public/media/audio/`
  - `public/media/stickers/`
- Remote URLs may exist in the schema later, but v1 must work offline after install.
- Real commercial music and copyrighted album art are out of scope unless the user provides licensed assets.

## Behavior

The database should expose an `albums` array:

```json
{
  "albums": [
    {
      "id": "fake-album-001",
      "title": "Midnight Static",
      "artist": "The Soft Cuts",
      "year": 1984,
      "addedOn": "2026-01-18",
      "isFavorite": false,
      "coverImage": "/media/covers/midnight-static-cover.png",
      "sleeveImage": "/media/covers/midnight-static-sleeve.png",
      "vinylVariant": "black",
      "tracks": [
        {
          "id": "fake-track-001",
          "title": "Needle Glow",
          "durationSeconds": 108,
          "audioUrl": null,
          "isPlayable": false
        }
      ],
      "stickers": [
        {
          "id": "sticker-001",
          "label": "Hot",
          "image": "/media/stickers/hot.png",
          "surface": "sleeve",
          "x": 0.18,
          "y": 0.72,
          "rotation": -8,
          "scale": 1,
          "color": "#ff4fa3"
        }
      ]
    }
  ]
}
```

Field rules:

- `album.id`, `track.id`, and `sticker.id` are stable strings.
- `addedOn` is an ISO date string (`YYYY-MM-DD`) used for later sorting.
- `isFavorite` is a boolean used for later favorite filtering and heart state.
- `coverImage`, `sleeveImage`, `image`, and `audioUrl` are public URLs relative to the prototype root.
- `vinylVariant` starts as a small string such as `black`, `purple`, `transparent`, or `marbled`.
- `durationSeconds` is required even when audio is not playable.
- `audioUrl` is optional or `null` until local/open audio is added.
- `isPlayable` defaults to `false` for stub tracks.
- `surface` is either `sleeve` or `vinyl`.
- Sticker `x` and `y` are normalized surface coordinates from `0` to `1`.
- Sticker `rotation` is degrees.
- Sticker `scale` is a visual multiplier.
- Albums can keep `stickers: []` until placement editing exists.
- Missing images should fall back to generated CSS or local placeholders.
- Missing audio should keep controls usable in visual stub mode.

## Edge Cases

- Empty `albums` array shows the collection empty state.
- A single album is centered and does not require carousel motion.
- Missing `tracks` means the album can still render but playback controls are disabled or stubbed.
- Missing sticker images can render as simple colored labels.
- Remote media failure must not block the prototype if remote URLs are introduced later.

## Acceptance Checklist

- The schema is concrete enough for implementation without field guessing.
- Data wiring can work without internet access.
- Fake data can support both collection and detail screens.
- Audio can remain stubbed while preserving duration and progress behavior.
- Media folders are local to the prototype.

## Dependencies / Links

- [Implementation Plan](implementation-plan.md)
- [Album Detail Vinyl Player](album-detail-vinyl-player.md)
- [Collection Carousel](collection-carousel.md)
- [Stickers](stickers.md)
