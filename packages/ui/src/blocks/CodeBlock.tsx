/**
 * Page Builder — Code Block.
 *
 * Displays a code snippet with optional title, language label, line numbers, and copy button.
 * Uses monospace font from the design system.
 *
 * @module packages/ui/src/blocks/CodeBlock
 */

import { useCallback, useState } from 'react';
import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

export function CodeBlock({ block }: BlockComponentProps) {
  const {
    code = '',
    language = 'plain',
    title = '',
    showLineNumbers = false,
    copyable = true,
  } = block.props as {
    code?: string;
    language?: string;
    title?: string;
    showLineNumbers?: boolean;
    copyable?: boolean;
  };

  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [code]);

  if (!code) return null;

  const lines = code.split('\n');

  return (
    <div
      className="wb-block-code"
      style={{
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-2)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}
    >
      {(title || language !== 'plain') && (
        <div
          className="wb-block-code__header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--sp-2) var(--sp-3)',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: 'var(--text-xs)',
          }}
        >
          <span className="wb-text-secondary">{title || language}</span>
          {copyable && (
            <button
              type="button"
              onClick={handleCopy}
              className="wb-btn wb-btn-ghost"
              style={{ padding: '2px var(--sp-2)', fontSize: 'var(--text-xs)' }}
            >
              {copied ? '✓ Скопійовано' : '📋 Копіювати'}
            </button>
          )}
        </div>
      )}
      <pre
        className="wb-block-code__pre"
        style={{
          margin: 0,
          padding: 'var(--sp-3)',
          overflowX: 'auto',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-sm)',
          lineHeight: 'var(--font-lineheight-3)',
          color: 'var(--text-primary)',
        }}
      >
        <code>
          {showLineNumbers
            ? lines.map((line, i) => (
                <div key={i} style={{ display: 'flex' }}>
                  <span
                    style={{
                      userSelect: 'none',
                      color: 'var(--text-muted)',
                      marginRight: 'var(--sp-3)',
                      minWidth: '2em',
                      textAlign: 'right',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span>{line}</span>
                </div>
              ))
            : code}
        </code>
      </pre>
    </div>
  );
}
