/**
 * Page Builder — Text Block.
 *
 * Displays a title and/or text content with configurable heading level and alignment.
 *
 * @module packages/ui/src/blocks/TextBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

const LEVEL_CLASSES: Record<string, string> = {
  h1: 'wb-text-3xl wb-font-bold',
  h2: 'wb-text-2xl wb-font-bold',
  h3: 'wb-text-xl wb-font-semibold',
  h4: 'wb-text-lg wb-font-semibold',
  body: 'wb-text-base',
};

const ALIGN_CLASSES: Record<string, string> = {
  left: 'wb-text-left',
  center: 'wb-text-center',
  right: 'wb-text-right',
};

export function TextBlock({ block }: BlockComponentProps) {
  const { title = '', content = '', level = 'body', align = 'left' } = block.props as {
    title?: string;
    content?: string;
    level?: string;
    align?: string;
  };

  return (
    <div className={`wb-block-text ${ALIGN_CLASSES[align] ?? ''}`}>
      {title && (
        <h3 className={`wb-block-text__title ${LEVEL_CLASSES[level] ?? ''} wb-mb-2`}>
          {title}
        </h3>
      )}
      {content && (
        <div
          className="wb-block-text__content wb-text-secondary"
          style={{ whiteSpace: 'pre-wrap' }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
