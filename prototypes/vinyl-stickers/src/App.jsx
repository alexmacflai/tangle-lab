import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./index.css";
import { CarouselBlurBackground } from "./components/CarouselBlurBackground.jsx";
import { ComponentsPlayground } from "./components/ComponentsPlayground.jsx";
import { DetailContent } from "./components/DetailPrototype.jsx";
import { HeartIcon, MoreIcon } from "./components/Icons.jsx";
import { LibraryCarousel } from "./components/LibraryCarousel.jsx";
import { LibraryHeader } from "./components/LibraryHeader.jsx";
import { StickerStrip } from "./components/StickerStrip.jsx";
import { VinylDisc } from "./components/VinylDisc.jsx";
import { stickerAssets } from "./data/libraryMock.js";
import { FALLBACK_COVER, useAlbums } from "./data/useAlbums.js";

const TRANSITION_EPSILON = 1.5;

function toCenteredSquare(rect) {
  if (!rect) return null;
  const size = Math.min(rect.width, rect.height);
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return { left: cx - size / 2, top: cy - size / 2, width: size, height: size };
}

function createStackedVinylRect(sleeveRect) {
  const sleeve = toCenteredSquare(sleeveRect);
  if (!sleeve) return null;
  const size = sleeve.width * 0.96;
  const cx = sleeve.left + sleeve.width / 2;
  const cy = sleeve.top + sleeve.height / 2;
  return {
    left: cx - size / 2,
    top: cy - size / 2,
    width: size,
    height: size,
  };
}

function rectMatches(a, b, epsilon = TRANSITION_EPSILON) {
  if (!a || !b) return false;
  return (
    Math.abs(a.left - b.left) <= epsilon &&
    Math.abs(a.top - b.top) <= epsilon &&
    Math.abs(a.width - b.width) <= epsilon &&
    Math.abs(a.height - b.height) <= epsilon
  );
}

function BackIcon() {
  return (
    <svg className="icon detail-header__back-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function TransitionAlbumOverlay({
  album,
  sleeveRect,
  vinylRect,
  animated = false,
  onSleeveTransitionEnd,
}) {
  if (!album || !sleeveRect || !vinylRect) {
    return null;
  }

  return (
    <div className={`transition-overlay${animated ? " transition-overlay--animated" : ""}`} aria-hidden="true">
      <div
        className="transition-overlay__vinyl"
        style={{
          left: `${vinylRect.left}px`,
          top: `${vinylRect.top}px`,
          width: `${vinylRect.width}px`,
          height: `${vinylRect.height}px`,
        }}
      >
        <VinylDisc artImage={album.vinylArt} stickers={[]} size="100%" />
      </div>
      <div
        className="transition-overlay__sleeve"
        style={{
          left: `${sleeveRect.left}px`,
          top: `${sleeveRect.top}px`,
          width: `${sleeveRect.width}px`,
          height: `${sleeveRect.height}px`,
        }}
        onTransitionEnd={onSleeveTransitionEnd}
      >
        <img src={album.cover} alt="" />
      </div>
    </div>
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
  const [scene, setScene] = useState(initialView === "detail" ? "detail" : "library");
  const [selectedAlbumId, setSelectedAlbumId] = useState(initialView === "detail" ? "ctm-vind" : null);
  const [focusedAlbumId, setFocusedAlbumId] = useState(null);
  const [transitionOverlay, setTransitionOverlay] = useState(null);
  const [bgLayers, setBgLayers] = useState([
    { src: FALLBACK_COVER, active: true },
    { src: FALLBACK_COVER, active: false },
  ]);
  const librarySourceRectRef = useRef(null);
  const focusedSlotRectRef = useRef(null);
  const detailMediaRectsRef = useRef({ sleeveRect: null, vinylRect: null, albumId: null });
  const sceneRef = useRef(scene);
  const overlayRef = useRef(transitionOverlay);
  const overlayRafRef = useRef(null);
  const bgActiveRef = useRef(0);

  const albumsWithFavoriteState = useMemo(
    () =>
      albums.map((album) => ({
        ...album,
        isFavorite: favoriteOverrides[album.id] ?? album.isFavorite ?? false,
      })),
    [albums, favoriteOverrides],
  );

  const defaultAlbum = useMemo(
    () => albumsWithFavoriteState.find((a) => a.id === "ctm-vind") ?? albumsWithFavoriteState[0] ?? null,
    [albumsWithFavoriteState],
  );

  const selectedAlbum = useMemo(() => {
    if (!selectedAlbumId) {
      return scene === "detail" ? defaultAlbum : null;
    }
    return albumsWithFavoriteState.find((a) => a.id === selectedAlbumId) ?? defaultAlbum;
  }, [albumsWithFavoriteState, defaultAlbum, scene, selectedAlbumId]);

  const focusedAlbum = useMemo(
    () =>
      albumsWithFavoriteState.find((album) => album.id === focusedAlbumId) ??
      defaultAlbum,
    [albumsWithFavoriteState, defaultAlbum, focusedAlbumId],
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
    sceneRef.current = scene;
  }, [scene]);

  useEffect(() => {
    overlayRef.current = transitionOverlay;
  }, [transitionOverlay]);

  useEffect(() => {
    const backgroundAlbum = scene === "library" ? focusedAlbum : selectedAlbum ?? focusedAlbum;
    const nextSrc = backgroundAlbum?.cover || FALLBACK_COVER;
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
  }, [focusedAlbum, scene, selectedAlbum]);

  function clearOverlayFrame() {
    if (overlayRafRef.current) {
      cancelAnimationFrame(overlayRafRef.current);
      overlayRafRef.current = null;
    }
  }

  function moveOverlayToTarget(sleeveRect, vinylRect) {
    clearOverlayFrame();
    overlayRafRef.current = requestAnimationFrame(() => {
      setTransitionOverlay((current) =>
        current
          ? {
              ...current,
              sleeveRect,
              vinylRect,
              animated: true,
            }
          : current,
      );
      overlayRafRef.current = null;
    });
  }

  function handleOpenAlbum(album, meta = {}) {
    clearOverlayFrame();
    const sourceSleeveRect = toCenteredSquare(meta.sourceRect ?? focusedSlotRectRef.current ?? null);
    const sourceVinylRect = createStackedVinylRect(sourceSleeveRect);
    librarySourceRectRef.current = sourceSleeveRect;
    setSelectedAlbumId(album.id);
    setScene("opening");
    setTransitionOverlay(
      sourceSleeveRect && sourceVinylRect
        ? {
            albumId: album.id,
            sleeveRect: sourceSleeveRect,
            vinylRect: sourceVinylRect,
            animated: false,
          }
        : null,
    );
  }

  const handleDetailLayoutChange = useCallback((layout) => {
    detailMediaRectsRef.current = layout;
    if (
      sceneRef.current !== "opening" ||
      !selectedAlbumId ||
      layout.albumId !== selectedAlbumId
    ) {
      return;
    }

    const nextSleeveRect = toCenteredSquare(layout.sleeveRect);
    const nextVinylRect = layout.vinylRect;
    const currentOverlay = overlayRef.current;
    if (!nextSleeveRect || !nextVinylRect || !currentOverlay || currentOverlay.albumId !== selectedAlbumId) {
      return;
    }

    if (!currentOverlay.animated) {
      moveOverlayToTarget(nextSleeveRect, nextVinylRect);
      return;
    }

    if (
      !rectMatches(currentOverlay.sleeveRect, nextSleeveRect) ||
      !rectMatches(currentOverlay.vinylRect, nextVinylRect)
    ) {
      setTransitionOverlay((current) =>
        current && current.albumId === selectedAlbumId
          ? {
              ...current,
              sleeveRect: nextSleeveRect,
              vinylRect: nextVinylRect,
              animated: true,
            }
          : current,
      );
    }
  }, [selectedAlbumId]);

  const handleFocusedSlotLayout = useCallback((rect) => {
    focusedSlotRectRef.current = rect;

    if (sceneRef.current !== "closing") {
      return;
    }

    const currentOverlay = overlayRef.current;
    if (!currentOverlay?.animated) {
      return;
    }

    const nextSleeveRect = toCenteredSquare(rect);
    const nextVinylRect = createStackedVinylRect(nextSleeveRect);
    if (!nextSleeveRect || !nextVinylRect) {
      return;
    }

    if (
      !rectMatches(currentOverlay.sleeveRect, nextSleeveRect) ||
      !rectMatches(currentOverlay.vinylRect, nextVinylRect)
    ) {
      setTransitionOverlay((current) =>
        current
          ? {
              ...current,
              sleeveRect: nextSleeveRect,
              vinylRect: nextVinylRect,
              animated: true,
            }
          : current,
      );
    }
  }, []);

  function handleBack() {
    clearOverlayFrame();
    const sourceSleeveRect = toCenteredSquare(detailMediaRectsRef.current.sleeveRect);
    const sourceVinylRect = detailMediaRectsRef.current.vinylRect;
    const targetSleeveRect = toCenteredSquare(focusedSlotRectRef.current ?? librarySourceRectRef.current);
    const targetVinylRect = createStackedVinylRect(targetSleeveRect);

    if (!selectedAlbum || !sourceSleeveRect || !sourceVinylRect || !targetSleeveRect || !targetVinylRect) {
      setScene("library");
      setTransitionOverlay(null);
      setSelectedAlbumId(null);
      return;
    }

    setScene("closing");
    setTransitionOverlay({
      albumId: selectedAlbum.id,
      sleeveRect: sourceSleeveRect,
      vinylRect: sourceVinylRect,
      animated: false,
    });
    moveOverlayToTarget(targetSleeveRect, targetVinylRect);
  }

  const handleOverlayTransitionEnd = useCallback((event) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    const currentScene = sceneRef.current;
    const currentOverlay = overlayRef.current;
    if (!currentOverlay?.animated) {
      return;
    }

    if (currentScene === "opening") {
      setScene("detail");
      setTransitionOverlay(null);
      return;
    }

    if (currentScene === "closing") {
      setScene("library");
      setTransitionOverlay(null);
      setSelectedAlbumId(null);
    }
  }, []);

  return (
    <div className="app" data-scene={scene}>
      <CarouselBlurBackground layers={bgLayers} fallbackSrc={FALLBACK_COVER} />

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

      <div className="app-body">
        <div className="app-panel app-panel--library" aria-hidden={scene === "detail"}>
          {isLoading && <p className="library-preview__status">Loading collection…</p>}
          {error && <p className="library-preview__status">{error}</p>}
          <LibraryCarousel
            albums={albumsWithFavoriteState}
            onOpenAlbum={handleOpenAlbum}
            onFocusedAlbumChange={setFocusedAlbumId}
            isActive={scene === "library"}
            onFocusedSlotLayout={handleFocusedSlotLayout}
            onToggleFavorite={toggleFavorite}
            isExtracting={scene === "opening"}
          />
        </div>

        <div className="app-panel app-panel--detail" aria-hidden={scene === "library"}>
          {selectedAlbum && (
            <DetailContent
              album={selectedAlbum}
              onLayoutChange={handleDetailLayoutChange}
            />
          )}
        </div>

        <TransitionAlbumOverlay
          album={selectedAlbum}
          sleeveRect={transitionOverlay?.sleeveRect}
          vinylRect={transitionOverlay?.vinylRect}
          animated={transitionOverlay?.animated}
          onSleeveTransitionEnd={handleOverlayTransitionEnd}
        />
      </div>

      <footer className="app-footer">
        <StickerStrip stickers={stickerAssets} />
      </footer>
    </div>
  );
}
