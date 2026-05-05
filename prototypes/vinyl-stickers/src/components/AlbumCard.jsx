import { useState } from "react";
import { HeartIcon, MoreIcon } from "./Icons.jsx";

export function AlbumCard({
  album,
  state = "resting",
  showStickers = false,
  initialFavorite = false,
  className = "",
}) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const isFocused = state === "focused";

  return (
    <article className={`album-card album-card--${state} ${className}`}>
      <div className="album-card__cover-wrap">
        <img className="album-card__cover" src={album.cover} alt="" />
        {showStickers &&
          album.stickers?.map((sticker) => (
            <img
              className="album-card__sticker"
              key={sticker.id}
              src={sticker.src}
              alt={sticker.label}
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
              setIsFavorite((current) => !current);
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
