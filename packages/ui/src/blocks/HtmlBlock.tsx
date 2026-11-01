/**
 * Page Builder — HTML Block.
 *
 * Renders raw HTML code. Intended for admin-only use.
 *
 * @module packages/ui/src/blocks/HtmlBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

export function HtmlBlock({ block }: BlockComponentProps) {
  const { code = "", sandbox = true } = block.props as {
    code?: string;
    sandbox?: boolean;
  };

  if (!code) return null;

  if (sandbox) {
    return (
      <div
        className="wb-block-html wb-block-html--sandbox"
        dangerouslySetInnerHTML={{ __html: code }}
      />
    );
  }

  return <div className="wb-block-html" dangerouslySetInnerHTML={{ __html: code }} />;
}
