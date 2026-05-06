import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { stickerAssets } from "../data/libraryMock.js";
import { FALLBACK_COVER } from "../data/useAlbums.js";
import { AlbumInfoPlaybackPanel } from "./AlbumInfoPlaybackPanel.jsx";
import { CarouselBlurBackground } from "./CarouselBlurBackground.jsx";
import { HeartIcon, MoreIcon } from "./Icons.jsx";
import { StickerStrip } from "./StickerStrip.jsx";
import { VinylDisc } from "./VinylDisc.jsx";

const AUDIO_RATE_MIN = 0.08;
const AUDIO_RAMP_UP_MS = 280;
const AUDIO_RAMP_DOWN_MS = 360;
const BASE_STAGE_HEIGHT = 640;
const SPIN_DURATION_MS = 5450;
const TRACK_DURATION_SECONDS = 6 * 60 + 27;
const INITIAL_PROGRESS = 0;
const PROGRESS_PER_FULL_TURN = 0.18;

const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeInCubic = (t) => t ** 3;

const clamp01 = (value) => Math.max(0, Math.min(1, value));

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function BackIcon() {
  return (
    <svg className="icon detail-header__back-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function DetailSleeve({ album }) {
  const [coverSrc, setCoverSrc] = useState(album.cover || FALLBACK_COVER);

  useEffect(() => {
    setCoverSrc(album.cover || FALLBACK_COVER);
  }, [album.cover]);

  return (
    <div className="detail-sleeve-rail" aria-hidden="true">
      <div className="detail-sleeve">
        <img src={coverSrc} alt="" onError={() => setCoverSrc(FALLBACK_COVER)} />
      </div>
    </div>
  );
}

export function DetailPrototype({ album, onBack }) {
  const [bgSrc, setBgSrc] = useState(album.cover || FALLBACK_COVER);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visualProgress, setVisualProgress] = useState(INITIAL_PROGRESS);
  const [trackDurationSeconds, setTrackDurationSeconds] = useState(TRACK_DURATION_SECONDS);
  const mainRef = useRef(null);
  const detailMainRef = useRef(null);
  const audioElementRef = useRef(null);
  const audioRampFrameRef = useRef(null);
  const stopFallbackTimerRef = useRef(null);
  const desiredPlayingRef = useRef(false);
  const commandIdRef = useRef(0);
  const isManualSpinActiveRef = useRef(false);
  const visualProgressRef = useRef(INITIAL_PROGRESS);
  const progressSourceRef = useRef("audio");

  useEffect(() => {
    visualProgressRef.current = visualProgress;
  }, [visualProgress]);

  function handleSpinRateChange(rate, metadata = {}) {
    const audio = audioElementRef.current;
    if (!audio) return;

    const { source = "auto", phase = "update" } = metadata;
    const isManual = source === "manual";
    const safeRate = Math.max(0, Math.min(2.5, rate || 0));

    if (isManual && phase === "start") {
      isManualSpinActiveRef.current = true;
      commandIdRef.current += 1;
      if (stopFallbackTimerRef.current) {
        clearTimeout(stopFallbackTimerRef.current);
        stopFallbackTimerRef.current = null;
      }
      if (audioRampFrameRef.current) {
        cancelAnimationFrame(audioRampFrameRef.current);
        audioRampFrameRef.current = null;
      }

      setAudioPitchBehavior(audio);
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    }

    if (isManual) {
      if (phase === "move" && typeof metadata.deltaTimeMs === "number") {
        const deltaTurns = metadata.deltaTimeMs / SPIN_DURATION_MS;
        const deltaProgress = deltaTurns * PROGRESS_PER_FULL_TURN;
        const nextProgress = clamp01(visualProgressRef.current + deltaProgress);
        progressSourceRef.current = "vinyl";
        visualProgressRef.current = nextProgress;
        setVisualProgress(nextProgress);

        const duration =
          Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : trackDurationSeconds;
        audio.currentTime = nextProgress * duration;
      }

      const clampedManualRate = Math.max(AUDIO_RATE_MIN, safeRate);
      audio.playbackRate = clampedManualRate;
      audio.volume = Math.max(0, Math.min(1, safeRate / 1.2));

      if (phase === "end") {
        isManualSpinActiveRef.current = false;
        if (!desiredPlayingRef.current) {
          audio.pause();
          audio.playbackRate = AUDIO_RATE_MIN;
          audio.volume = 0;
        }
      }
      return;
    }

    if (isManualSpinActiveRef.current) {
      return;
    }
    if (audio.paused) return;

    const clampedRate = Math.max(AUDIO_RATE_MIN, Math.min(2.5, safeRate || AUDIO_RATE_MIN));
    audio.playbackRate = clampedRate;
  }

  function setAudioPitchBehavior(audio) {
    audio.preservesPitch = false;
    audio.webkitPreservesPitch = false;
    audio.mozPreservesPitch = false;
  }

  function rampAudioPlayback(shouldPlay, commandId) {
    const audio = audioElementRef.current;
    if (!audio) return;
    if (isManualSpinActiveRef.current) return;

    if (stopFallbackTimerRef.current) {
      clearTimeout(stopFallbackTimerRef.current);
      stopFallbackTimerRef.current = null;
    }

    if (audioRampFrameRef.current) {
      cancelAnimationFrame(audioRampFrameRef.current);
      audioRampFrameRef.current = null;
    }

    const startRate = Math.max(AUDIO_RATE_MIN, audio.playbackRate || AUDIO_RATE_MIN);
    const targetRate = shouldPlay ? 1 : AUDIO_RATE_MIN;
    const startVolume = Math.max(0, Math.min(1, audio.volume ?? 1));
    const targetVolume = shouldPlay ? 1 : 0;
    const durationMs = shouldPlay ? AUDIO_RAMP_UP_MS : AUDIO_RAMP_DOWN_MS;
    const startTime = performance.now();

    const tick = (now) => {
      if (commandId !== commandIdRef.current) {
        return;
      }

      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const easedProgress = shouldPlay ? easeOutCubic(progress) : easeInCubic(progress);
      const nextRateRaw = startRate + (targetRate - startRate) * easedProgress;
      const nextVolumeRaw = startVolume + (targetVolume - startVolume) * easedProgress;
      const nextRate = Math.max(AUDIO_RATE_MIN, Math.min(1, nextRateRaw));
      const nextVolume = Math.max(0, Math.min(1, nextVolumeRaw));

      audio.playbackRate = nextRate;
      audio.volume = nextVolume;

      if (progress < 1) {
        audioRampFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      if (!shouldPlay && commandId === commandIdRef.current) {
        audio.pause();
      }
      audioRampFrameRef.current = null;
    };

    audioRampFrameRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio) return undefined;

    audio.playbackRate = AUDIO_RATE_MIN;
    audio.volume = 0;
    setAudioPitchBehavior(audio);

    const syncDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setTrackDurationSeconds(audio.duration);
      }
    };

    const syncProgress = () => {
      const duration =
        Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : TRACK_DURATION_SECONDS;
      const nextProgress = clamp01((audio.currentTime || 0) / duration);
      progressSourceRef.current = "audio";
      visualProgressRef.current = nextProgress;
      setVisualProgress(nextProgress);
    };

    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("durationchange", syncDuration);
    audio.addEventListener("timeupdate", syncProgress);

    return () => {
      audio.removeEventListener("loadedmetadata", syncDuration);
      audio.removeEventListener("durationchange", syncDuration);
      audio.removeEventListener("timeupdate", syncProgress);
      commandIdRef.current += 1;
      if (stopFallbackTimerRef.current) {
        clearTimeout(stopFallbackTimerRef.current);
        stopFallbackTimerRef.current = null;
      }
      if (audioRampFrameRef.current) {
        cancelAnimationFrame(audioRampFrameRef.current);
        audioRampFrameRef.current = null;
      }
      audio.pause();
      audio.currentTime = 0;
      audio.playbackRate = AUDIO_RATE_MIN;
      audio.volume = 0;
    };
  }, []);

  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio) return;

    isManualSpinActiveRef.current = false;
    desiredPlayingRef.current = false;
    commandIdRef.current += 1;
    setIsPlaying(false);

    if (stopFallbackTimerRef.current) {
      clearTimeout(stopFallbackTimerRef.current);
      stopFallbackTimerRef.current = null;
    }
    if (audioRampFrameRef.current) {
      cancelAnimationFrame(audioRampFrameRef.current);
      audioRampFrameRef.current = null;
    }

    audio.pause();
    audio.currentTime = 0;
    audio.playbackRate = AUDIO_RATE_MIN;
    audio.volume = 0;
    visualProgressRef.current = INITIAL_PROGRESS;
    setVisualProgress(INITIAL_PROGRESS);
  }, [album.id]);

  function handlePlayPause() {
    const audio = audioElementRef.current;
    if (!audio) return;

    const shouldPlay = !desiredPlayingRef.current;
    desiredPlayingRef.current = shouldPlay;
    if (isManualSpinActiveRef.current) {
      isManualSpinActiveRef.current = false;
    }
    commandIdRef.current += 1;
    const commandId = commandIdRef.current;

    if (!shouldPlay) {
      setIsPlaying(false);
      rampAudioPlayback(false, commandId);
      stopFallbackTimerRef.current = setTimeout(() => {
        if (commandId !== commandIdRef.current || desiredPlayingRef.current) {
          return;
        }
        audio.pause();
        audio.playbackRate = AUDIO_RATE_MIN;
        audio.volume = 0;
      }, AUDIO_RAMP_DOWN_MS + 48);
    } else {
      setAudioPitchBehavior(audio);
      audio.playbackRate = Math.max(AUDIO_RATE_MIN, audio.playbackRate || AUDIO_RATE_MIN);
      audio.volume = Math.max(0, Math.min(1, audio.volume || 0));
      const playPromise = audio.play();
      setIsPlaying(true);

      if (playPromise && typeof playPromise.then === "function") {
        playPromise
          .then(() => {
            if (commandId !== commandIdRef.current) {
              if (!desiredPlayingRef.current) {
                audio.pause();
                audio.playbackRate = AUDIO_RATE_MIN;
                audio.volume = 0;
              }
              return;
            }
            rampAudioPlayback(true, commandId);
          })
          .catch(() => {
            if (commandId !== commandIdRef.current) {
              return;
            }
            desiredPlayingRef.current = false;
            setIsPlaying(false);
          });
      } else {
        rampAudioPlayback(true, commandId);
      }
    }
  }

  function handleSliderSeek(nextProgress) {
    const audio = audioElementRef.current;
    if (!audio) return;

    const clampedProgress = clamp01(nextProgress);
    progressSourceRef.current = "slider";
    visualProgressRef.current = clampedProgress;
    setVisualProgress(clampedProgress);

    const duration =
      Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : TRACK_DURATION_SECONDS;
    audio.currentTime = clampedProgress * duration;
  }

  useEffect(() => {
    setBgSrc(album.cover || FALLBACK_COVER);
  }, [album.cover]);

  useLayoutEffect(() => {
    const root = mainRef.current;
    const target = detailMainRef.current;
    if (!root || !target) return;

    const updateScale = () => {
      const h = target.getBoundingClientRect().height;
      if (h === 0) return;
      const scale = Math.max(0.4, Math.min(1.35, (h * 0.92) / BASE_STAGE_HEIGHT));
      const sleeveScale = Math.max(0.55, Math.min(1.25, scale));
      root.style.setProperty("--carousel-scale", scale);
      root.style.setProperty("--sleeve-scale", sleeveScale);
      root.style.setProperty("--card-width", `${Math.round(480 * sleeveScale)}px`);
    };

    const observer = new ResizeObserver(updateScale);
    observer.observe(target);
    updateScale();

    const raf1 = requestAnimationFrame(updateScale);
    const raf2 = requestAnimationFrame(() => requestAnimationFrame(updateScale));

    window.addEventListener("resize", updateScale);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  return (
    <main ref={mainRef} className="detail-screen" aria-label={`${album.title} detail screen`}>
      <audio
        ref={audioElementRef}
        src="/media/audio/20240125.mp3"
        preload="auto"
        loop
        aria-hidden="true"
        hidden
      />

      <header className="detail-header">
        <button className="detail-header__back" type="button" onClick={onBack}>
          <BackIcon />
          <span>My collection</span>
        </button>
        <div className="detail-header__actions">
          <button
            className="detail-header__action detail-header__favorite is-active"
            type="button"
            aria-label="Favorite album"
            aria-pressed="true"
          >
            <HeartIcon filled />
          </button>
          <button className="detail-header__action" type="button" aria-label="More options">
            <MoreIcon />
          </button>
        </div>
      </header>

      <div className="detail-content">
        <CarouselBlurBackground
          layers={[{ src: bgSrc, active: true }]}
          fallbackSrc={FALLBACK_COVER}
        />

        <section ref={detailMainRef} className="detail-main" aria-label="Album detail">
        <DetailSleeve album={album} />
        <div className="detail-vinyl-stage">
          <VinylDisc
            artImage={album.vinylArt}
            stickers={[]}
            size="min(100%, var(--detail-vinyl-max), calc(100vh - 306px))"
            isPlaying={isPlaying}
            onSpinRateChange={handleSpinRateChange}
            externalProgress={visualProgress}
            externalProgressSource={progressSourceRef.current}
            progressPerTurn={PROGRESS_PER_FULL_TURN}
          />
        </div>
        <div className="detail-sidebar">
          <AlbumInfoPlaybackPanel
            album={album}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onSeek={handleSliderSeek}
            progress={visualProgress}
            currentTime={formatTime(visualProgress * trackDurationSeconds)}
            totalTime={formatTime(trackDurationSeconds)}
            className="album-info-panel--detail"
          />
        </div>
      </section>
      </div>

      <StickerStrip stickers={stickerAssets} />
    </main>
  );
}
