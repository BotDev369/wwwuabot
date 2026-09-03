/**
 * Page Builder — Rich Text Block.
 *
 * Renders formatted HTML content with support for bold, italic, links, inline code, and lists.
 * Uses dangerouslySetInnerHTML — only admins should input this content.
 *
 * @module packages/ui/src/blocks/RichTextBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

export function RichTextBlock({ block }: BlockComponentProps) {
  const { html = '' } = block.props as { html?: string };

  if (!html) return null;

  return (
    <div
      className="wb-block-richtext wb-text-primary"
      style={{
        lineHeight: 'var(--font-lineheight-3)',
        wordBreak: 'break-word',
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
