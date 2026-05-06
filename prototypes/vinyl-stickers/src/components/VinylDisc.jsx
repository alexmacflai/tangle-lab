import { useEffect, useRef, useState } from "react";
import { FALLBACK_VINYL_ART, SHARED_VINYL_ART } from "../data/useAlbums.js";

const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeInCubic = (t) => t ** 3;
const SPIN_DURATION_MS = 5450;

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
  onSpinRateChange,
  externalProgress,
  externalProgressSource,
  progressPerTurn = 0.18,
}) {
  const [artSrc, setArtSrc] = useState(artImage || SHARED_VINYL_ART);
  const spinningLayersRef = useRef(null);
  const rampFrameRef = useRef(null);
  const spinAnimationRef = useRef(null);
  const isPlayingRef = useRef(isPlaying);
  const isDraggingRef = useRef(false);
  const lastAngleRef = useRef(0);
  const lastTsRef = useRef(0);
  const manualRateRef = useRef(0);
  const lastAppliedExternalProgressRef = useRef(null);
  isPlayingRef.current = isPlaying;

  const setPlaybackRate = (animation, rate) => {
    if (typeof animation.updatePlaybackRate === "function") {
      animation.updatePlaybackRate(rate);
    } else {
      animation.playbackRate = rate;
    }
  };

  const emitSpinRate = (rate, source, phase = "update", extras = {}) => {
    if (typeof onSpinRateChange === "function") {
      onSpinRateChange(rate, { source, phase, ...extras });
    }
  };

  const clampRate = (rate) => Math.max(0, Math.min(2.5, rate));

  const getEventAngle = (event) => {
    const element = spinningLayersRef.current;
    if (!element) return 0;
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return Math.atan2(event.clientY - centerY, event.clientX - centerX);
  };

  const normalizeAngleDelta = (delta) => {
    if (delta > Math.PI) return delta - Math.PI * 2;
    if (delta < -Math.PI) return delta + Math.PI * 2;
    return delta;
  };

  const runRateRamp = (targetRate, durationMs, easing, source) => {
    const animation = spinAnimationRef.current;
    if (!animation) return;

    if (rampFrameRef.current) {
      cancelAnimationFrame(rampFrameRef.current);
      rampFrameRef.current = null;
    }

    const startRate = animation.playbackRate ?? 0;
    const startTime = performance.now();
    animation.play();

    const tick = (now) => {
      if (isDraggingRef.current) {
        rampFrameRef.current = null;
        return;
      }

      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const easedProgress = easing(progress);
      const nextRate = startRate + (targetRate - startRate) * easedProgress;

      setPlaybackRate(animation, nextRate);
      emitSpinRate(nextRate, source);

      if (progress < 1) {
        rampFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      if (targetRate <= 0.0001) {
        animation.pause();
      }
      rampFrameRef.current = null;
    };

    rampFrameRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    const spinningLayers = spinningLayersRef.current;
    if (!spinningLayers) return;

    const animation = spinningLayers.animate(
      [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
      {
        duration: SPIN_DURATION_MS,
        iterations: Infinity,
        easing: "linear",
      },
    );
    animation.pause();
    animation.currentTime = 0;

    if (isPlayingRef.current) {
      setPlaybackRate(animation, 1);
      emitSpinRate(1, "auto");
      animation.play();
    } else {
      setPlaybackRate(animation, 0);
      emitSpinRate(0, "auto");
      animation.pause();
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
    if (!animation || isDraggingRef.current) return;

    const targetRate = isPlaying ? 1 : 0;
    const startRate = animation.playbackRate ?? 0;
    if (!isPlaying && startRate <= 0.0001) {
      setPlaybackRate(animation, 0);
      emitSpinRate(0, "auto");
      animation.pause();
      return;
    }

    runRateRamp(targetRate, isPlaying ? 280 : 360, isPlaying ? easeOutCubic : easeInCubic, "auto");
  }, [isPlaying]);

  useEffect(() => {
    const animation = spinAnimationRef.current;
    if (!animation || isDraggingRef.current) return;
    if (typeof externalProgress !== "number" || Number.isNaN(externalProgress)) return;
    if (externalProgressSource !== "slider") return;
    if (progressPerTurn <= 0) return;

    const clamped = Math.max(0, Math.min(1, externalProgress));
    if (lastAppliedExternalProgressRef.current === clamped) return;
    lastAppliedExternalProgressRef.current = clamped;

    const turns = clamped / progressPerTurn;
    animation.currentTime = turns * SPIN_DURATION_MS;
  }, [externalProgress, externalProgressSource, progressPerTurn]);

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    const animation = spinAnimationRef.current;
    const element = spinningLayersRef.current;
    if (!animation || !element) return;

    isDraggingRef.current = true;
    if (rampFrameRef.current) {
      cancelAnimationFrame(rampFrameRef.current);
      rampFrameRef.current = null;
    }

    element.setPointerCapture(event.pointerId);
    lastAngleRef.current = getEventAngle(event);
    lastTsRef.current = performance.now();
    manualRateRef.current = 0;
    animation.play();
    setPlaybackRate(animation, 0);
    emitSpinRate(0, "manual", "start");
  };

  const handlePointerMove = (event) => {
    if (!isDraggingRef.current) return;
    const animation = spinAnimationRef.current;
    if (!animation) return;

    const angle = getEventAngle(event);
    const now = performance.now();
    const deltaAngle = normalizeAngleDelta(angle - lastAngleRef.current);
    const deltaMs = Math.max(1, now - lastTsRef.current);
    const baseAngularVelocity = (Math.PI * 2) / SPIN_DURATION_MS;
    const instantaneousRate = Math.abs(deltaAngle / deltaMs) / baseAngularVelocity;
    const smoothedRate = clampRate(manualRateRef.current * 0.72 + instantaneousRate * 0.28);

    manualRateRef.current = smoothedRate;
    lastAngleRef.current = angle;
    lastTsRef.current = now;

    const deltaTimeMs = (deltaAngle / (Math.PI * 2)) * SPIN_DURATION_MS;
    const currentTime = typeof animation.currentTime === "number" ? animation.currentTime : 0;
    animation.currentTime = currentTime + deltaTimeMs;
    setPlaybackRate(animation, smoothedRate);
    emitSpinRate(smoothedRate, "manual", "move", { deltaTimeMs, deltaAngle });
  };

  const endManualSpin = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    emitSpinRate(manualRateRef.current, "manual", "end");

    const targetRate = isPlayingRef.current ? 1 : 0;
    runRateRamp(
      targetRate,
      isPlayingRef.current ? 260 : 320,
      isPlayingRef.current ? easeOutCubic : easeInCubic,
      "auto",
    );
  };

  return (
    <div
      className={`vinyl-disc ${isPlaying ? "is-playing" : ""}`}
      aria-label={isPlaying ? "Vinyl spinning" : "Vinyl paused"}
      style={{ "--vinyl-size": typeof size === "number" ? `${size}px` : size }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endManualSpin}
      onPointerCancel={endManualSpin}
      onLostPointerCapture={endManualSpin}
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
