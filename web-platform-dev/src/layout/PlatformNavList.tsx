/**
 * Список розділів — **одне джерело, два місця**: головна й меню.
 * Пункт — посилання (адреса видима, працює нова вкладка), а перехід у межах
 * SPA робить оболонка через `onNavigate`.
 *
 * @module web-platform-dev/src/layout/PlatformNavList
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { sectionTone } from "./screen-tone";
import type { PlatformNavGroup } from "./screen-nav";

export interface PlatformNavListProps {
  groups: readonly PlatformNavGroup[];
  /** Перехід у межах SPA; без нього пункт лишається звичайним посиланням. */
  onNavigate?: (href: string) => void;
  /** Ім'я списку для скрінрідера. */
  label?: string;
  className?: string;
}

export function PlatformNavList({
  groups,
  onNavigate,
  label = "Розділи платформи",
  className,
}: PlatformNavListProps): ReactElement {
  return (
    <nav className={`wb-showcase-groups${className ? ` ${className}` : ""}`} aria-label={label}>
      {groups.map((group) => (
        <section className="wb-showcase-group" key={group.key}>
          <ul className="wb-showcase-list">
            {group.items.map((item) => (
              <li key={item.key}>
                <a
                  className="wb-showcase-row"
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                  onClick={(event) => {
                    if (!onNavigate) return;
                    // SPA-перехід: повне перезавантаження в TWA втрачає стан.
                    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                    event.preventDefault();
                    onNavigate(item.href);
                  }}
                >
                  <span
                    className="wb-showcase-row-icon"
                    data-tone={sectionTone(item.key)}
                    aria-hidden="true"
                  >
                    <Icon name={item.icon} size={20} />
                  </span>
                  <span className="wb-showcase-row-label">{item.label}</span>
                  <span className="wb-showcase-row-more" aria-hidden="true">
                    <Icon name="chevron-right" size={18} />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
