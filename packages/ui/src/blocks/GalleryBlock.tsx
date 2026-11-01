/**
 * Page Builder — Gallery Block.
 *
 * Displays a grid of images. Кількість колонок добирає сітка від ширини зони:
 * число з props ламало телефон.
 *
 * @module packages/ui/src/blocks/GalleryBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

interface GalleryImage {
  src: string;
  alt?: string;
  caption?: string;
}

export function GalleryBlock({ block }: BlockComponentProps) {
  const { images = [] } = block.props as { images?: GalleryImage[] };

  if (!images || images.length === 0) return null;

  return (
    <div className="wb-block-gallery">
      {images.map((img, i) => (
        <figure key={i} className="wb-block-gallery__item">
          <img className="wb-block-gallery__img" src={img.src} alt={img.alt || ""} loading="lazy" />
          {img.caption && (
            <figcaption className="wb-block-gallery__caption wb-text-xs">{img.caption}</figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}
