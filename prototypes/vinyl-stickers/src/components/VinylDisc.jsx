import { useEffect, useRef, useState } from "react";
import { FALLBACK_VINYL_ART, SHARED_VINYL_ART } from "../data/useAlbums.js";

const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeInCubic = (t) => t ** 3;

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
  const spinningLayersRef = useRef(null);
  const rampFrameRef = useRef(null);
  const spinAnimationRef = useRef(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  useEffect(() => {
    const spinningLayers = spinningLayersRef.current;
    if (!spinningLayers) return;

    const animation = spinningLayers.animate(
      [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
      {
        duration: 5450,
        iterations: Infinity,
        easing: "linear",
      },
    );
    animation.pause();
    animation.currentTime = 0;

    if (isPlayingRef.current) {
      if (typeof animation.updatePlaybackRate === "function") {
        animation.updatePlaybackRate(1);
      } else {
        animation.playbackRate = 1;
      }
      animation.play();
    } else if (typeof animation.updatePlaybackRate === "function") {
      animation.updatePlaybackRate(0);
    } else {
      animation.playbackRate = 0;
    }

    spinAnimationRef.current = animation;

    return () => {
      if (rampFrameRef.current) {
        cancelAnimationFrame(rampFrameRef.current);
      }
      if (spinAnimationRef.current) {
        spinAnimationRef.current.cancel();
        spinAnimationRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setArtSrc(artImage || SHARED_VINYL_ART);
  }, [artImage]);

  useEffect(() => {
    const animation = spinAnimationRef.current;
    if (!animation) return;

    const setPlaybackRate = (rate) => {
      if (typeof animation.updatePlaybackRate === "function") {
        animation.updatePlaybackRate(rate);
      } else {
        animation.playbackRate = rate;
      }
    };

    if (rampFrameRef.current) {
      cancelAnimationFrame(rampFrameRef.current);
      rampFrameRef.current = null;
    }

    const startRate = animation.playbackRate ?? 1;
    const targetRate = isPlaying ? 1 : 0;

    // Do not enter the ramp path when already fully stopped.
    // This guarantees no startup motion on initial paused render.
    if (!isPlaying && startRate <= 0.0001) {
      setPlaybackRate(0);
      animation.pause();
      animation.currentTime = 0;
      return;
    }

    const durationMs = isPlaying ? 280 : 360;
    const startTime = performance.now();

    animation.play();

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const easedProgress = isPlaying ? easeOutCubic(progress) : easeInCubic(progress);
      const nextRate = startRate + (targetRate - startRate) * easedProgress;

      setPlaybackRate(nextRate);

      if (progress < 1) {
        rampFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      if (!isPlaying) {
        animation.pause();
      }
      rampFrameRef.current = null;
    };

    rampFrameRef.current = requestAnimationFrame(tick);
  }, [isPlaying]);

  return (
    <div
      className={`vinyl-disc ${isPlaying ? "is-playing" : ""}`}
      aria-label={isPlaying ? "Vinyl spinning" : "Vinyl paused"}
      style={{ "--vinyl-size": typeof size === "number" ? `${size}px` : size }}
    >
      <img className="vinyl-disc__layer vinyl-disc__base" src={baseImage} alt="" />
      <div className="vinyl-disc__spinning-layers" ref={spinningLayersRef}>
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
