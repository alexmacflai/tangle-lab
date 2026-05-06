import { stickerAssets } from "../data/libraryMock.js";
import { useAlbums } from "../data/useAlbums.js";
import { LibraryCarousel } from "./LibraryCarousel.jsx";
import { LibraryHeader } from "./LibraryHeader.jsx";
import { StickerStrip } from "./StickerStrip.jsx";

export function LibraryPrototype() {
  const { albums, isLoading, error } = useAlbums();

  return (
    <main className="library-preview" aria-label="Library view prototype">
      <LibraryHeader searchState="default" sortState="default" />
      {isLoading && <p className="library-preview__status">Loading collection...</p>}
      {error && <p className="library-preview__status">{error}</p>}
      <LibraryCarousel albums={albums} />
      <StickerStrip stickers={stickerAssets} />
    </main>
  );
}
