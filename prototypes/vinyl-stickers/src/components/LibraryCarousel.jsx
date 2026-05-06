import { useMemo, useRef, useState } from "react";
import { AlbumCard } from "./AlbumCard.jsx";

const slotStyles = {
  "-3": {
    "--slot-x": "-760px",
    "--slot-y": "42px",
    "--slot-scale": "0.54",
    "--slot-rotate-y": "58deg",
    "--slot-rotate-z": "-5deg",
    "--slot-cover-x": "18px",
    "--slot-darkness": "0.74",
    "--slot-opacity": "0.68",
    "--slot-z": 1,
  },
  "-2": {
    "--slot-x": "-565px",
    "--slot-y": "28px",
    "--slot-scale": "0.7",
    "--slot-rotate-y": "42deg",
    "--slot-rotate-z": "-4deg",
    "--slot-cover-x": "13px",
    "--slot-darkness": "0.58",
    "--slot-opacity": "0.82",
    "--slot-z": 2,
  },
  "-1": {
    "--slot-x": "-330px",
    "--slot-y": "14px",
    "--slot-scale": "0.88",
    "--slot-rotate-y": "30deg",
    "--slot-rotate-z": "-3deg",
    "--slot-cover-x": "8px",
    "--slot-darkness": "0.36",
    "--slot-opacity": "1",
    "--slot-z": 3,
  },
  0: {
    "--slot-x": "0px",
    "--slot-y": "0px",
    "--slot-scale": "1",
    "--slot-rotate-y": "0deg",
    "--slot-rotate-z": "0deg",
    "--slot-cover-x": "0px",
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
    "--slot-cover-x": "-8px",
    "--slot-darkness": "0.34",
    "--slot-opacity": "1",
    "--slot-z": 3,
  },
  2: {
    "--slot-x": "565px",
    "--slot-y": "30px",
    "--slot-scale": "0.7",
    "--slot-rotate-y": "-42deg",
    "--slot-rotate-z": "4deg",
    "--slot-cover-x": "-13px",
    "--slot-darkness": "0.58",
    "--slot-opacity": "0.82",
    "--slot-z": 2,
  },
  3: {
    "--slot-x": "760px",
    "--slot-y": "42px",
    "--slot-scale": "0.54",
    "--slot-rotate-y": "-58deg",
    "--slot-rotate-z": "5deg",
    "--slot-cover-x": "-18px",
    "--slot-darkness": "0.74",
    "--slot-opacity": "0.68",
    "--slot-z": 1,
  },
};

function wrapIndex(index, length) {
  return ((index % length) + length) % length;
}

export function LibraryCarousel({ albums }) {
  const albumCount = albums.length;
  const hasAlbums = albumCount > 0;
  const isSingleAlbum = albumCount === 1;
  const visibleOffsets = isSingleAlbum ? [0] : [-3, -2, -1, 0, 1, 2, 3];
  const [focusedIndex, setFocusedIndex] = useState(2);
  const [dragOffset, setDragOffset] = useState(0);
  const dragRef = useRef(null);

  const slots = useMemo(
    () =>
      visibleOffsets.map((offset) => ({
        offset,
        album: albums[wrapIndex(focusedIndex + offset, albumCount)],
      })),
    [albums, focusedIndex, visibleOffsets, albumCount],
  );

  function moveFocus(delta) {
    if (albumCount <= 1) {
      return;
    }

    setFocusedIndex((current) => wrapIndex(current + delta, albumCount));
  }

  function handlePointerDown(event) {
    if (!hasAlbums || isSingleAlbum) {
      return;
    }

    const clickedSlot = event.target.closest("[data-carousel-offset]");

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      lastX: event.clientX,
      hasMoved: false,
      clickedOffset: clickedSlot ? Number(clickedSlot.dataset.carouselOffset) : 0,
    };
    setDragOffset(0);
  }

  function handlePointerMove(event) {
    if (!dragRef.current) {
      return;
    }

    const offset = event.clientX - dragRef.current.startX;
    dragRef.current.lastX = event.clientX;
    dragRef.current.hasMoved = Math.abs(offset) > 8;
    setDragOffset(Math.max(-180, Math.min(180, offset)));
  }

  function settleDrag() {
    if (!dragRef.current) {
      return;
    }

    const offset = dragRef.current.lastX - dragRef.current.startX;
    if (Math.abs(offset) > 70) {
      moveFocus(offset < 0 ? 1 : -1);
    }

    dragRef.current = null;
    setDragOffset(0);
  }

  function handlePointerUp(event) {
    if (!hasAlbums || isSingleAlbum || !dragRef.current) {
      return;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    const wasClick = dragRef.current && !dragRef.current.hasMoved;
    const clickedOffset = dragRef.current?.clickedOffset ?? 0;

    if (wasClick && clickedOffset !== 0) {
      dragRef.current = null;
      setDragOffset(0);
      moveFocus(clickedOffset);
      return;
    }

    settleDrag();
  }

  function handleCardClick(offset) {
    if (!hasAlbums || isSingleAlbum) {
      return;
    }

    if (dragRef.current?.hasMoved || offset === 0) {
      return;
    }

    moveFocus(offset);
  }

  function handleSlotKeyDown(event, offset) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    handleCardClick(offset);
  }

  if (!hasAlbums) {
    return (
      <section className="carousel-preview" aria-label="Library carousel">
        <p className="carousel-preview__empty">No albums available yet.</p>
      </section>
    );
  }

  return (
    <section
      className={`carousel-preview ${dragRef.current ? "is-dragging" : ""}`}
      aria-label="Library carousel"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={settleDrag}
      style={{ "--drag-offset": `${dragOffset}px` }}
    >
      <div className="carousel-preview__stage">
        {slots.map((slot) => (
          <div
            className="carousel-preview__slot"
            key={`${slot.offset}-${slot.album.id}`}
            role="button"
            tabIndex={0}
            data-carousel-offset={slot.offset}
            aria-label={
              slot.offset === 0
                ? `${slot.album.title} is focused`
                : `Center ${slot.album.title}`
            }
            onClick={() => handleCardClick(slot.offset)}
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
    </section>
  );
}
