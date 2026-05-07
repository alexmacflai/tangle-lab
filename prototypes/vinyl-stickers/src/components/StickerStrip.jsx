import { PlusIcon } from "./Icons.jsx";
import { StickerItem } from "./StickerItem.jsx";
import { vinylAssetPath } from "../data/assetPaths.js";

export function StickerStrip({ stickers }) {
  return (
    <footer className="sticker-strip">
      <div className="sticker-strip__intro">
        <div>
          <p className="sticker-strip__eyebrow">Stickers</p>
          <p className="sticker-strip__copy">Drag and drop to stick to jackets or vinyls</p>
        </div>
        <img className="sticker-strip__arrow" src={vinylAssetPath("/media/stickers/drag-arrow.svg")} alt="" />
      </div>
      <div className="sticker-strip__items">
        {stickers.map((sticker) => (
          <StickerItem key={sticker.id} sticker={sticker} />
        ))}
        <button className="sticker-strip__add" type="button" aria-label="Add sticker">
          <PlusIcon />
        </button>
      </div>
    </footer>
  );
}
