/**
 * TabBar — глобальний нижній футер обох оболонок.
 *
 * Рендерить розмітку `.wb-tabbar*` (стилі — `app-chrome.css`). Склад пунктів
 * приходить від оболонки, тож компонент знає лише про іконку, підпис і адресу.
 *
 * @module @wwwuabot/ui/nav
 */

import type { MouseEvent, ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { TabBarItem } from "./types";

interface TabBarProps {
  items: readonly TabBarItem[];
  /** Підпис навігації для скрінрідера. */
  label?: string;
}

function itemClassName(item: TabBarItem): string {
  let className = "wb-tabbar-item";
  if (item.primary) className += " wb-tabbar-item--primary";
  if (item.active) className += " wb-tabbar-item--active";
  return className;
}

function TabBarButton({ item }: { item: TabBarItem }): ReactElement {
  // «+» — це лише кругла кнопка; підпис у неї не показується, тож він іде
  // в aria-label: інакше слот був би безіменною кнопкою.
  const content = item.primary ? (
    <span className="wb-tabbar-plus">
      <Icon name={item.icon} size={22} />
    </span>
  ) : (
    <>
      <span className="wb-tabbar-icon">
        <Icon name={item.icon} size={24} />
      </span>
      <span className="wb-tabbar-label">{item.label}</span>
    </>
  );

  function handleClick(event: MouseEvent<HTMLElement>) {
    if (!item.onSelect) return;
    // Навігацію робить оболонка (react-router), а не браузер: повне
    // перезавантаження в TWA — це втрачений стан і біла вспишка.
    event.preventDefault();
    item.onSelect();
  }

  if (item.href) {
    return (
      <a
        className={itemClassName(item)}
        href={item.href}
        aria-label={item.label}
        aria-current={item.active ? "page" : undefined}
        onClick={handleClick}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={itemClassName(item)}
      aria-label={item.label}
      onClick={handleClick}
    >
      {content}
    </button>
  );
}

export function TabBar({ items, label = "Основна навігація" }: TabBarProps): ReactElement {
  return (
    <nav className="wb-tabbar" aria-label={label}>
      <div className="wb-tabbar-inner">
        {items.map((item) => (
          <TabBarButton key={item.key} item={item} />
        ))}
      </div>
    </nav>
  );
}
