import { useEffect, useMemo, useState } from "react";
import { libraryAlbums, stickerAssets } from "../data/libraryMock.js";
import { useAlbums } from "../data/useAlbums.js";
import { AlbumInfoPlaybackPanel } from "./AlbumInfoPlaybackPanel.jsx";
import { AlbumCard } from "./AlbumCard.jsx";
import { LibraryCarousel } from "./LibraryCarousel.jsx";
import { LibraryHeader } from "./LibraryHeader.jsx";
import { StickerStrip } from "./StickerStrip.jsx";
import { VinylDisc } from "./VinylDisc.jsx";

const searchStates = ["default", "focused", "filled", "disabled"];
const sortStates = ["default", "open", "disabled"];
const albumStates = ["focused", "resting"];
const vinylStates = ["paused", "playing"];

function PlaygroundControl({ id, label, value, options, onChange }) {
  return (
    <label className="playground-control" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ComponentsPlayground() {
  const { albums, isLoading, error } = useAlbums();
  const [albumState, setAlbumState] = useState("focused");
  const [searchState, setSearchState] = useState("default");
  const [sortState, setSortState] = useState("default");
  const [vinylState, setVinylState] = useState("paused");
  const activeAlbum = useMemo(() => {
    if (albums.length > 0) {
      return albums.find((album) => album.id === "ctm-vind") ?? albums[0];
    }

    return libraryAlbums.find((album) => album.id === "vind") ?? libraryAlbums[0];
  }, [albums]);

  useEffect(() => {
    document.body.classList.add("vinyl-components-screen");
    return () => {
      document.body.classList.remove("vinyl-components-screen");
    };
  }, []);

  return (
    <main className="playground">
      <section className="playground-panel" aria-labelledby="playground-title">
        <div className="playground-panel__heading">
          <div>
            <p className="playground-kicker">Components playground</p>
            <h2 id="playground-title">Library view components</h2>
          </div>
          <div className="playground-panel__controls">
            <PlaygroundControl
              id="album-state"
              label="Album card"
              value={albumState}
              options={albumStates}
              onChange={setAlbumState}
            />
            <PlaygroundControl
              id="search-state"
              label="Search"
              value={searchState}
              options={searchStates}
              onChange={setSearchState}
            />
            <PlaygroundControl
              id="sort-state"
              label="Sort"
              value={sortState}
              options={sortStates}
              onChange={setSortState}
            />
            <PlaygroundControl
              id="vinyl-state"
              label="Vinyl"
              value={vinylState}
              options={vinylStates}
              onChange={setVinylState}
            />
          </div>
        </div>

        <div className="playground-grid">
          {isLoading && <p className="library-preview__status">Loading collection...</p>}
          {error && <p className="library-preview__status">{error}</p>}
          <div className="playground-card playground-card--wide">
            <p className="playground-card__label">Header</p>
            <LibraryHeader searchState={searchState} sortState={sortState} />
          </div>

          <div className="playground-card">
            <p className="playground-card__label">Album card</p>
            <div className="playground-card__album">
              <AlbumCard album={activeAlbum} state={albumState} showStickers={false} />
            </div>
          </div>

          <div className="playground-card">
            <p className="playground-card__label">Vinyl disc</p>
            <div className="playground-card__vinyl">
              <VinylDisc
                isPlaying={vinylState === "playing"}
                artImage={activeAlbum?.vinylArt}
                stickers={activeAlbum?.stickers}
              />
            </div>
          </div>

          <div className="playground-card">
            <p className="playground-card__label">Album info + playback</p>
            <div className="playground-card__details">
              <AlbumInfoPlaybackPanel album={activeAlbum} />
            </div>
          </div>

          <div className="playground-card playground-card--wide">
            <p className="playground-card__label">Carousel</p>
            <div className="playground-card__carousel">
              <LibraryCarousel albums={albums} />
            </div>
          </div>

          <div className="playground-card playground-card--wide">
            <p className="playground-card__label">Sticker strip</p>
            <StickerStrip stickers={stickerAssets} />
          </div>
        </div>
      </section>
    </main>
  );
}
