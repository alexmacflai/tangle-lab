import { useState } from "react";

function randomRotation() {
  return Math.round(Math.random() * 30 - 15);
}

export function StickerItem({ sticker, interactive = true, className = "" }) {
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [rotation, setRotation] = useState(0);

  function handlePointerDown(event) {
    if (!interactive) {
      return;
    }
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setRotation(randomRotation());
    setIsGrabbing(true);
  }

  function handlePointerUp(event) {
    if (!interactive) {
      return;
    }
    event.stopPropagation();
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
        "--sticker-rotation": `${rotation}deg`,
      }}
    >
      <img src={sticker.src} alt="" draggable="false" />
    </button>
  );
}
