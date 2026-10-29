/**
 * Кирпичик блока сторінки: підпис, який згортає своє тіло.
 * «Системи аналізу» й «Дати» — та сама деталь; другий такий самий підпис із
 * власним станом був би копією (`AGENTS.md` §3). `h2` — навмисно: розмір дає
 * бренд, а дій у підписі немає. Типово тіло **згорнуте** (`useCollapse`):
 * сторінка мусить уміщатися в екран, а назва блока каже, що всередині.
 * @module packages/ui/src/blocks/collapsible-section/CollapsibleSection
 */

import { useId, type ReactNode } from "react";
import { Icon, type IconName } from "@wwwuabot/shared";
import { useCollapse } from "./useCollapse";

export interface CollapsibleSectionProps {
  /** Підпис блока — він же його згортає. */
  title: string;
  /** Знак перед назвою: у списку рядків він і є вибір очима. */
  icon?: IconName;
  /** Підпис біля назви (лічильник): сама назва не каже, скільки всього. */
  meta?: ReactNode;
  /**
   * Блок стоїть **рядком списку** (вхід у розділ), а не підписом частини
   * сторінки: тоді він бере поверхню й мірки рядка (`--row-*`) — ті самі, що
   * в пункту меню. Розділ сторінки лишається без поверхні (правило 12).
   */
  surface?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  icon,
  meta,
  surface = false,
  children,
}: CollapsibleSectionProps) {
  const { open, toggle } = useCollapse();
  const bodyId = useId();
  const toggleClass = open
    ? "wb-block-section__toggle wb-block-section__toggle--open"
    : "wb-block-section__toggle";
  const sectionClass = surface ? "wb-block-section wb-block-section--row" : "wb-block-section";

  return (
    <section className={sectionClass}>
      <h2 className="wb-block-section__head">
        <button
          type="button"
          className={toggleClass}
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={toggle}
        >
          {icon ? (
            <span className="wb-block-section__icon">
              <Icon name={icon} size={20} />
            </span>
          ) : null}
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
