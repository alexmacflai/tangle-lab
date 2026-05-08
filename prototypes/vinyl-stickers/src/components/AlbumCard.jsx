import { useEffect, useState } from "react";
import { getSurfaceStickers } from "../data/stickerSurfaces.js";
import { FALLBACK_COVER } from "../data/useAlbums.js";
import { HeartIcon, MoreIcon } from "./Icons.jsx";

export function AlbumCard({
  album,
  state = "resting",
  showStickers = false,
  isFavorite = false,
  onToggleFavorite,
  onStickerDragStart,
  className = "",
}) {
  const [coverSrc, setCoverSrc] = useState(album.cover || FALLBACK_COVER);
  const isFocused = state === "focused";
  const sleeveStickers = getSurfaceStickers(album, "sleeve");

  useEffect(() => {
    setCoverSrc(album.cover || FALLBACK_COVER);
  }, [album.cover]);

  return (
    <article className={`album-card album-card--${state} ${className}`}>
      <div className="album-card__cover-wrap">
        <img
          className="album-card__cover"
          src={coverSrc}
          alt=""
          onError={() => setCoverSrc(FALLBACK_COVER)}
        />
        {showStickers &&
          sleeveStickers.map((sticker) => (
            <img
              className="album-card__sticker"
              key={sticker.id}
              src={sticker.src}
              alt={sticker.label}
              onPointerDown={(event) => onStickerDragStart?.(album, sticker, "sleeve", event)}
              style={{
                "--sticker-x": `${sticker.x}%`,
                "--sticker-y": `${sticker.y}%`,
                "--sticker-width": `${sticker.width}px`,
                "--sticker-height": `${sticker.height}px`,
                "--sticker-rotation": `${sticker.rotation}deg`,
              }}
            />
          ))}
      </div>
      <div className="album-card__meta">
        <div className="album-card__copy">
          <h3>{album.title}</h3>
          <p>{album.artist}</p>
        </div>
        <div className="album-card__actions" aria-hidden={!isFocused}>
          <button
            className={`album-card__action album-card__favorite ${isFavorite ? "is-active" : ""}`}
            type="button"
            aria-label={isFavorite ? "Remove favorite" : "Favorite album"}
            aria-pressed={isFavorite}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite?.(album.id);
            }}
          >
            <HeartIcon filled={isFavorite} />
          </button>
          <button
            className="album-card__action"
            type="button"
            aria-label="More options"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <MoreIcon />
          </button>
        </div>
      </div>
    </article>
  );
}
