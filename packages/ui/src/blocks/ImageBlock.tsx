/**
 * Page Builder — Image Block.
 *
 * Displays an image with optional caption, width constraint, and rounded corners.
 *
 * @module packages/ui/src/blocks/ImageBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

const WIDTH_MAP: Record<string, string> = {
  full: '100%',
  '3/4': '75%',
  '1/2': '50%',
  '1/3': '33.333%',
  auto: 'auto',
};

export function ImageBlock({ block }: BlockComponentProps) {
  const {
    src = '',
    alt = '',
    caption = '',
    width = 'full',
    rounded = false,
  } = block.props as {
    src?: string;
    alt?: string;
    caption?: string;
    width?: string;
    rounded?: boolean;
  };

  if (!src) return null;

  return (
    <figure
      className="wb-block-image"
      style={{ maxWidth: WIDTH_MAP[width] ?? '100%' }}
    >
      <img
        src={src}
        alt={alt}
        className="wb-block-image__img"
        style={{
          width: '100%',
          height: 'auto',
          borderRadius: rounded ? 'var(--radius-lg)' : undefined,
          objectFit: 'cover',
        }}
        loading="lazy"
      />
      {caption && (
        <figcaption className="wb-block-image__caption wb-text-sm wb-text-muted wb-mt-2">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
