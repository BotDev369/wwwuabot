/**
 * Page Builder — Code Block.
 *
 * Displays a code snippet with optional title, language label, line numbers, and copy button.
 * Uses monospace font from the design system.
 *
 * @module packages/ui/src/blocks/CodeBlock
 */

import { useCallback, useState } from "react";
import { Icon } from "@wwwuabot/shared";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

export function CodeBlock({ block }: BlockComponentProps) {
  const {
    code = "",
    language = "plain",
    title = "",
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

  const lines = code.split("\n");

  return (
    <div className="wb-block-code">
      {(title || language !== "plain") && (
        <div className="wb-block-code__header">
          <span className="wb-text-secondary">{title || language}</span>
          {copyable && (
            <button
              type="button"
              onClick={handleCopy}
              className="wb-btn wb-btn-ghost wb-block-code__copy"
            >
              {copied ? (
                "✓ Скопійовано"
              ) : (
                <>
                  <Icon name="copy" size={12} /> Копіювати
                </>
              )}
            </button>
          )}
        </div>
      )}
      <pre className="wb-block-code__pre">
        <code>
          {showLineNumbers
            ? lines.map((line, i) => (
                <div key={i} className="wb-block-code__line">
                  <span className="wb-block-code__no" aria-hidden="true">
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
