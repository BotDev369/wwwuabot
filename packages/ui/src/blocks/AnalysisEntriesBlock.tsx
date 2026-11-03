/**
 * Page Builder — AnalysisEntriesBlock: перелік входів розділу «Аналіз людей та подій».
 * Сім входів — сім різних питань, тож рядок — картка з назвою й одним реченням,
 * а група задає вибір: один субʼєкт чи порівняння.
 *
 * @module packages/ui/src/blocks/AnalysisEntriesBlock
 */

import { Fragment } from "react";
import { Icon } from "@wwwuabot/shared";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { appLinkHandler } from "./link-nav";

interface EntryItem {
  /** Підпис групи; сусідні входи з тим самим підписом стоять під ним. */
  group?: string;
  title: string;
  lead?: string;
  url: string;
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
            <Fragment key={`${item.title}-${item.url}`}>
              <a
                href={item.url}
                className="wb-entry"
                onClick={appLinkHandler(item.url, context.navigate)}
              >
                <span className="wb-entry__body">
                  <span className="wb-entry__title">
                    {item.title}
                    {item.badge && <span className="wb-entry__badge">{item.badge}</span>}
                  </span>
                  {item.lead && <span className="wb-entry__lead">{item.lead}</span>}
                </span>
                <span className="wb-entry__chevron" aria-hidden="true">
                  <Icon name="chevron-right" size={18} />
                </span>
              </a>
            </Fragment>
          ))}
        </div>
      ))}
    </section>
  );
}
