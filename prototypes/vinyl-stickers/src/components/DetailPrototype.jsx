import { useEffect, useRef, useState } from "react";
import { stickerAssets } from "../data/libraryMock.js";
import { FALLBACK_COVER } from "../data/useAlbums.js";
import { AlbumInfoPlaybackPanel } from "./AlbumInfoPlaybackPanel.jsx";
import { HeartIcon, MoreIcon } from "./Icons.jsx";
import { StickerStrip } from "./StickerStrip.jsx";
import { VinylDisc } from "./VinylDisc.jsx";

const AUDIO_RATE_MIN = 0.08;
const AUDIO_RAMP_UP_MS = 280;
const AUDIO_RAMP_DOWN_MS = 360;

const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeInCubic = (t) => t ** 3;

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
  const audioElementRef = useRef(null);
  const audioRampFrameRef = useRef(null);
  const stopFallbackTimerRef = useRef(null);
  const desiredPlayingRef = useRef(false);
  const commandIdRef = useRef(0);

  function setAudioPitchBehavior(audio) {
    audio.preservesPitch = false;
    audio.webkitPreservesPitch = false;
    audio.mozPreservesPitch = false;
  }

  function rampAudioPlayback(shouldPlay, commandId) {
    const audio = audioElementRef.current;
    if (!audio) return;

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

    return () => {
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
  }, [album.id]);

  function handlePlayPause() {
    const audio = audioElementRef.current;
    if (!audio) return;

    const shouldPlay = !desiredPlayingRef.current;
    desiredPlayingRef.current = shouldPlay;
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

  useEffect(() => {
    setBgSrc(album.cover || FALLBACK_COVER);
  }, [album.cover]);

  return (
    <main className="detail-screen" aria-label={`${album.title} detail screen`}>
      <audio
        ref={audioElementRef}
        src="/media/audio/20240125.mp3"
        preload="auto"
        loop
        aria-hidden="true"
        hidden
      />

      <div className="detail-bg" aria-hidden="true">
        <img
          src={bgSrc}
          className="detail-bg__img"
          alt=""
          onError={() => setBgSrc(FALLBACK_COVER)}
        />
      </div>

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

      <section className="detail-main" aria-label="Album detail">
        <DetailSleeve album={album} />
        <div className="detail-vinyl-stage">
          <VinylDisc
            artImage={album.vinylArt}
            stickers={[]}
            size="min(100%, var(--detail-vinyl-max), calc(100vh - 306px))"
            isPlaying={isPlaying}
          />
        </div>
        <div className="detail-sidebar">
          <AlbumInfoPlaybackPanel
            album={album}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            className="album-info-panel--detail"
          />
        </div>
      </section>

      <StickerStrip stickers={stickerAssets} />
    </main>
  );
}
