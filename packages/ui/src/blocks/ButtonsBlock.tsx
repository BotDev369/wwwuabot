/**
 * Page Builder — Buttons Block.
 *
 * Displays a group of action buttons (links or actions).
 *
 * @module packages/ui/src/blocks/ButtonsBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { appLinkHandler } from "./link-nav";

interface ButtonItem {
  text: string;
  url?: string;
  action?: string;
  variant?: string;
  icon?: string;
}

const VARIANT_CLASS: Record<string, string> = {
  primary: "wb-btn wb-btn-primary",
  secondary: "wb-btn wb-btn-secondary",
  outline: "wb-btn",
  ghost: "wb-btn wb-btn-ghost",
};

export function ButtonsBlock({ block, context }: BlockComponentProps) {
  const { items = [] } = block.props as { items?: ButtonItem[] };

  if (!items || items.length === 0) return null;

  return (
    <div className="wb-block-buttons">
      {items.map((btn, i) => {
        const className = VARIANT_CLASS[btn.variant ?? "primary"] ?? "wb-btn wb-btn-primary";

        if (btn.url) {
          return (
            <a
              key={i}
              href={btn.url}
              className={className}
              target="_blank"
              rel="noopener noreferrer"
              onClick={appLinkHandler(btn.url, context.navigate)}
            >
              {btn.text}
            </a>
          );
        }

        return (
          <button key={i} type="button" className={className} data-action={btn.action}>
            {btn.text}
          </button>
        );
      })}
    </div>
  );
}
