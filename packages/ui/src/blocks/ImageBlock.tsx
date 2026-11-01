/**
 * Page Builder — Image Block.
 *
 * Displays an image with optional caption.
 *
 * @module packages/ui/src/blocks/ImageBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

export function ImageBlock({ block }: BlockComponentProps) {
  const {
    src = "",
    alt = "",
    caption = "",
  } = block.props as {
    src?: string;
    alt?: string;
    caption?: string;
  };

  if (!src) return null;

  return (
    <figure className="wb-block-image">
      <img src={src} alt={alt} className="wb-block-image__img" loading="lazy" />
      {caption && <figcaption className="wb-block-image__caption wb-text-sm">{caption}</figcaption>}
    </figure>
  );
}
