/**
 * Page Builder — Rich Text Block.
 *
 * Renders formatted HTML content. Uses dangerouslySetInnerHTML — only admins
 * should input this content.
 *
 * @module packages/ui/src/blocks/RichTextBlock
 */

import { useEffect, useRef } from "react";

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { wrapContentTables } from "./wrap-tables";

export function RichTextBlock({ block }: BlockComponentProps) {
  const { html = "" } = block.props as { html?: string };
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => wrapContentTables(root.current), [html]);

  if (!html) return null;

  return (
    <div
      ref={root}
      className="wb-block-richtext wb-text-primary"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
