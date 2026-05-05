import { useMemo, useState } from "react";
import { libraryAlbums, stickerAssets } from "../data/libraryMock.js";
import { AlbumCard } from "./AlbumCard.jsx";
import { LibraryCarousel } from "./LibraryCarousel.jsx";
import { LibraryHeader } from "./LibraryHeader.jsx";
import { StickerStrip } from "./StickerStrip.jsx";

const searchStates = ["default", "focused", "filled", "disabled"];
const sortStates = ["default", "open", "disabled"];
const albumStates = ["focused", "resting"];

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
  const [albumState, setAlbumState] = useState("focused");
  const [searchState, setSearchState] = useState("default");
  const [sortState, setSortState] = useState("default");
  const activeAlbum = useMemo(() => libraryAlbums.find((album) => album.id === "vind"), []);

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
          </div>
        </div>

        <div className="playground-grid">
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

          <div className="playground-card playground-card--wide">
            <p className="playground-card__label">Carousel</p>
            <div className="playground-card__carousel">
              <LibraryCarousel albums={libraryAlbums} />
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
