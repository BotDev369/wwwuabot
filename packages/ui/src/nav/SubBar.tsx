/**
 * `SubBar` — **другa смуга** футера: рядок над головною навігацією.
 *
 * Потрібна там, де всередині одного розділу є свої сторінки: у розділі теми
 * їх три — стиль, готові теми й налаштування. Перша
 * смуга веде між **розділами** продукту, і класти туди ще й підрозділи
 * означало б змішати два рівні в одному ряду (AGENTS.md §3, «кирпичик»).
 *
 * **Вигляд — на 9% глибший за фон**, а не лінія чи тінь: друга смуга мусить
 * читатись як «той самий хром, лише на крок глибше». На темному тлі крок іде
 * вгору (світліше), інакше він був би невидимий (правила — `subbar.css`).
 *
 * Смуга **не міняє** висоту розкладки сама: місце під неї лишає той, хто її
 * поставив (`.wb-subbar-layout`), бо стрибок контенту на кожному екрані — це
 * те, що людина відчуває як смикання.
 *
 * @module @wwwuabot/ui/nav
 */

import type { MouseEvent, ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { isTabActive } from "./build-items";
import type { ShellSubItem, SubBarItem } from "./types";

/**
 * Пункти другої смуги → те, що рендериться.
 *
 * Активність рахує **та сама** функція, що й у футера (`isTabActive`): два
 * правила «котра сторінка поточна» розійшлися б на першій же вкладеній адресі.
 */
export function buildSubBarItems({
  items,
  pathname,
  navigate,
  onPlaceholder,
}: {
  items: readonly ShellSubItem[];
  pathname: string;
  navigate: (href: string) => void;
  /** Дотик до пункту без адреси: сказати, що екран ще не готовий. */
  onPlaceholder: (item: ShellSubItem) => void;
}): SubBarItem[] {
  return items.map((item) => {
    const href = item.href;
    return {
      ...item,
      active: href ? isTabActive(pathname, href) : false,
      onSelect: item.onSelect ?? (href ? () => navigate(href) : () => onPlaceholder(item)),
    };
  });
}

function SubBarButton({ item }: { item: SubBarItem }): ReactElement {
  const content = (
    <>
      <span className="wb-subbar-icon">
        <Icon name={item.icon} size={18} />
      </span>
      {/* Підпис є завжди: у другій смузі пунктів мало, і саме слово каже, чим
          вони різняться («Готові теми» / «Стиль» — іконка цього не скаже). */}
      <span className="wb-subbar-label">{item.label}</span>
    </>
  );

  function handleClick(event: MouseEvent<HTMLElement>) {
    if (!item.onSelect) return;
    // Навігацію робить оболонка (react-router): повне перезавантаження в TWA —
    // це втрачений стан і біла вспишка.
    event.preventDefault();
    item.onSelect();
  }

  const className = `wb-subbar-item${item.active ? " wb-subbar-item--active" : ""}`;

  if (item.href) {
    return (
      <a
        className={className}
        href={item.href}
        aria-current={item.active ? "page" : undefined}
        onClick={handleClick}
      >
        {content}
      </a>
    );
  }

  return (
    <button type="button" className={className} aria-label={item.label} onClick={handleClick}>
      {content}
    </button>
  );
}

export function SubBar({
  items,
  label,
}: {
  items: readonly SubBarItem[];
  /** Назва смуги для скрінрідера: «Розділи теми». */
  label: string;
}): ReactElement {
  return (
    <nav className="wb-subbar" aria-label={label}>
      <div className="wb-subbar-inner">
        {items.map((item) => (
          <SubBarButton key={item.key} item={item} />
        ))}
      </div>
    </nav>
  );
}
