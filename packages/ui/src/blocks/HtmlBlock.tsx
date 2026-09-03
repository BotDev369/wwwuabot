/**
 * Page Builder — HTML Block.
 *
 * Renders raw HTML code. Intended for admin-only use.
 * When sandboxed, wraps in a container with limited styling.
 *
 * @module packages/ui/src/blocks/HtmlBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

export function HtmlBlock({ block }: BlockComponentProps) {
  const { code = '', sandbox = true } = block.props as {
    code?: string;
    sandbox?: boolean;
  };

  if (!code) return null;

  if (sandbox) {
    return (
      <div
        className="wb-block-html wb-block-html--sandbox"
        style={{
          border: '1px dashed var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--sp-2)',
          fontSize: 'var(--text-sm)',
        }}
        dangerouslySetInnerHTML={{ __html: code }}
      />
    );
  }

  return (
    <div
      className="wb-block-html"
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
