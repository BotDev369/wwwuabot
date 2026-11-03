/**
 * Сервіси — входи платформи плитками й групами.
 *
 * Дев'ять однакових рядків читались як чекліст і не влазили в екран; плитка
 * несе знак на підкладці свого голосу (`--data-1…6`), як у входах «Аналізу
 * людей та подій».
 * @module web-platform-dev/src/pages/ServicesPage
 */

import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { SERVICES, type ServiceEntry } from "./services-list";

/** Групи в порядку появи: порядок у списку — це порядок читання. */
function groupServices(
  entries: readonly ServiceEntry[],
): { title: string; items: ServiceEntry[] }[] {
  const groups: { title: string; items: ServiceEntry[] }[] = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    if (last && last.title === entry.group) last.items.push(entry);
    else groups.push({ title: entry.group, items: [entry] });
  }
  return groups;
}

export function ServicesPage(): ReactElement {
  useScreenChrome({ title: "Сервіси" });
  const navigate = useNavigate();

  return (
    <div className="wb-page wb-page-scroll">
      <div className="wb-hub">
        {groupServices(SERVICES).map((group) => (
          <section key={group.title} className="wb-hub__group">
            <h2 className="wb-hub__group-title">{group.title}</h2>

            <div className="wb-hub__grid">
              {group.items.map((service) => (
                <button
                  key={service.key}
                  type="button"
                  className="wb-hub__tile"
                  data-tone={service.tone}
                  onClick={() => navigate(service.to)}
                >
                  <span className="wb-hub__icon" aria-hidden="true">
                    <Icon name={service.icon} size={20} />
                  </span>
                  <span className="wb-hub__label">{service.label}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
