import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./index.css";
import { CarouselBlurBackground } from "./components/CarouselBlurBackground.jsx";
import { ComponentsPlayground } from "./components/ComponentsPlayground.jsx";
import { DetailContent } from "./components/DetailPrototype.jsx";
import { HeartIcon, MoreIcon } from "./components/Icons.jsx";
import { LibraryCarousel } from "./components/LibraryCarousel.jsx";
import { LibraryHeader } from "./components/LibraryHeader.jsx";
import { SleeveStickerLayer } from "./components/SleeveStickerLayer.jsx";
import { StickerStrip } from "./components/StickerStrip.jsx";
import { VinylDisc } from "./components/VinylDisc.jsx";
import { stickerAssets } from "./data/libraryMock.js";
import { getSurfaceStickers } from "./data/stickerSurfaces.js";
import { FALLBACK_COVER, useAlbums } from "./data/useAlbums.js";

const TRANSITION_EPSILON = 1.5;
const STICKER_DROP_SURFACE_LIMIT = 5;

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

function rectContainsPoint(rect, point) {
  return (
    rect &&
    point &&
    point.x >= rect.left &&
    point.x <= rect.left + rect.width &&
    point.y >= rect.top &&
    point.y <= rect.top + rect.height
  );
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

function getSurfacePointPercent(point, targetRect, rotationDegrees = 0) {
  if (!point || !targetRect) {
    return null;
  }

  const centerX = targetRect.left + targetRect.width / 2;
  const centerY = targetRect.top + targetRect.height / 2;
  const dx = point.x - centerX;
  const dy = point.y - centerY;
  const angle = (-rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const localX = dx * cos - dy * sin + targetRect.width / 2;
  const localY = dx * sin + dy * cos + targetRect.height / 2;

  return {
    x: (localX / targetRect.width) * 100,
    y: (localY / targetRect.height) * 100,
  };
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

  const vinylStickers = getSurfaceStickers(album, "vinyl");

  return (
    <div className={`transition-overlay${animated ? " transition-overlay--animated" : ""}`} aria-hidden="true">
      <div
        className="transition-overlay__vinyl"
        style={{
          "--overlay-x": `${vinylRect.left}px`,
          "--overlay-y": `${vinylRect.top}px`,
          width: `${vinylRect.width}px`,
          height: `${vinylRect.height}px`,
        }}
      >
        <VinylDisc artImage={album.vinylArt} stickers={vinylStickers} size="100%" />
      </div>
      <div
        className="transition-overlay__sleeve"
        style={{
          "--overlay-x": `${sleeveRect.left}px`,
          "--overlay-y": `${sleeveRect.top}px`,
          width: `${sleeveRect.width}px`,
          height: `${sleeveRect.height}px`,
        }}
        onTransitionEnd={onSleeveTransitionEnd}
      >
        <img src={album.cover} alt="" />
        <SleeveStickerLayer album={album} stickerClassName="transition-overlay__sticker" />
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
  const [stickerOverrides, setStickerOverrides] = useState({});
  const [scene, setScene] = useState(initialView === "detail" ? "detail" : "library");
  const [selectedAlbumId, setSelectedAlbumId] = useState(initialView === "detail" ? "ctm-vind" : null);
  const [focusedAlbumId, setFocusedAlbumId] = useState(null);
  const [transitionOverlay, setTransitionOverlay] = useState(null);
  const [bgLayers, setBgLayers] = useState([
    { src: FALLBACK_COVER, active: true },
    { src: FALLBACK_COVER, active: false },
  ]);
  const [draggedSticker, setDraggedSticker] = useState(null);
  const librarySourceRectRef = useRef(null);
  const focusedSlotRectRef = useRef(null);
  const detailMediaRectsRef = useRef({ sleeveRect: null, vinylRect: null, albumId: null });
  const detailVinylRotationRef = useRef(0);
  const draggedStickerRef = useRef(null);
  const stickerDragCleanupRef = useRef(null);
  const sceneRef = useRef(scene);
  const overlayRef = useRef(transitionOverlay);
  const overlayRafRef = useRef(null);
  const bgActiveRef = useRef(0);

  const albumsWithFavoriteState = useMemo(
    () =>
      albums.map((album) => ({
        ...album,
        isFavorite: favoriteOverrides[album.id] ?? album.isFavorite ?? false,
        stickers: stickerOverrides[album.id] ?? album.stickers ?? [],
      })),
    [albums, favoriteOverrides, stickerOverrides],
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

  const removeStickerFromAlbum = useCallback((albumId, stickerId) => {
    if (!albumId || !stickerId) return;

    setStickerOverrides((current) => {
      const album = albumsWithFavoriteState.find((candidate) => candidate.id === albumId);
      const currentStickers = current[albumId] ?? album?.stickers ?? [];
      return {
        ...current,
        [albumId]: currentStickers.filter((sticker) => sticker.id !== stickerId),
      };
    });
  }, [albumsWithFavoriteState]);

  const addStickerToAlbum = useCallback((albumId, sourceSticker, surface, point, targetRect, options = {}) => {
    if (!albumId || !sourceSticker || !targetRect) return;

    const surfacePoint = getSurfacePointPercent(point, targetRect, options.rotationDegrees ?? 0);
    if (!surfacePoint) return;

    const placedSticker = {
      ...sourceSticker,
      id: options.reuseId ? sourceSticker.id : `${sourceSticker.id}-${surface}-${Date.now()}`,
      surface,
      x: Math.max(8, Math.min(92, surfacePoint.x)),
      y: Math.max(8, Math.min(92, surfacePoint.y)),
      rotation: Math.round(Math.random() * 28 - 14),
    };

    setStickerOverrides((current) => {
      const album = albumsWithFavoriteState.find((candidate) => candidate.id === albumId);
      const currentStickers = current[albumId] ?? album?.stickers ?? [];
      const surfaceStickers = currentStickers.filter((sticker) => sticker.surface === surface);
      if (surfaceStickers.length >= STICKER_DROP_SURFACE_LIMIT) {
        return current;
      }

      return {
        ...current,
        [albumId]: [...currentStickers, placedSticker],
      };
    });
  }, [albumsWithFavoriteState]);

  const clearStickerDragListeners = useCallback(() => {
    stickerDragCleanupRef.current?.();
    stickerDragCleanupRef.current = null;
  }, []);

  const finishStickerDrag = useCallback((point, drag = draggedStickerRef.current) => {
    const currentDrag = drag;
    draggedStickerRef.current = null;
    clearStickerDragListeners();
    setDraggedSticker(null);
    if (!currentDrag) {
      return;
    }

    const currentScene = sceneRef.current;
    const shouldReuseId = currentDrag.source === "placed";

    if (currentScene === "detail" && selectedAlbumId) {
      const { sleeveRect, vinylRect } = detailMediaRectsRef.current;
      if (rectContainsPoint(vinylRect, point)) {
        addStickerToAlbum(selectedAlbumId, currentDrag.sticker, "vinyl", point, vinylRect, {
          reuseId: shouldReuseId,
          rotationDegrees: detailVinylRotationRef.current,
        });
        return;
      }

      if (rectContainsPoint(sleeveRect, point)) {
        addStickerToAlbum(selectedAlbumId, currentDrag.sticker, "sleeve", point, sleeveRect, { reuseId: shouldReuseId });
      }
      return;
    }

    if (currentScene === "library") {
      const targetAlbumId = currentDrag.albumId ?? focusedAlbum?.id;
      const targetRect = focusedSlotRectRef.current;
      if (targetAlbumId && rectContainsPoint(targetRect, point)) {
        addStickerToAlbum(targetAlbumId, currentDrag.sticker, "sleeve", point, targetRect, { reuseId: shouldReuseId });
      }
    }
  }, [addStickerToAlbum, clearStickerDragListeners, focusedAlbum, selectedAlbumId]);

  const beginStickerDrag = useCallback((drag, event) => {
    event.preventDefault();
    event.stopPropagation();

    clearStickerDragListeners();
    const initialDrag = {
      ...drag,
      x: event.clientX,
      y: event.clientY,
    };
    draggedStickerRef.current = initialDrag;
    setDraggedSticker(initialDrag);

    const handlePointerMove = (moveEvent) => {
      setDraggedSticker((current) => {
        if (!current) return current;
        const nextDrag = {
          ...current,
          x: moveEvent.clientX,
          y: moveEvent.clientY,
        };
        draggedStickerRef.current = nextDrag;
        return nextDrag;
      });
    };

    const handlePointerEnd = (endEvent) => {
      finishStickerDrag(
        {
          x: endEvent.clientX,
          y: endEvent.clientY,
        },
        draggedStickerRef.current,
      );
    };

    window.addEventListener("pointermove", handlePointerMove, true);
    window.addEventListener("pointerup", handlePointerEnd, true);
    window.addEventListener("pointercancel", handlePointerEnd, true);
    stickerDragCleanupRef.current = () => {
      window.removeEventListener("pointermove", handlePointerMove, true);
      window.removeEventListener("pointerup", handlePointerEnd, true);
      window.removeEventListener("pointercancel", handlePointerEnd, true);
    };
  }, [clearStickerDragListeners, finishStickerDrag]);

  const handleStickerDragStart = useCallback((sticker, event) => {
    const currentScene = sceneRef.current;
    if (currentScene !== "detail" && currentScene !== "library") return;
    const albumId = currentScene === "detail" ? selectedAlbumId : focusedAlbum?.id;
    if (!albumId) return;

    beginStickerDrag({
      sticker,
      albumId,
      source: "tray",
    }, event);
  }, [beginStickerDrag, focusedAlbum, selectedAlbumId]);

  const handlePlacedStickerDragStart = useCallback((album, sticker, surface, event) => {
    const currentScene = sceneRef.current;
    if (currentScene !== "detail" && currentScene !== "library") return;
    const albumId = album?.id;
    if (!albumId) return;

    removeStickerFromAlbum(albumId, sticker.id);
    beginStickerDrag({
      sticker: {
        ...sticker,
        surface,
      },
      albumId,
      source: "placed",
    }, event);
  }, [beginStickerDrag, removeStickerFromAlbum]);

  useEffect(() => () => clearStickerDragListeners(), [clearStickerDragListeners]);

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
    setBgLayers((prev) => {
      if (prev[active]?.src === nextSrc && prev[active]?.active) {
        return prev;
      }
      if (prev[inactive]?.src === nextSrc && prev[inactive]?.active) {
        return prev;
      }
      bgActiveRef.current = inactive;
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
  }, []);

  const handleVinylRotationChange = useCallback((rotationDegrees) => {
    detailVinylRotationRef.current = rotationDegrees;
  }, []);

  function handleBack() {
    clearOverlayFrame();
    const sourceSleeveRect = toCenteredSquare(detailMediaRectsRef.current.sleeveRect);
    const sourceVinylRect = detailMediaRectsRef.current.vinylRect;
    const targetSleeveRect = toCenteredSquare(librarySourceRectRef.current ?? focusedSlotRectRef.current);
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
    if (event.propertyName !== "transform") {
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
            onStickerDragStart={handlePlacedStickerDragStart}
            isExtracting={scene === "opening"}
          />
        </div>

        <div className="app-panel app-panel--detail" aria-hidden={scene === "library"}>
          {selectedAlbum && (
            <DetailContent
              album={selectedAlbum}
              onLayoutChange={handleDetailLayoutChange}
              onVinylRotationChange={handleVinylRotationChange}
              onStickerDragStart={handlePlacedStickerDragStart}
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

      {draggedSticker && (
        <div
          className="sticker-drag-preview"
          aria-hidden="true"
          style={{
            left: `${draggedSticker.x}px`,
            top: `${draggedSticker.y}px`,
            "--sticker-width": `${draggedSticker.sticker.width}px`,
            "--sticker-height": `${draggedSticker.sticker.height}px`,
          }}
        >
          <img src={draggedSticker.sticker.src} alt="" />
        </div>
      )}

      <footer className="app-footer">
        <StickerStrip stickers={stickerAssets} onStickerDragStart={handleStickerDragStart} />
      </footer>
    </div>
  );
}
