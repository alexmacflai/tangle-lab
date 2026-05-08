const MAX_SURFACE_STICKERS = 3;

export function getSurfaceStickers(album, surface) {
  const stickers = Array.isArray(album?.stickers) ? album.stickers : [];
  return stickers
    .filter((sticker) => {
      if (surface === "sleeve") {
        return !sticker.surface || sticker.surface === "sleeve";
      }
      return sticker.surface === surface;
    })
    .slice(0, MAX_SURFACE_STICKERS);
}
