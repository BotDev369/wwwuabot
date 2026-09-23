/**
 * `SideBar` — **єдиний типовий сайдбар** продукту.
 *
 * Кирпичики `.wb-nav*` (`app-chrome.css`) описують, як сайдбар виглядає; тут
 * описано, з чого він складається, — і робить це **один** компонент, бо деталь
 * одна: меню адмінки, панель розділів Простору й список розділів теми — це та
 * сама річ у трьох місцях. Доти кожне з них мало свою розмітку (а розділи
 * теми — ще й свої класи `.wb-theme-nav*` зі своїми мірками), тож мірки
 * розходились на першій же правці, а око читало один продукт як три різні.
 *
 * **Склад — дані, місце — того, хто кличе.** Компонент не знає ні адрес, ні
 * розділів: він бере `sections` і рендерить пункти. Відрізняє сайдбари одне від
 * одного рівно **місце** (адмінка — хром застосунку, Простір — усередині
 * сторінки), і за це відповідає `className`: так `space-nav.css` додає самі
 * лише `position` і ширину, не переписуючи жодної мірки пункту.
 *
 * **Три способи дії — і всі вже є в продукті:** адреса (`href` + `navigate` —
 * перехід у межах SPA, як у `SubBar`), своя дія (`onSelect` — вкладки Простору)
 * або заглушка (`onPlaceholder` — екран, якого ще немає). Пункт без жодного з
 * трьох не мовчить: він віддає себе `onPlaceholder`, а не робить вигляд, що
 * натискається.
 *
 * **Згорнутий стан — це відсутність підпису, а не інша геометрія:** знак
 * лишається на своєму місці (у колонці пункту), тож згортання не зсуває його
 * ні на піксель, а ім'я пункту не губиться — воно в `title` і `aria-label`.
 *
 * @module @wwwuabot/ui/nav
 */

import type { MouseEvent, ReactElement, ReactNode } from "react";
import { Icon } from "@wwwuabot/shared";
import type { SideBarItem, SideBarSection } from "./types";

interface SideBarMenuProps {
  sections: readonly SideBarSection[];
  /** Згорнутий сайдбар: пункт лишає сам знак. */
  collapsed?: boolean;
  /** Ім'я сайдбара для скрінрідера: «Розділи простору». */
  label: string;
  /** Роль смуги, коли це не список посилань (`tablist`, `radiogroup`). */
  role?: "tablist" | "radiogroup";
  /** Напрям для `tablist` — сайдбар завжди стовпчик. */
  orientation?: "vertical" | "horizontal";
  /** Перехід у межах SPA (`useNavigate`): повне перезавантаження в TWA — втрачений стан. */
  navigate?: (href: string) => void;
  /** Дотик до пункту без адреси: сказати, що екран ще не готовий. */
  onPlaceholder?: (item: SideBarItem) => void;
}

/** Одна дія пункту — з трьох рівнозначних джерел вище. */
function actionOf(
  item: SideBarItem,
  navigate: ((href: string) => void) | undefined,
  onPlaceholder: ((item: SideBarItem) => void) | undefined,
): (() => void) | undefined {
  if (item.onSelect) return item.onSelect;
  const href = item.href;
  if (href && navigate) return () => navigate(href);
  if (onPlaceholder) return () => onPlaceholder(item);
  return undefined;
}

function SideBarRow({
  item,
  collapsed,
  navigate,
  onPlaceholder,
}: {
  item: SideBarItem;
  collapsed: boolean;
  navigate?: (href: string) => void;
  onPlaceholder?: (item: SideBarItem) => void;
}): ReactElement {
  const onSelect = actionOf(item, navigate, onPlaceholder);

  function handleClick(event: MouseEvent<HTMLElement>) {
    if (!onSelect) return;
    // Навігацію робить оболонка (react-router): пункт лишається `<a>` (видно
    // адресу, працює «відкрити в новій вкладці»), а перехід робить вона.
    if (item.href) event.preventDefault();
    onSelect();
  }

  const className = `wb-nav-item${item.active ? " wb-nav-item--active" : ""}`;

  // Роль пункту — **вміст**, а не оформлення: вкладка каже `aria-selected`, вибір
  // — `aria-checked`, а звичайний пункт меню лише позначає себе як поточний.
  const aria =
    item.role === "tab"
      ? {
          role: "tab" as const,
          id: item.id,
          "aria-selected": item.active,
          "aria-controls": item.panelId,
        }
      : item.role === "radio"
        ? { role: "radio" as const, "aria-checked": item.active }
        : { "aria-current": item.active ? ("page" as const) : undefined };

  const content = (
    <>
      <span className="wb-nav-icon">
        <Icon name={item.icon} size={20} />
      </span>
      {!collapsed && (
        <span className="wb-nav-text">
          <span className="wb-nav-label">{item.label}</span>
          {item.hint != null && <span className="wb-nav-hint">{item.hint}</span>}
        </span>
      )}
      {!collapsed && item.more && (
        <span className="wb-nav-more">
          <Icon name="chevron-right" size={18} />
        </span>
      )}
    </>
  );

  // Згорнутий пункт — сам знак: ім'я мусить лишитись хоч десь, і це `title`
  // (миша) та `aria-label` (скрінрідер).
  const name = collapsed ? { title: item.label, "aria-label": item.label } : {};

  if (item.href) {
    return (
      <a className={className} href={item.href} {...aria} {...name} onClick={handleClick}>
        {content}
      </a>
    );
  }

  return (
    <button className={className} type="button" {...aria} {...name} onClick={handleClick}>
      {content}
    </button>
  );
}

/** Список пунктів сайдбара — без самої коробки (розділи теми стоять у сторінці). */
export function SideBarMenu({
  sections,
  collapsed = false,
  label,
  role,
  orientation,
  navigate,
  onPlaceholder,
}: SideBarMenuProps): ReactElement {
  return (
    <nav
      className="wb-nav-menu"
      aria-label={label}
      role={role}
      aria-orientation={role === "tablist" ? orientation : undefined}
    >
      {sections.map((section) => (
        <div className="wb-nav-section" key={section.key}>
          {/* Заголовок секції повторював би знаки, коли підписів немає зовсім. */}
          {section.title != null && !collapsed && (
            <div className="wb-nav-section-title">{section.title}</div>
          )}
          {section.items.map((item) => (
            <SideBarRow
              key={item.key}
              item={item}
              collapsed={collapsed}
              navigate={navigate}
              onPlaceholder={onPlaceholder}
            />
          ))}
        </div>
      ))}
    </nav>
  );
}

/**
 * Коробка сайдбара: шапка, список, низ.
 *
 * Список приходить **дітьми**, бо місце володіє і ним: адмінка рендерить
 * `SidebarNav` зі свого store, Простір — `SideBarMenu` зі своїх розділів. Дві
 * коробки під ту саму річ розійшлися б першою ж правкою, тож коробка одна.
 */
export interface SideBarProps {
  /** Своя коробка сайдбара: місце, у якому він стоїть (`wb-space-nav`). */
  className?: string;
  /** Згорнутий сайдбар: підписи не рендеряться — лишається сам знак. */
  collapsed?: boolean;
  /** Шапка сайдбара (лого, тумблер згортання) — те, чим володіє місце. */
  header?: ReactNode;
  /** Низ сайдбара (вихід) — теж власність місця. */
  footer?: ReactNode;
  /** Список пунктів: `SideBarMenu` або свій (адмінка). */
  children: ReactNode;
}

export function SideBar({
  className,
  collapsed = false,
  header,
  footer,
  children,
}: SideBarProps): ReactElement {
  return (
    <aside
      className={`wb-nav${collapsed ? " wb-nav--collapsed" : ""}${className ? ` ${className}` : ""}`}
    >
      {header}
      {children}
      {footer}
    </aside>
  );
}
