/**
 * Сторінка «Єдиний UI»: перелік кирпичиків продукту — справжній зразок і
 * присуд ужитку класу. Дані — `ui-inventory.json` (`npm run doc:style`).
 *
 * Розділи згорнуті: перелік довгий, і гортати його щоразу немає сенсу.
 *
 * @module web-admin-dev/src/pages/style/StylePage
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { PageTopbar } from "../../layout/PageTopbar";
import { UiSample, type InventoryCopy, type InventoryElement } from "./UiSamples";
import inventory from "./ui-inventory.json";

type Inventory = {
  page: InventoryCopy & {
    title: string;
    intro: string;
    expandAll: string;
    collapseAll: string;
  };
  verdicts: Record<InventoryElement["verdict"], { label: string; tone: string }>;
  summary: {
    total: number;
    both: number;
    builder: number;
    one: number;
    shared: number;
    unused: number;
  };
  groups: {
    id: string;
    label: string;
    note: string;
    elements: InventoryElement[];
  }[];
};

const data = inventory as Inventory;

function usageCounts(element: InventoryElement, copy: InventoryCopy): ReactElement | null {
  const chips = [
    { key: "platform", label: copy.platform, count: element.usage.platform },
    { key: "admin", label: copy.admin, count: element.usage.admin },
    { key: "ui", label: copy.sharedCode, count: element.usage.ui + element.usage.shared },
  ].filter((chip) => chip.count > 0);

  if (chips.length === 0) return null;

  return (
    <div className="ui-counts">
      {chips.map((chip) => (
        <span key={chip.key} className="ui-count">
          {chip.label} {chip.count}
        </span>
      ))}
    </div>
  );
}

export function StylePage(): ReactElement {
  const { page, summary, verdicts, groups } = data;
  const [open, setOpen] = useState<string[]>([]);

  const toggleGroup = (id: string) =>
    setOpen((prev) => (prev.includes(id) ? prev.filter((key) => key !== id) : [...prev, id]));

  return (
    <>
      {/* Перемикач теми — один на продукт, у сайдбарі: другий тут був би
          копією того самого контрола (AGENTS.md §3). */}
      <PageTopbar>
        <h1 className="wb-topbar-title">{page.title}</h1>
      </PageTopbar>

      <section className="sc-page ui-page">
        <div className="wb-card">
          <div className="wb-card-body ui-intro">
            <p className="wb-text-base">{page.intro}</p>
            <div className="ui-usage">
              <span className="wb-badge wb-badge-neutral">
                {page.total} {summary.total}
              </span>
              <span className="wb-badge wb-badge-green">
                {verdicts.both.label} {summary.both}
              </span>
              <span className="wb-badge wb-badge-green">
                {verdicts.builder.label} {summary.builder}
              </span>
              <span className="wb-badge wb-badge-yellow">
                {verdicts.one.label} {summary.one}
              </span>
              <span className="wb-badge wb-badge-neutral">
                {verdicts.shared.label} {summary.shared}
              </span>
              <span className="wb-badge wb-badge-red">
                {verdicts.unused.label} {summary.unused}
              </span>
            </div>
            <div className="ui-usage">
              <button
                type="button"
                className="wb-btn wb-btn-secondary wb-btn-sm"
                onClick={() => setOpen(groups.map((group) => group.id))}
              >
                {page.expandAll}
              </button>
              <button
                type="button"
                className="wb-btn wb-btn-secondary wb-btn-sm"
                onClick={() => setOpen([])}
              >
                {page.collapseAll}
              </button>
            </div>
            <p className="wb-text-sm wb-text-muted">{page.legend}</p>
          </div>
        </div>

        <div className="wb-card ui-catalog">
          {groups.map((group) => {
            const isOpen = open.includes(group.id);
            return (
              <div className="ui-section" key={group.id}>
                <button
                  type="button"
                  className="ui-section-head"
                  aria-expanded={isOpen}
                  onClick={() => toggleGroup(group.id)}
                >
                  <span className="ui-section-title">{group.label}</span>
                  <span className="ui-count">{group.elements.length}</span>
                  <span className="ui-caret">
                    <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={18} />
                  </span>
                </button>
                {isOpen ? (
                  <div className="ui-section-body">
                    <p className="ui-section-note">{group.note}</p>
                    {group.elements.map((element) => (
                      <div className="ui-row" key={element.id}>
                        <UiSample element={element} copy={page} />
                        <div className="ui-meta">
                          <div className="ui-line">
                            <span className="ui-name">{element.name}</span>
                            <span className={`wb-badge ${verdicts[element.verdict].tone}`}>
                              {verdicts[element.verdict].label}
                            </span>
                          </div>
                          <code className="ui-class">
                            {element.sample === "icon"
                              ? element.className
                              : `.${element.className}`}
                          </code>
                          {element.note ? <span className="ui-note">{element.note}</span> : null}
                          {usageCounts(element, page)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
