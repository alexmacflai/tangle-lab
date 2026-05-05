import { HeartIcon, MoreIcon } from "./Icons.jsx";

export function AlbumCard({
  album,
  state = "resting",
  showStickers = true,
  className = "",
}) {
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
          <button className="album-card__action" type="button" aria-label="Like album">
            <HeartIcon />
          </button>
          <button className="album-card__action" type="button" aria-label="More options">
            <MoreIcon />
          </button>
        </div>
      </div>
    </article>
  );
}
