/**
 * Сторінка «Єдиний UI»: перелік кирпичиків продукту — справжній зразок і
 * присуд ужитку класу. Дані — `ui-inventory.json` (`npm run doc:style`).
 *
 * @module web-admin-dev/src/pages/style/StylePage
 */

import type { ReactElement } from "react";
import { PageTopbar } from "../../layout/PageTopbar";
import { UiSample, type InventoryCopy, type InventoryElement } from "./UiSamples";
import inventory from "./ui-inventory.json";

type Inventory = {
  page: InventoryCopy & { title: string; intro: string };
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
            <p className="wb-text-sm wb-text-muted">{page.legend}</p>
          </div>
        </div>

        {groups.map((group) => (
          <div className="wb-card" key={group.id}>
            <div className="wb-card-header">
              <h2 className="wb-card-title">{group.label}</h2>
              <span className="wb-badge wb-badge-neutral">{group.elements.length}</span>
            </div>
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
          </div>
        ))}
      </section>
    </>
  );
}
