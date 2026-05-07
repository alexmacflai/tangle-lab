import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlbumCard } from "./AlbumCard.jsx";
import { FALLBACK_COVER } from "../data/useAlbums.js";

const VISIBLE_OFFSETS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
const SINGLE_OFFSETS = [0];
const CLICKABLE_RANGE = 3;
const BASE_STAGE_HEIGHT = 640; // px

const slotStyles = {
  "-3": {
    "--slot-x": "-760px",
    "--slot-y": "42px",
    "--slot-scale": "0.54",
    "--slot-rotate-y": "58deg",
    "--slot-rotate-z": "-5deg",
    "--slot-darkness": "0.8",
    "--slot-opacity": "0.68",
    "--slot-z": 1,
  },
  "-2": {
    "--slot-x": "-565px",
    "--slot-y": "28px",
    "--slot-scale": "0.7",
    "--slot-rotate-y": "42deg",
    "--slot-rotate-z": "-4deg",
    "--slot-darkness": "0.7",
    "--slot-opacity": "0.82",
    "--slot-z": 2,
  },
  "-1": {
    "--slot-x": "-330px",
    "--slot-y": "14px",
    "--slot-scale": "0.88",
    "--slot-rotate-y": "30deg",
    "--slot-rotate-z": "-3deg",
    "--slot-darkness": "0.5",
    "--slot-opacity": "1",
    "--slot-z": 3,
  },
  0: {
    "--slot-x": "0px",
    "--slot-y": "0px",
    "--slot-scale": "1",
    "--slot-rotate-y": "0deg",
    "--slot-rotate-z": "0deg",
    "--slot-darkness": "0",
    "--slot-opacity": "1",
    "--slot-z": 8,
  },
  1: {
    "--slot-x": "330px",
    "--slot-y": "14px",
    "--slot-scale": "0.88",
    "--slot-rotate-y": "-30deg",
    "--slot-rotate-z": "3deg",
    "--slot-darkness": "0.5",
    "--slot-opacity": "1",
    "--slot-z": 3,
  },
  2: {
    "--slot-x": "565px",
    "--slot-y": "30px",
    "--slot-scale": "0.7",
    "--slot-rotate-y": "-42deg",
    "--slot-rotate-z": "4deg",
    "--slot-darkness": "0.7",
    "--slot-opacity": "0.82",
    "--slot-z": 2,
  },
  3: {
    "--slot-x": "760px",
    "--slot-y": "42px",
    "--slot-scale": "0.54",
    "--slot-rotate-y": "-58deg",
    "--slot-rotate-z": "5deg",
    "--slot-darkness": "0.8",
    "--slot-opacity": "0.68",
    "--slot-z": 1,
  },
  "-4": {
    "--slot-x": "-940px",
    "--slot-y": "52px",
    "--slot-scale": "0.40",
    "--slot-rotate-y": "68deg",
    "--slot-rotate-z": "-6deg",
    "--slot-darkness": "1",
    "--slot-opacity": "0",
    "--slot-z": 0,
  },
  "-5": {
    "--slot-x": "-1100px",
    "--slot-y": "58px",
    "--slot-scale": "0.30",
    "--slot-rotate-y": "74deg",
    "--slot-rotate-z": "-6.5deg",
    "--slot-darkness": "1",
    "--slot-opacity": "0",
    "--slot-z": 0,
  },
  "-6": {
    "--slot-x": "-1240px",
    "--slot-y": "62px",
    "--slot-scale": "0.22",
    "--slot-rotate-y": "80deg",
    "--slot-rotate-z": "-7deg",
    "--slot-darkness": "1",
    "--slot-opacity": "0",
    "--slot-z": 0,
  },
  4: {
    "--slot-x": "940px",
    "--slot-y": "52px",
    "--slot-scale": "0.40",
    "--slot-rotate-y": "-68deg",
    "--slot-rotate-z": "6deg",
    "--slot-darkness": "1",
    "--slot-opacity": "0",
    "--slot-z": 0,
  },
  5: {
    "--slot-x": "1100px",
    "--slot-y": "58px",
    "--slot-scale": "0.30",
    "--slot-rotate-y": "-74deg",
    "--slot-rotate-z": "6.5deg",
    "--slot-darkness": "1",
    "--slot-opacity": "0",
    "--slot-z": 0,
  },
  6: {
    "--slot-x": "1240px",
    "--slot-y": "62px",
    "--slot-scale": "0.22",
    "--slot-rotate-y": "-80deg",
    "--slot-rotate-z": "7deg",
    "--slot-darkness": "1",
    "--slot-opacity": "0",
    "--slot-z": 0,
  },
};



function wrapIndex(index, length) {
  return ((index % length) + length) % length;
}

export function LibraryCarousel({
  albums,
  onOpenAlbum,
  onFocusedAlbumChange,
  isExtracting = false,
}) {
  const albumCount = albums.length;
  const hasAlbums = albumCount > 0;
  const isSingleAlbum = albumCount === 1;
  const visibleOffsets = isSingleAlbum ? SINGLE_OFFSETS : VISIBLE_OFFSETS;
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [transitionDuration, setTransitionDuration] = useState(260);
  const sectionRef = useRef(null);
  const didSetInitialFocus = useRef(false);

  const slots = useMemo(
    () =>
      visibleOffsets.map((offset) => ({
        offset,
        album: albums[wrapIndex(focusedIndex + offset, albumCount)],
      })),
    [albums, focusedIndex, visibleOffsets, albumCount],
  );

  const moveFocus = useCallback(
    (delta, duration = 260) => {
      if (albumCount <= 1) {
        return;
      }

      setTransitionDuration(duration);
      setFocusedIndex((current) => wrapIndex(current + delta, albumCount));
    },
    [albumCount],
  );

  useEffect(() => {
    if (didSetInitialFocus.current || !hasAlbums) {
      return;
    }

    const preferredIndex = albums.findIndex((album) => album.id === "ctm-vind");
    if (preferredIndex >= 0) {
      setFocusedIndex(preferredIndex);
    }
    didSetInitialFocus.current = true;
  }, [albums, hasAlbums]);

  // Scale stage to fill available height
  useLayoutEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const updateScale = () => {
      const h = el.getBoundingClientRect().height;
      if (h === 0) return false;
      const scale = Math.max(0.4, Math.min(1.35, (h * 0.92) / BASE_STAGE_HEIGHT));
      const sleeveScale = Math.max(0.55, Math.min(1.25, scale));
      el.style.setProperty("--carousel-scale", scale);
      el.style.setProperty("--sleeve-scale", sleeveScale);
      el.style.setProperty("--card-width", `${Math.round(480 * sleeveScale)}px`);
      return true;
    };

    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    updateScale();

    // On hard refresh, first layout pass can still report 0 height.
    // Re-check on next frames so variables never stay at fallback values.
    const raf1 = requestAnimationFrame(updateScale);
    const raf2 = requestAnimationFrame(() => requestAnimationFrame(updateScale));

    window.addEventListener("resize", updateScale);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  useEffect(() => {
    if (!hasAlbums) return;
    onFocusedAlbumChange?.(albums[focusedIndex]?.id ?? null);
  }, [albums, focusedIndex, hasAlbums, onFocusedAlbumChange]);

  useEffect(() => {
    function onKeyDown(event) {
      const tag = event.target.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveFocus(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveFocus(1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moveFocus]);

  function handleSlotClick(offset, event) {
    if (!hasAlbums) return;
    if (offset === 0) {
      const slotEl = event?.currentTarget;
      const sleeveEl = slotEl?.querySelector(".album-card__cover-wrap");
      const sourceRect = sleeveEl?.getBoundingClientRect?.();
      onOpenAlbum?.(albums[focusedIndex], {
        sourceRect: sourceRect
          ? {
              left: sourceRect.left,
              top: sourceRect.top,
              width: sourceRect.width,
              height: sourceRect.height,
            }
          : null,
      });
      return;
    }
    if (isSingleAlbum) return;
    const abs = Math.abs(offset);
    const multiplier = abs === 1 ? 1 : abs === 2 ? 1.5 : 2;
    moveFocus(offset, Math.round(260 * multiplier));
  }

  function handleSlotKeyDown(event, offset) {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    handleSlotClick(offset);
  }

  return (
    <section
      ref={sectionRef}
      className={`carousel-preview ${isExtracting ? "is-extracting" : ""}`}
      aria-label="Library carousel"
      style={{ "--carousel-transition-duration": `${transitionDuration}ms` }}
      onTransitionEnd={() => setTransitionDuration(260)}
    >
      {hasAlbums ? (
        <>
          <div className="carousel-preview__stage">
            {slots.map((slot) => (
              <div
                className="carousel-preview__slot"
                key={slot.album.id}
                role={Math.abs(slot.offset) <= CLICKABLE_RANGE ? "button" : undefined}
                tabIndex={Math.abs(slot.offset) <= CLICKABLE_RANGE ? 0 : -1}
                aria-hidden={Math.abs(slot.offset) > CLICKABLE_RANGE || undefined}
                data-carousel-offset={slot.offset}
                data-carousel-clickable={Math.abs(slot.offset) <= CLICKABLE_RANGE}
                aria-label={
                  slot.offset === 0
                    ? `${slot.album.title} is focused`
                    : Math.abs(slot.offset) <= CLICKABLE_RANGE
                      ? `Center ${slot.album.title}`
                      : undefined
                }
                onClick={(event) => handleSlotClick(slot.offset, event)}
                onKeyDown={(event) => handleSlotKeyDown(event, slot.offset)}
                style={slotStyles[slot.offset]}
              >
                <AlbumCard
                  album={slot.album}
                  state={slot.offset === 0 ? "focused" : "resting"}
                  showStickers={slot.offset === 0 || slot.album.id === "schallaufnahmen"}
                  initialFavorite={slot.album.id === "vind"}
                />
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="carousel-preview__empty">No albums available yet.</p>
      )}
    </section>
  );
}
