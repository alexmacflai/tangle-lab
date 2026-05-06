import { useRef } from "react";
import { NextTrackIcon, PauseIcon, PlayIcon, PreviousTrackIcon } from "./Icons.jsx";

const defaultAlbum = {
  title: "Vind",
  artist: "CTM",
  year: 2024,
  label: "15 Love",
  catalogNumber: "FTL002",
  duration: "1h 5m",
  description: "Cello-led compositions with sparse acoustic details and hyperreal production.",
  genre: "Modern classical, ambient, experimental",
  releaseNotes: "Written and performed by CTM; produced by Jakob Littauer.",
};

const metadataRows = [
  ["Album", "title"],
  ["Artist", "artist"],
  ["Release date", "year"],
  ["Label", "label"],
  ["Catalog #", "catalogNumber"],
  ["Duration", "duration"],
  ["Description", "description"],
  ["Genre", "genre"],
  ["Release notes", "releaseNotes"],
];

export function AlbumInfoPlaybackPanel({
  album = defaultAlbum,
  isPlaying = false,
  onPlayPause,
  onSeek,
  currentTime = "2:34",
  totalTime = "6:27",
  progress = 0.29,
  className = "",
}) {
  const normalizedProgress = Math.max(0, Math.min(1, progress));
  const sliderRef = useRef(null);

  const progressFromPointerEvent = (event) => {
    const slider = sliderRef.current;
    if (!slider) return normalizedProgress;
    const rect = slider.getBoundingClientRect();
    if (rect.width <= 0) return normalizedProgress;
    const relativeX = event.clientX - rect.left;
    return Math.max(0, Math.min(1, relativeX / rect.width));
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const slider = sliderRef.current;
    if (!slider) return;

    slider.setPointerCapture(event.pointerId);
    const nextProgress = progressFromPointerEvent(event);
    if (typeof onSeek === "function") {
      onSeek(nextProgress, { phase: "start" });
      onSeek(nextProgress, { phase: "move" });
    }
  };

  const handlePointerMove = (event) => {
    const slider = sliderRef.current;
    if (!slider || !slider.hasPointerCapture(event.pointerId)) return;
    const nextProgress = progressFromPointerEvent(event);
    if (typeof onSeek === "function") {
      onSeek(nextProgress, { phase: "move" });
    }
  };

  const handlePointerUp = (event) => {
    const slider = sliderRef.current;
    if (!slider || !slider.hasPointerCapture(event.pointerId)) return;
    slider.releasePointerCapture(event.pointerId);
    const nextProgress = progressFromPointerEvent(event);
    if (typeof onSeek === "function") {
      onSeek(nextProgress, { phase: "end" });
    }
  };

  return (
    <aside
      className={`album-info-panel ${className}`}
      aria-label={`${album.title} playback details`}
    >
      <div className="album-info-panel__info">
        <div className="album-info-panel__heading">
          <h2>{album.title}</h2>
          <p>{album.artist}</p>
        </div>

        <dl className="album-info-panel__metadata">
          {metadataRows.map(([label, key]) => (
            <div className="album-info-panel__row" key={key}>
              <dt>{label}</dt>
              <dd>{album[key]}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="album-info-panel__playback">
        <div className="album-info-panel__controls" aria-label="Playback controls">
          <button className="album-info-panel__transport" type="button" aria-label="Previous track">
            <PreviousTrackIcon />
          </button>
          <button
            className="album-info-panel__play"
            type="button"
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={onPlayPause}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button className="album-info-panel__transport" type="button" aria-label="Next track">
            <NextTrackIcon />
          </button>
        </div>

        <div className="album-info-panel__progress">
          <span>{currentTime}</span>
          <div
            ref={sliderRef}
            className="album-info-panel__slider"
            role="slider"
            aria-label="Scrub playback"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(normalizedProgress * 100)}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div className="album-info-panel__track">
              <div
                className="album-info-panel__active-track"
                style={{ "--progress": normalizedProgress }}
              />
            </div>
            <div
              className="album-info-panel__thumb"
              style={{ "--progress": normalizedProgress }}
            />
          </div>
          <span>{totalTime}</span>
        </div>
      </div>
    </aside>
  );
}
