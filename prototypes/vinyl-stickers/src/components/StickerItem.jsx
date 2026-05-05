import { useMemo, useState } from "react";

function stableRotation(seed) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 1000;
  }
  return Math.round((hash / 999) * 30 - 15);
}

export function StickerItem({ sticker, interactive = true, className = "" }) {
  const [isGrabbing, setIsGrabbing] = useState(false);
  const grabRotation = useMemo(() => stableRotation(sticker.id), [sticker.id]);

  function handlePointerDown(event) {
    if (!interactive) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsGrabbing(true);
  }

  function handlePointerUp(event) {
    if (!interactive) {
      return;
    }
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsGrabbing(false);
  }

  return (
    <button
      className={`sticker-item ${isGrabbing ? "is-grabbing" : ""} ${className}`}
      type="button"
      aria-label={sticker.label}
      data-sticker-id={sticker.id}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setIsGrabbing(false)}
      style={{
        "--sticker-width": `${sticker.width}px`,
        "--sticker-height": `${sticker.height}px`,
        "--grab-rotation": `${grabRotation}deg`,
      }}
    >
      <img src={sticker.src} alt="" draggable="false" />
    </button>
  );
}
