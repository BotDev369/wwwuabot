/**
 * Page Builder — Hero Block: банер сторінки.
 *
 * Вигляд — у `components.css`, не інлайном: інлайн не бачить `data-brand` і
 * `data-theme` (правило 14 `docs/DESIGN_SYSTEM.md`). Зовнішніх відступів немає
 * навмисно — просвіт між блоками належить зоні.
 * @module packages/ui/src/blocks/HeroBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

interface HeroButton {
  text: string;
  url?: string;
  variant?: string;
}

/**
 * Вирівнювання — перелік класів, а не склейка (`wb-block-hero--${align}`):
 * довільне значення з `props` інакше дало б клас без правила, який нічого не
 * робить (правило 11 `docs/DESIGN_SYSTEM.md`).
 */
const ALIGN_CLASSES: Record<string, string> = {
  left: "wb-block-hero--left",
  center: "wb-block-hero--center",
  right: "wb-block-hero--right",
};

export function HeroBlock({ block }: BlockComponentProps) {
  const {
    title = "",
    subtitle = "",
    backgroundImage = "",
    buttons = [],
    align = "center",
  } = block.props as {
    title?: string;
    subtitle?: string;
    backgroundImage?: string;
    buttons?: HeroButton[];
    align?: string;
  };

  const alignClass = ALIGN_CLASSES[align] ?? ALIGN_CLASSES.center;
  const className = `wb-block-hero ${alignClass}${backgroundImage ? " wb-block-hero--media" : ""}`;

  return (
    <section
      className={className}
      style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
    >
      {/* Затемнення під фото — щоб білий текст читався на будь-якому знімку. */}
      {backgroundImage && <div className="wb-block-hero__scrim" />}

      <div className="wb-block-hero__body">
        {title && <h2 className="wb-block-hero__title">{title}</h2>}

        {subtitle && <p className="wb-block-hero__subtitle">{subtitle}</p>}

        {buttons.length > 0 && (
          <div className="wb-block-hero__actions">
            {buttons.map((btn, i) => {
              const isSecondary = btn.variant === "secondary";
              const btnClass = isSecondary ? "wb-btn wb-btn-secondary" : "wb-btn wb-btn-primary";

              return btn.url ? (
                <a key={i} href={btn.url} className={btnClass}>
                  {btn.text}
                </a>
              ) : (
                <button key={i} type="button" className={btnClass}>
                  {btn.text}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
