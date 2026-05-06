import { FALLBACK_COVER } from "../data/useAlbums.js";

export function CarouselBlurBackground({ layers, fallbackSrc = FALLBACK_COVER }) {
  return (
    <div className="carousel-bg-wrap" aria-hidden="true">
      <div className="carousel-bg" aria-hidden="true">
        {layers.map((layer, index) => (
          <div
            key={index}
            className="carousel-bg__layer"
            style={{ opacity: layer.active ? 1 : 0 }}
          >
            <img
              src={layer.src}
              className="carousel-bg__img"
              alt=""
              onError={(event) => {
                event.currentTarget.src = fallbackSrc;
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
