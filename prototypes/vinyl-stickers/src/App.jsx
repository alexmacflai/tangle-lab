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
const DETAIL_CONTENT_DELAY_MS = 160;
const DETAIL_CONTENT_DURATION_MS = 360;
const TRANSITION_SETTLE_MS = Math.max(
  SLEEVE_TRANSITION_MS,
  DETAIL_CONTENT_DELAY_MS + DETAIL_CONTENT_DURATION_MS,
);

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
  const [favoriteOverrides, setFavoriteOverrides] = useState({});
  const [view, setView] = useState(initialView);
  const [transitionPhase, setTransitionPhase] = useState(initialView === "detail" ? "detail" : "library");
  const [selectedAlbumId, setSelectedAlbumId] = useState(null);
  const [focusedAlbumId, setFocusedAlbumId] = useState(null);
  const [sleeveHeroRect, setSleeveHeroRect] = useState(null);
  const [sleeveAnimated, setSleeveAnimated] = useState(false);
  const [bgLayers, setBgLayers] = useState([
    { src: FALLBACK_COVER, active: true },
    { src: FALLBACK_COVER, active: false },
  ]);
  const librarySourceRectRef = useRef(null);
  const focusedSlotRectRef = useRef(null);
  const sleeveRafRef = useRef(null);
  const backTimerRef = useRef(null);
  const transitionTimerRef = useRef(null);
  const bgActiveRef = useRef(0);

  const albumsWithFavoriteState = useMemo(
    () =>
      albums.map((album) => ({
        ...album,
        isFavorite: favoriteOverrides[album.id] ?? album.isFavorite ?? false,
      })),
    [albums, favoriteOverrides],
  );

  const selectedAlbum = useMemo(
    () =>
      albumsWithFavoriteState.find((a) => a.id === selectedAlbumId) ??
      albumsWithFavoriteState.find((a) => a.id === "ctm-vind") ??
      albumsWithFavoriteState[0],
    [albumsWithFavoriteState, selectedAlbumId],
  );

  const focusedAlbum = useMemo(
    () =>
      albumsWithFavoriteState.find((album) => album.id === focusedAlbumId) ??
      albumsWithFavoriteState.find((album) => album.id === "ctm-vind") ??
      albumsWithFavoriteState[0],
    [albumsWithFavoriteState, focusedAlbumId],
  );

  const toggleFavorite = useCallback((albumId) => {
    setFavoriteOverrides((current) => {
      const sourceAlbum = albums.find((album) => album.id === albumId);
      const currentValue = current[albumId] ?? sourceAlbum?.isFavorite ?? false;
      return {
        ...current,
        [albumId]: !currentValue,
      };
    });
  }, [albums]);

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
    if (transitionTimerRef.current) { clearTimeout(transitionTimerRef.current); transitionTimerRef.current = null; }
  }

  function handleOpenAlbum(album, meta = {}) {
    clearTimers();
    const from = toCenteredSquare(meta.sourceRect ?? null);
    librarySourceRectRef.current = from;
    setSelectedAlbumId(album.id);
    setTransitionPhase("opening");
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

  useEffect(() => {
    if (transitionPhase !== "opening") {
      return undefined;
    }

    transitionTimerRef.current = setTimeout(() => {
      setTransitionPhase("detail");
      transitionTimerRef.current = null;
    }, TRANSITION_SETTLE_MS);

    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
    };
  }, [transitionPhase]);

  function handleBack() {
    clearTimers();
    const from = toCenteredSquare(focusedSlotRectRef.current ?? librarySourceRectRef.current);
    setTransitionPhase("closing");
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
      setTransitionPhase("library");
      backTimerRef.current = null;
    }, SLEEVE_TRANSITION_MS);
  }

  const isDetail = view === "detail";
  const appVisualState =
    transitionPhase === "opening" || transitionPhase === "detail" ? "detail" : "library";

  return (
    <div className="app" data-view={appVisualState} data-transition-phase={transitionPhase}>
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
                className={`detail-header__action detail-header__favorite${selectedAlbum?.isFavorite ? " is-active" : ""}`}
                type="button"
                aria-label={selectedAlbum?.isFavorite ? "Remove favorite" : "Favorite album"}
                aria-pressed={selectedAlbum?.isFavorite ?? false}
                onClick={() => selectedAlbum && toggleFavorite(selectedAlbum.id)}
              >
                <HeartIcon filled={selectedAlbum?.isFavorite} />
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
        <div className="app-panel app-panel--library" aria-hidden={appVisualState === "detail"}>
          {isLoading && <p className="library-preview__status">Loading collection…</p>}
          {error && <p className="library-preview__status">{error}</p>}
          <LibraryCarousel
            albums={albumsWithFavoriteState}
            onOpenAlbum={handleOpenAlbum}
            onFocusedAlbumChange={setFocusedAlbumId}
            onFocusedSlotLayout={(rect) => {
              focusedSlotRectRef.current = rect;
            }}
            onToggleFavorite={toggleFavorite}
            isExtracting={isDetail}
          />
        </div>

        <div className="app-panel app-panel--detail" aria-hidden={appVisualState === "library"}>
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
