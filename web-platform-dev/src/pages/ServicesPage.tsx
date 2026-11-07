/**
 * Сервіси — входи платформи плитками й групами; кожне слово приходить із рядка
 * `scenarios`, у коді лишаються ключі (`docs/SCREEN_TEXTS.md`).
 *
 * @module web-platform-dev/src/pages/ServicesPage
 */

import { useMemo, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import type { ScreenTexts } from "@wwwuabot/shared/screens";
import { screenText } from "@wwwuabot/shared/screens";
import { useScreenTexts } from "./screen-texts/useScreenTexts";
import {
  SERVICES,
  SERVICES_SCREEN_KEY,
  SERVICES_TITLE_KEY,
  serviceGroupKey,
  serviceLabelKey,
  type ServiceEntry,
} from "./services-list";

interface LabeledService extends ServiceEntry {
  label: string;
}

interface ServiceGroup {
  title: string;
  items: LabeledService[];
}

/** Групи в порядку появи; сервіс без підпису не стає порожньою плиткою. */
function groupServices(entries: readonly ServiceEntry[], texts: ScreenTexts): ServiceGroup[] {
  const groups: ServiceGroup[] = [];
  for (const entry of entries) {
    const label = screenText(texts, serviceLabelKey(entry.key));
    if (!label) continue;
    const title = screenText(texts, serviceGroupKey(entry.group));
    const last = groups[groups.length - 1];
    if (last && last.title === title) last.items.push({ ...entry, label });
    else groups.push({ title, items: [{ ...entry, label }] });
  }
  return groups;
}

export function ServicesPage(): ReactElement {
  const { texts, ready } = useScreenTexts(SERVICES_SCREEN_KEY);
  useScreenChrome({ title: screenText(texts, SERVICES_TITLE_KEY) });
  const navigate = useNavigate();
  const groups = useMemo(() => groupServices(SERVICES, texts), [texts]);

  if (!ready) return <div className="wb-page wb-page-scroll" />;

  return (
    <div className="wb-page wb-page-scroll">
      <div className="wb-hub">
        {groups.map((group) => (
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
