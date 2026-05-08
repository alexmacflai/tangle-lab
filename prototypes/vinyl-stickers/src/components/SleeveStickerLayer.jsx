import { getSurfaceStickers } from "../data/stickerSurfaces.js";

export function SleeveStickerLayer({
  album,
  className = "",
  stickerClassName = "sleeve-sticker",
  onStickerDragStart,
}) {
  const sleeveStickers = getSurfaceStickers(album, "sleeve");

  if (sleeveStickers.length === 0) {
    return null;
  }

  return (
    <div className={`sleeve-sticker-layer ${className}`} aria-hidden="true">
      {sleeveStickers.map((sticker) => (
        <img
          className={`sleeve-sticker ${stickerClassName}`}
          key={sticker.id}
          src={sticker.src}
          alt=""
          onPointerDown={(event) => onStickerDragStart?.(album, sticker, "sleeve", event)}
          style={{
            "--sticker-x": `${sticker.x}%`,
            "--sticker-y": `${sticker.y}%`,
            "--sticker-width": `${(sticker.width / 480) * 100}%`,
            "--sticker-height": `${(sticker.height / 480) * 100}%`,
            "--sticker-rotation": `${sticker.rotation}deg`,
          }}
        />
      ))}
    </div>
  );
}
