import { useEffect, useState } from "react";
import { stickerAssets } from "../data/libraryMock.js";
import { FALLBACK_COVER } from "../data/useAlbums.js";
import { AlbumInfoPlaybackPanel } from "./AlbumInfoPlaybackPanel.jsx";
import { HeartIcon, MoreIcon } from "./Icons.jsx";
import { StickerStrip } from "./StickerStrip.jsx";
import { VinylDisc } from "./VinylDisc.jsx";

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

  useEffect(() => {
    setBgSrc(album.cover || FALLBACK_COVER);
  }, [album.cover]);

  return (
    <main className="detail-screen" aria-label={`${album.title} detail screen`}>
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
          />
        </div>
        <div className="detail-sidebar">
          <AlbumInfoPlaybackPanel album={album} className="album-info-panel--detail" />
        </div>
      </section>

      <StickerStrip stickers={stickerAssets} />
    </main>
  );
}
