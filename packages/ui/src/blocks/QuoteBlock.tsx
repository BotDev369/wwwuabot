/**
 * Page Builder — Quote Block.
 *
 * Displays a blockquote with optional author attribution and multiple style variants.
 *
 * @module packages/ui/src/blocks/QuoteBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

const STYLE_MAP: Record<string, React.CSSProperties> = {
  'border-left': {
    borderLeft: '3px solid var(--accent)',
    paddingLeft: 'var(--sp-4)',
  },
  'border-right': {
    borderRight: '3px solid var(--accent)',
    paddingRight: 'var(--sp-4)',
    textAlign: 'right',
  },
  filled: {
    background: 'var(--bg-2)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--sp-4)',
  },
  outlined: {
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--sp-4)',
  },
};

export function QuoteBlock({ block }: BlockComponentProps) {
  const {
    text = '',
    author = '',
    role = '',
    style = 'border-left',
  } = block.props as {
    text?: string;
    author?: string;
    role?: string;
    style?: string;
  };

  if (!text) return null;

  return (
    <blockquote
      className="wb-block-quote"
      style={{
        ...STYLE_MAP[style],
        margin: 'var(--sp-2) 0',
      }}
    >
      <p
        className="wb-block-quote__text"
        style={{
          fontStyle: 'italic',
          lineHeight: 'var(--font-lineheight-3)',
          margin: 0,
          color: 'var(--text-primary)',
        }}
      >
        {text}
      </p>
      {(author || role) && (
        <footer className="wb-block-quote__attribution wb-mt-2" style={{ fontStyle: 'normal' }}>
          <cite
            className="wb-text-sm"
            style={{ color: 'var(--text-secondary)', fontStyle: 'normal' }}
          >
            {author}
            {role && (
              <span className="wb-text-xs wb-text-muted"> — {role}</span>
            )}
          </cite>
        </footer>
      )}
    </blockquote>
  );
}
