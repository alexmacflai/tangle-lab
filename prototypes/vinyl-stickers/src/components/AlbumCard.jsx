import { useEffect, useState } from "react";
import { FALLBACK_COVER } from "../data/useAlbums.js";
import { HeartIcon, MoreIcon } from "./Icons.jsx";
import { SleeveStickerLayer } from "./SleeveStickerLayer.jsx";

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
        {showStickers && (
          <SleeveStickerLayer
            album={album}
            stickerClassName="album-card__sticker"
            onStickerDragStart={onStickerDragStart}
          />
        )}
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
