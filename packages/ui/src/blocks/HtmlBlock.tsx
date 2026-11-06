/**
 * Page Builder — HTML Block.
 *
 * Renders raw HTML code. Intended for admin-only use.
 *
 * @module packages/ui/src/blocks/HtmlBlock
 */

import { useEffect, useRef } from "react";

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { wrapContentTables } from "./wrap-tables";

export function HtmlBlock({ block }: BlockComponentProps) {
  const { code = "", sandbox = true } = block.props as {
    code?: string;
    sandbox?: boolean;
  };
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => wrapContentTables(root.current), [code]);

  if (!code) return null;

  if (sandbox) {
    return (
      <div
        ref={root}
        className="wb-block-html wb-block-html--sandbox"
        dangerouslySetInnerHTML={{ __html: code }}
      />
    );
  }

  return <div ref={root} className="wb-block-html" dangerouslySetInnerHTML={{ __html: code }} />;
}
