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

function usageChips(element: InventoryElement, copy: InventoryCopy): ReactElement {
  const chips = [
    { key: "platform", label: copy.platform, count: element.usage.platform },
    { key: "admin", label: copy.admin, count: element.usage.admin },
    { key: "ui", label: copy.sharedCode, count: element.usage.ui + element.usage.shared },
  ].filter((chip) => chip.count > 0);

  return (
    <div className="ui-usage">
      <span className={`wb-badge ${data.verdicts[element.verdict].tone}`}>
        {data.verdicts[element.verdict].label}
      </span>
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

        {groups.map((group) => {
          const isOpen = open.includes(group.id);
          return (
            <div className="wb-card" key={group.id}>
              <button
                type="button"
                className="ui-group-toggle"
                aria-expanded={isOpen}
                onClick={() => toggleGroup(group.id)}
              >
                <span className="wb-card-title">{group.label}</span>
                <span className="wb-badge wb-badge-neutral">{group.elements.length}</span>
                <span className="ui-group-caret">
                  <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={18} />
                </span>
              </button>
              {isOpen ? (
                <div className="wb-card-body">
                  <p className="wb-text-sm wb-text-muted">{group.note}</p>
                  {group.elements.map((element) => (
                    <div className="ui-row" key={element.id}>
                      <UiSample element={element} copy={page} />
                      <div className="ui-meta">
                        <span className="ui-name">{element.name}</span>
                        <code className="ui-class">
                          {element.sample === "icon" ? element.className : `.${element.className}`}
                        </code>
                        {element.note ? (
                          <span className="wb-text-sm wb-text-muted">{element.note}</span>
                        ) : null}
                      </div>
                      {usageChips(element, page)}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </section>
    </>
  );
}
