import { stickerAssets } from "../data/libraryMock.js";
import { LibraryCarousel } from "./LibraryCarousel.jsx";
import { LibraryHeader } from "./LibraryHeader.jsx";
import { StickerStrip } from "./StickerStrip.jsx";

export function LibraryPrototype({ albums, isLoading, error, onOpenAlbum, isExtracting = false }) {
  return (
    <main
      className={`library-preview ${isExtracting ? "library-preview--extracting" : ""}`}
      aria-label="Library view prototype"
    >
      <LibraryHeader searchState="default" sortState="default" />
      {isLoading && <p className="library-preview__status">Loading collection...</p>}
      {error && <p className="library-preview__status">{error}</p>}
      <LibraryCarousel albums={albums} onOpenAlbum={onOpenAlbum} isExtracting={isExtracting} />
      <StickerStrip stickers={stickerAssets} />
    </main>
  );
}
