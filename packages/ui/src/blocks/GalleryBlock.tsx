/**
 * Page Builder — Gallery Block.
 *
 * Displays a grid of images with configurable columns, gap, and rounded corners.
 *
 * @module packages/ui/src/blocks/GalleryBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

interface GalleryImage {
  src: string;
  alt?: string;
  caption?: string;
}

export function GalleryBlock({ block }: BlockComponentProps) {
  const {
    images = [],
    columns = '2',
    rounded = true,
    gap = 'md',
  } = block.props as {
    images?: GalleryImage[];
    columns?: string;
    rounded?: boolean;
    gap?: string;
  };

  if (!images || images.length === 0) return null;

  const gapMap: Record<string, string> = {
    sm: 'var(--sp-2)',
    md: 'var(--sp-3)',
    lg: 'var(--sp-5)',
  };

  return (
    <div
      className="wb-block-gallery"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: gapMap[gap] ?? gapMap.md,
      }}
    >
      {images.map((img, i) => (
        <figure
          key={i}
          className="wb-block-gallery__item"
          style={{ margin: 0 }}
        >
          <img
            src={img.src}
            alt={img.alt || ''}
            loading="lazy"
            style={{
              width: '100%',
              height: '200px',
              objectFit: 'cover',
              borderRadius: rounded ? 'var(--radius-md)' : undefined,
              display: 'block',
            }}
          />
          {img.caption && (
            <figcaption className="wb-text-xs wb-text-muted wb-mt-1">
              {img.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}
