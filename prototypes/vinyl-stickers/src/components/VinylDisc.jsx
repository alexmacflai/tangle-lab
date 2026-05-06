import { useEffect, useState } from "react";
import { FALLBACK_VINYL_ART, SHARED_VINYL_ART } from "../data/useAlbums.js";

const placeholderStickers = [
  {
    id: "vinyl-star",
    src: "/media/stickers/star.png",
    label: "Star sticker",
    x: 69,
    y: 28,
    width: 78,
    height: 76,
    rotation: 18,
  },
  {
    id: "vinyl-lightning",
    src: "/media/stickers/lightning.png",
    label: "Lightning sticker",
    x: 31,
    y: 68,
    width: 48,
    height: 84,
    rotation: -14,
  },
];

export function VinylDisc({
  isPlaying = false,
  baseImage = "/media/vinyl/base-black.png",
  dustImage = "/media/vinyl/dust.png",
  artImage = SHARED_VINYL_ART,
  stickers = placeholderStickers,
  size = 420,
}) {
  const [artSrc, setArtSrc] = useState(artImage || SHARED_VINYL_ART);

  useEffect(() => {
    setArtSrc(artImage || SHARED_VINYL_ART);
  }, [artImage]);

  return (
    <div
      className={`vinyl-disc ${isPlaying ? "is-playing" : ""}`}
      aria-label={isPlaying ? "Vinyl spinning" : "Vinyl paused"}
      style={{ "--vinyl-size": typeof size === "number" ? `${size}px` : size }}
    >
      <img className="vinyl-disc__layer vinyl-disc__base" src={baseImage} alt="" />
      <div className="vinyl-disc__spinning-layers">
        <img className="vinyl-disc__layer vinyl-disc__dust" src={dustImage} alt="" />
        <div className="vinyl-disc__art-wrap" aria-hidden="true">
          <img
            className="vinyl-disc__art"
            src={artSrc}
            alt=""
            onError={() => setArtSrc(FALLBACK_VINYL_ART)}
          />
        </div>
        <div className="vinyl-disc__stickers" aria-hidden="true">
          {stickers.map((sticker) => (
            <img
              className="vinyl-disc__sticker"
              key={sticker.id}
              src={sticker.src}
              alt=""
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
      </div>
    </div>
  );
}
