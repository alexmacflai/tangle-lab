import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./index.css";
import { CarouselBlurBackground } from "./components/CarouselBlurBackground.jsx";
import { ComponentsPlayground } from "./components/ComponentsPlayground.jsx";
import { DetailContent } from "./components/DetailPrototype.jsx";
import { HeartIcon, MoreIcon } from "./components/Icons.jsx";
import { LibraryCarousel } from "./components/LibraryCarousel.jsx";
import { LibraryHeader } from "./components/LibraryHeader.jsx";
import { StickerStrip } from "./components/StickerStrip.jsx";
import { stickerAssets } from "./data/libraryMock.js";
import { FALLBACK_COVER, useAlbums } from "./data/useAlbums.js";

const SLEEVE_TRANSITION_MS = 520;

function toCenteredSquare(rect) {
  if (!rect) return null;
  const size = Math.min(rect.width, rect.height);
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return { left: cx - size / 2, top: cy - size / 2, width: size, height: size };
}

function BackIcon() {
  return (
    <svg className="icon detail-header__back-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export default function App() {
  const hashRoute = window.location.hash.replace(/^#/, "");
  if (window.location.pathname === "/components" || hashRoute.endsWith("/components")) {
    return <ComponentsPlayground />;
  }
  return <VinylStickersApp initialView={window.location.pathname === "/detail" ? "detail" : "library"} />;
}

export function VinylStickersApp({ initialView = "library", initialMode = "default" }) {
  if (initialMode === "components") {
    return <ComponentsPlayground />;
  }

  const { albums, isLoading, error } = useAlbums();
  const [view, setView] = useState(initialView);
  const [selectedAlbumId, setSelectedAlbumId] = useState(null);
  const [focusedAlbumId, setFocusedAlbumId] = useState(null);
  const [sleeveHeroRect, setSleeveHeroRect] = useState(null);
  const [sleeveAnimated, setSleeveAnimated] = useState(false);
  const [bgLayers, setBgLayers] = useState([
    { src: FALLBACK_COVER, active: true },
    { src: FALLBACK_COVER, active: false },
  ]);
  const librarySourceRectRef = useRef(null);
  const sleeveRafRef = useRef(null);
  const backTimerRef = useRef(null);
  const bgActiveRef = useRef(0);

  const selectedAlbum = useMemo(
    () =>
      albums.find((a) => a.id === selectedAlbumId) ??
      albums.find((a) => a.id === "ctm-vind") ??
      albums[0],
    [albums, selectedAlbumId],
  );

  const focusedAlbum = useMemo(
    () =>
      albums.find((album) => album.id === focusedAlbumId) ??
      albums.find((album) => album.id === "ctm-vind") ??
      albums[0],
    [albums, focusedAlbumId],
  );

  useEffect(() => {
    const nextSrc = focusedAlbum?.cover || FALLBACK_COVER;
    const active = bgActiveRef.current;
    const inactive = 1 - active;
    bgActiveRef.current = inactive;
    setBgLayers((prev) => {
      if (prev[inactive]?.src === nextSrc && prev[inactive]?.active) {
        return prev;
      }
      const next = [...prev];
      next[inactive] = { src: nextSrc, active: true };
      next[active] = { ...prev[active], active: false };
      return next;
    });
  }, [focusedAlbum]);

  function clearTimers() {
    if (sleeveRafRef.current) { cancelAnimationFrame(sleeveRafRef.current); sleeveRafRef.current = null; }
    if (backTimerRef.current) { clearTimeout(backTimerRef.current); backTimerRef.current = null; }
  }

  function handleOpenAlbum(album, meta = {}) {
    clearTimers();
    const from = toCenteredSquare(meta.sourceRect ?? null);
    librarySourceRectRef.current = from;
    setSelectedAlbumId(album.id);
    // Place hero at carousel position immediately (no animation), then transition to detail position
    setSleeveHeroRect(from);
    setSleeveAnimated(false);
    setView("detail");
    // onSleeveReady (called by DetailContent after layout) will push it to the detail position
  }

  // Called by DetailContent once the detail sleeve placeholder is laid out
  const handleSleeveReady = useCallback((rect) => {
    const to = toCenteredSquare(rect);
    sleeveRafRef.current = requestAnimationFrame(() => {
      setSleeveHeroRect(to);
      setSleeveAnimated(true);
      sleeveRafRef.current = null;
    });
  }, []);

  function handleBack() {
    clearTimers();
    const from = librarySourceRectRef.current;
    setView("library");

    if (from) {
      setSleeveAnimated(true);
      setSleeveHeroRect(from);
    } else {
      setSleeveHeroRect(null);
      setSleeveAnimated(false);
      return;
    }

    backTimerRef.current = setTimeout(() => {
      setSleeveHeroRect(null);
      setSleeveAnimated(false);
      backTimerRef.current = null;
    }, SLEEVE_TRANSITION_MS);
  }

  const isDetail = view === "detail";

  return (
    <div className="app" data-view={view}>
      <CarouselBlurBackground layers={bgLayers} fallbackSrc={FALLBACK_COVER} />

      {/* Single header — two faces that cross-fade + change height */}
      <header className="app-header">
        <div className="app-header__face app-header__face--library">
          <div className="app-header__face-inner">
            <LibraryHeader />
          </div>
        </div>
        <div className="app-header__face app-header__face--detail">
          <div className="app-header__face-inner">
            <button className="detail-header__back" type="button" onClick={handleBack}>
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
          </div>
        </div>
      </header>

      {/* Single body — both panels always mounted, CSS controls visibility */}
      <div className="app-body">
        <div className="app-panel app-panel--library">
          {isLoading && <p className="library-preview__status">Loading collection…</p>}
          {error && <p className="library-preview__status">{error}</p>}
          <LibraryCarousel
            albums={albums}
            onOpenAlbum={handleOpenAlbum}
            onFocusedAlbumChange={setFocusedAlbumId}
            isExtracting={isDetail}
          />
        </div>

        <div className="app-panel app-panel--detail">
          {selectedAlbum && (
            <DetailContent
              album={selectedAlbum}
              onSleeveReady={handleSleeveReady}
              measureKey={isDetail ? selectedAlbumId : null}
            />
          )}
        </div>

        {/* Persistent sleeve hero — always a single element, its position just transitions */}
        {sleeveHeroRect && selectedAlbum && (
          <div
            className={`app-sleeve-hero${sleeveAnimated ? " app-sleeve-hero--animated" : ""}`}
            style={{
              left: `${sleeveHeroRect.left}px`,
              top: `${sleeveHeroRect.top}px`,
              width: `${sleeveHeroRect.width}px`,
              height: `${sleeveHeroRect.height}px`,
            }}
          >
            <img src={selectedAlbum.cover} alt="" />
          </div>
        )}
      </div>

      {/* Footer with stickers — never changes */}
      <footer className="app-footer">
        <StickerStrip stickers={stickerAssets} />
      </footer>
    </div>
  );
}
