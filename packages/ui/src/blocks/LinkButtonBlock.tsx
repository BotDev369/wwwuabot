/**
 * Page Builder — Link Button Block.
 *
 * A link button with URL navigation and an optional icon.
 * Available in all zones (header, sidebar, main, footer).
 *
 * @module packages/ui/src/blocks/LinkButtonBlock
 */
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { icons, type IconName } from "@wwwuabot/shared";
import { appLinkHandler } from "./link-nav";

const VARIANT_CLASSES: Record<string, string> = {
  primary: "wb-btn wb-btn-primary",
  secondary: "wb-btn wb-btn-secondary",
  outline: "wb-btn",
  ghost: "wb-btn wb-btn-ghost",
};

export function LinkButtonBlock({ block, context }: BlockComponentProps) {
  const {
    text = "Перейти за посиланням",
    url = "#",
    target = "_blank",
    variant = "primary",
    icon,
  } = block.props as {
    text?: string;
    url?: string;
    target?: string;
    variant?: string;
    icon?: string;
  };

  const btnClass = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.primary;
  const isTargetBlank = target === "_blank";

  const iconKey = icon as IconName | undefined;
  const hasIcon = iconKey && iconKey in icons;

  return (
    <div className="wb-block-link-button-wrapper">
      <a
        href={url || "#"}
        target={isTargetBlank ? "_blank" : "_self"}
        rel={isTargetBlank ? "noopener noreferrer" : undefined}
        className={`wb-block-link-button ${btnClass}`}
        onClick={appLinkHandler(url, context.navigate)}
      >
        {hasIcon && <span className="wb-block-link-button__icon">{icons[iconKey]}</span>}
        <span>{text}</span>
      </a>
    </div>
  );
}
