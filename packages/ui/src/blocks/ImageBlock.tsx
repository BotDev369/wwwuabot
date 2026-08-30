/**
 * Block: Зображення
 *
 * Фото або графіка з підписом.
 * Підтримує різну ширину та заокруглені кути.
 *
 * @module packages/ui/src/blocks/ImageBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

interface ImageBlockProps {
  src: string;
  alt?: string;
  caption?: string;
  width?: 'full' | '3/4' | '1/2' | '1/3' | 'auto';
  rounded?: boolean;
}

const widthClasses: Record<string, string> = {
  full: 'w-full',
  '3/4': 'w-3/4 mx-auto',
  '1/2': 'w-1/2 mx-auto',
  '1/3': 'w-1/3 mx-auto',
  auto: 'w-auto',
};

export function ImageBlock({ block, children }: BlockComponentProps) {
  const { src, alt = '', caption, width = 'full', rounded = false } =
    block.props as unknown as ImageBlockProps;

  if (!src) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground italic">
        [Зображення не завантажено]
        {children}
      </div>
    );
  }

  return (
    <figure className={`py-2 ${widthClasses[width] ?? widthClasses.full}`}>
      <img
        src={src}
        alt={alt}
        className={`w-full object-cover ${
          rounded ? 'rounded-lg' : ''
        }`}
        loading="lazy"
      />
      {caption ? (
        <figcaption className="mt-1 text-xs text-center text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
      {children}
    </figure>
  );
}
