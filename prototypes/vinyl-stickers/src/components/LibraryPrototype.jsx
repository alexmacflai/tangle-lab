import { libraryAlbums, stickerAssets } from "../data/libraryMock.js";
import { LibraryCarousel } from "./LibraryCarousel.jsx";
import { LibraryHeader } from "./LibraryHeader.jsx";
import { StickerStrip } from "./StickerStrip.jsx";

export function LibraryPrototype() {
  return (
    <main className="library-preview" aria-label="Library view prototype">
      <LibraryHeader searchState="default" sortState="default" />
      <LibraryCarousel albums={libraryAlbums} />
      <StickerStrip stickers={stickerAssets} />
    </main>
  );
}
