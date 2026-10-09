/**
 * Кирпичик блока сторінки: підпис, який згортає своє тіло.
 * «Системи аналізу» й «Дати» — та сама деталь: підпис із кареткою й
 * лічильником, а під ним вміст; другий такий самий підпис був би копією
 * (`AGENTS.md` §3). `h2` — навмисно: розмір дає бренд, а дій у підписі немає:
 * кнопка в ньому читалась частиною назви («Дати · Нова дата») і стискала підпис.
 * @module packages/ui/src/blocks/collapsible-section/CollapsibleSection
 */

import { useId, type ReactNode } from "react";
import { Icon } from "@wwwuabot/shared";
import { useCollapse } from "./useCollapse";

export interface CollapsibleSectionProps {
  /** Підпис блока — він же його згортає. */
  title: string;
  /** Підпис біля назви (лічильник): сама назва не каже, скільки всього. */
  meta?: ReactNode;
  children: ReactNode;
}

export function CollapsibleSection({ title, meta, children }: CollapsibleSectionProps) {
  const { open, toggle } = useCollapse();
  const bodyId = useId();
  const toggleClass = open
    ? "wb-block-section__toggle wb-block-section__toggle--open"
    : "wb-block-section__toggle";

  return (
    <section className="wb-block-section">
      <h2 className="wb-block-section__head">
        <button
          type="button"
          className={toggleClass}
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={toggle}
        >
          <span className="wb-block-section__title">{title}</span>
          {meta ? <span className="wb-block-section__meta">{meta}</span> : null}
          <span className="wb-block-section__caret">
            <Icon name={open ? "chevron-up" : "chevron-down"} size={18} />
          </span>
        </button>
      </h2>

      {/* Тіло зникає разом зі станом: згорнутий блок не тримає мережевих
          запитів і не лишає в розмітки того, чого людина не бачить. */}
      {open && (
        <div className="wb-block-section__body" id={bodyId}>
          {children}
        </div>
      )}
    </section>
  );
}
