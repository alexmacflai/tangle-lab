import { NextTrackIcon, PauseIcon, PreviousTrackIcon } from "./Icons.jsx";

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
  currentTime = "2:34",
  totalTime = "6:27",
  progress = 0.29,
}) {
  const normalizedProgress = Math.max(0, Math.min(1, progress));

  return (
    <aside className="album-info-panel" aria-label={`${album.title} playback details`}>
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
          <button className="album-info-panel__play" type="button" aria-label="Pause">
            <PauseIcon />
          </button>
          <button className="album-info-panel__transport" type="button" aria-label="Next track">
            <NextTrackIcon />
          </button>
        </div>

        <div className="album-info-panel__progress">
          <span>{currentTime}</span>
          <div className="album-info-panel__slider" aria-hidden="true">
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
