/**
 * Page Builder — Quote Block.
 *
 * Displays a blockquote with optional author attribution.
 *
 * @module packages/ui/src/blocks/QuoteBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

export function QuoteBlock({ block }: BlockComponentProps) {
  const {
    text = "",
    author = "",
    role = "",
  } = block.props as {
    text?: string;
    author?: string;
    role?: string;
  };

  if (!text) return null;

  return (
    <blockquote className="wb-block-quote">
      <p className="wb-block-quote__text">{text}</p>
      {(author || role) && (
        <footer className="wb-block-quote__attribution">
          <cite>
            {author}
            {role && <span className="wb-block-quote__role"> — {role}</span>}
          </cite>
        </footer>
      )}
    </blockquote>
  );
}
