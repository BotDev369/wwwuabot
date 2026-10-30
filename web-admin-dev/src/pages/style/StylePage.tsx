/**
 * Сторінка «Стиль»: інвентар вигляду — токени, кирпичики й класи.
 *
 * Список тут не описується (AGENTS.md §3): джерело — CSS, каталог — міст між
 * ними (`npm run doc:style`). Каталог приходить ресурсом, а не модулем, тож
 * сторінка має стан завантаження.
 * @module web-admin-dev/src/pages/style/StylePage
 */

import { useMemo, useState } from "react";
import { Icon } from "@wwwuabot/shared";
import { Tabs, type TabOption } from "@wwwuabot/ui/tabs";
import { PageTopbar } from "../../layout/PageTopbar";
import { BrickList } from "./BrickList";
import { ClassList } from "./ClassList";
import { TokenList } from "./TokenList";
import {
  BRICK_GROUPS,
  PREVIEWED_CLASSES,
  useFilter,
  useLiveTokens,
  useStyleCatalog,
} from "./useStyleInventory";

type Tab = "tokens" | "bricks" | "classes";

const TABS = [
  { key: "tokens", label: "Токени" },
  { key: "bricks", label: "Кирпичики" },
  { key: "classes", label: "Класи" },
] as const satisfies readonly TabOption<Tab>[];

const BRICK_COUNT = BRICK_GROUPS.reduce((n, group) => n + group.items.length, 0);

export function StylePage() {
  const [tab, setTab] = useState<Tab>("tokens");
  const [focused, setFocused] = useState(false);
  const { status, catalog } = useStyleCatalog();
  const { query, setQuery, tokens, locals, classes, bricks } = useFilter(catalog);
  const tokenNames = useMemo(() => catalog?.tokens.map((token) => token.name) ?? [], [catalog]);
  const live = useLiveTokens(tokenNames);
  // Розкрите поле тримає або фокус, або вже набраний запит: згорнути пошук, у
  // якому щось написано, — це втратити його з очей.
  const searchOpen = focused || query.length > 0;

  const stats = catalog
    ? [
        { value: catalog.files.length, label: "CSS-файлів" },
        { value: catalog.tokens.length, label: "токенів" },
        { value: catalog.classNames.length, label: "класів" },
        { value: BRICK_COUNT, label: "кирпичиків" },
        {
          value: catalog.classNames.filter((name) => PREVIEWED_CLASSES.has(name)).length,
          label: "класів із прев'ю",
        },
      ]
    : [];

  return (
    <>
      <PageTopbar>
        <h1 className="wb-topbar-title">Стиль</h1>
        <div className="wb-topbar-right">
          <span className="st-stat-label st-source">джерело: packages/shared/src/styles</span>
        </div>
      </PageTopbar>

      <section className="st">
        {status === "loading" && <p className="st-empty">Завантажую каталог вигляду…</p>}
        {status === "error" && (
          <p className="st-empty">Каталог вигляду не завантажився — онови сторінку.</p>
        )}

        {catalog && (
          <>
            <div className="st-summary">
              {stats.map((stat) => (
                <div className="st-stat" key={stat.label}>
                  <span className="st-stat-value">{stat.value}</span>
                  <span className="st-stat-label">{stat.label}</span>
                </div>
              ))}
            </div>

            <div className="st-bar">
              {/* Смуга вкладок — спільний кирпичик: власна розмітка розійшлася б із
                  акаунтом і трекерами на першій же правці (AGENTS.md §3). */}
              <Tabs options={TABS} value={tab} onChange={setTab} label="Розділи інвентаря" />

              {/* Пошук — смуга колекції: у спокої вона завширшки з підпис і
                  розкривається на фокус, інакше порожнє поле з'їдало ряд у вкладок
                  (правило 18). */}
              <div
                className={`wb-tools-search st-search${searchOpen ? " wb-tools-search--open" : ""}`}
              >
                <Icon name="search" size={16} className="wb-tools-search-icon" />
                <input
                  className="wb-input"
                  type="search"
                  value={query}
                  placeholder="Пошук"
                  aria-label="Пошук по інвентарю вигляду"
                  enterKeyHint="search"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query.length > 0 && (
                  <button
                    type="button"
                    className="wb-tools-search-clear"
                    aria-label="Прибрати пошук"
                    title="Прибрати пошук"
                    onClick={() => setQuery("")}
                  >
                    <Icon name="close" size={14} />
                  </button>
                )}
              </div>
            </div>

            {tab === "tokens" && (
              <TokenList tokens={tokens} locals={locals} allTokens={catalog.tokens} live={live} />
            )}
            {tab === "bricks" && <BrickList groups={bricks} />}
            {tab === "classes" && <ClassList classes={classes} classNames={catalog.classNames} />}
          </>
        )}
      </section>
    </>
  );
}
