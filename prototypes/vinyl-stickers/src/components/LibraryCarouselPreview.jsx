import { AlbumCard } from "./AlbumCard.jsx";

const slotStyles = {
  far3Left: {
    "--slot-x": "-760px",
    "--slot-y": "42px",
    "--slot-scale": "0.54",
    "--slot-rotate-y": "58deg",
    "--slot-rotate-z": "-5deg",
    "--slot-darkness": "0.74",
    "--slot-opacity": "0.68",
    "--slot-z": 1,
  },
  far2Left: {
    "--slot-x": "-565px",
    "--slot-y": "28px",
    "--slot-scale": "0.7",
    "--slot-rotate-y": "42deg",
    "--slot-rotate-z": "-4deg",
    "--slot-darkness": "0.58",
    "--slot-opacity": "0.82",
    "--slot-z": 2,
  },
  adjacentLeft: {
    "--slot-x": "-330px",
    "--slot-y": "14px",
    "--slot-scale": "0.88",
    "--slot-rotate-y": "30deg",
    "--slot-rotate-z": "-3deg",
    "--slot-darkness": "0.36",
    "--slot-opacity": "1",
    "--slot-z": 3,
  },
  focused: {
    "--slot-x": "0px",
    "--slot-y": "0px",
    "--slot-scale": "1",
    "--slot-rotate-y": "0deg",
    "--slot-rotate-z": "0deg",
    "--slot-darkness": "0",
    "--slot-opacity": "1",
    "--slot-z": 8,
  },
  adjacentRight: {
    "--slot-x": "330px",
    "--slot-y": "14px",
    "--slot-scale": "0.88",
    "--slot-rotate-y": "-30deg",
    "--slot-rotate-z": "3deg",
    "--slot-darkness": "0.34",
    "--slot-opacity": "1",
    "--slot-z": 3,
  },
  far2Right: {
    "--slot-x": "565px",
    "--slot-y": "30px",
    "--slot-scale": "0.7",
    "--slot-rotate-y": "-42deg",
    "--slot-rotate-z": "4deg",
    "--slot-darkness": "0.58",
    "--slot-opacity": "0.82",
    "--slot-z": 2,
  },
};

const carouselSlots = [
  { position: "far3Left", albumIndex: 0, cardState: "resting" },
  { position: "adjacentLeft", albumIndex: 1, cardState: "resting" },
  { position: "focused", albumIndex: 2, cardState: "focused" },
  { position: "adjacentRight", albumIndex: 3, cardState: "resting" },
  { position: "far2Right", albumIndex: 4, cardState: "resting" },
];

export function LibraryCarouselPreview({ albums }) {
  return (
    <section className="carousel-preview" aria-label="Library carousel preview">
      <div className="carousel-preview__stage">
        {carouselSlots.map((slot) => {
          const album = albums[slot.albumIndex];

          return (
            <div
              className={`carousel-preview__slot carousel-preview__slot--${slot.position}`}
              key={slot.position}
              style={slotStyles[slot.position]}
            >
              <AlbumCard album={album} state={slot.cardState} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
