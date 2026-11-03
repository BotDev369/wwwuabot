/**
 * Page Builder — AnalysisEntriesBlock: перелік входів розділу «Аналіз людей та подій».
 * Рядок — картка зі знаком, назвою й шевроном: пояснювати входи не потрібно,
 * назва вже каже, кого читаємо. Знак і тон роблять сім входів різними на око.
 *
 * @module packages/ui/src/blocks/AnalysisEntriesBlock
 */

import { Icon, type IconName } from "@wwwuabot/shared";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { appLinkHandler } from "./link-nav";

interface EntryItem {
  /** Підпис групи; сусідні входи з тим самим підписом стоять під ним. */
  group?: string;
  title: string;
  url: string;
  icon?: IconName;
  /** Номер голосу зі спектра теми (`--data-1…6`), а не конкретний колір. */
  tone?: number;
  badge?: string;
}

/** Групи в порядку появи: порядок у списку — це порядок читання. */
function groupEntries(items: EntryItem[]): { title: string; items: EntryItem[] }[] {
  const groups: { title: string; items: EntryItem[] }[] = [];
  for (const item of items) {
    const title = item.group ?? "";
    const last = groups[groups.length - 1];
    if (last && last.title === title) last.items.push(item);
    else groups.push({ title, items: [item] });
  }
  return groups;
}

export function AnalysisEntriesBlock({ block, context }: BlockComponentProps) {
  const { title, items = [] } = block.props as { title?: string; items?: EntryItem[] };

  if (items.length === 0) return null;

  return (
    <section className="wb-block-entries">
      {title && <h2 className="wb-block-entries__title">{title}</h2>}

      {groupEntries(items).map((group) => (
        <div key={group.title} className="wb-entries-group">
          {group.title && <h3 className="wb-entries-group__title">{group.title}</h3>}

          {group.items.map((item) => (
            <a
              key={`${item.title}-${item.url}`}
              href={item.url}
              className="wb-entry"
              data-tone={item.tone ?? 1}
              onClick={appLinkHandler(item.url, context.navigate)}
            >
              <span className="wb-entry__icon" aria-hidden="true">
                <Icon name={item.icon ?? "page"} size={20} />
              </span>
              <span className="wb-entry__title">
                {item.title}
                {item.badge && <span className="wb-entry__badge">{item.badge}</span>}
              </span>
              <span className="wb-entry__chevron" aria-hidden="true">
                <Icon name="chevron-right" size={18} />
              </span>
            </a>
          ))}
        </div>
      ))}
    </section>
  );
}
