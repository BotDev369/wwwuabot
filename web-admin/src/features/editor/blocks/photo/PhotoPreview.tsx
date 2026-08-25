import type { InternalPhotoBlock } from "./PhotoEditor";

export function PhotoPreview({ block }: { block: InternalPhotoBlock }) {
  if (!block.media) return <div className="tg-unknown">[Фото без URL]</div>;
  return <img className="tg-photo-block" src={block.media} alt="" />;
}