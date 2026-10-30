/**
 * Сторінка «Стиль»: інвентар вигляду — токени, кирпичики й класи.
 *
 * Список тут не описується (AGENTS.md §3): джерело — CSS, а каталог між ними
 * лише міст (`npm run doc:style`, стежить `check:style`).
 *
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
  CATALOG_FILES,
  CATALOG_TOKENS,
  CLASS_NAMES,
  PREVIEWED_CLASSES,
  useFilter,
  useLiveTokens,
} from "./useStyleInventory";

type Tab = "tokens" | "bricks" | "classes";

const TABS = [
  { key: "tokens", label: "Токени" },
  { key: "bricks", label: "Кирпичики" },
  { key: "classes", label: "Класи" },
] as const satisfies readonly TabOption<Tab>[];

/** Незмінний перелік імен: від нього залежить підписка на живі значення. */
const TOKEN_NAMES = CATALOG_TOKENS.map((token) => token.name);

const PREVIEWED = CLASS_NAMES.filter((name) => PREVIEWED_CLASSES.has(name)).length;

const STATS = [
  { value: CATALOG_FILES.length, label: "CSS-файлів" },
  { value: CATALOG_TOKENS.length, label: "токенів" },
  { value: CLASS_NAMES.length, label: "класів" },
  { value: BRICK_GROUPS.reduce((n, group) => n + group.items.length, 0), label: "кирпичиків" },
  { value: PREVIEWED, label: "класів із прев'ю" },
];

export function StylePage() {
  const [tab, setTab] = useState<Tab>("tokens");
  const [focused, setFocused] = useState(false);
  const { query, setQuery, tokens, locals, classes, bricks } = useFilter();
  const live = useLiveTokens(useMemo(() => TOKEN_NAMES, []));
  // Розкрите поле тримає або фокус, або вже набраний запит: згорнути пошук, у
  // якому щось написано, — це втратити його з очей.
  const searchOpen = focused || query.length > 0;

  return (
    <>
      <PageTopbar>
        <h1 className="wb-topbar-title">Стиль</h1>
        <div className="wb-topbar-right">
          <span className="st-stat-label st-source">джерело: packages/shared/src/styles</span>
        </div>
      </PageTopbar>

      <section className="st">
        <div className="st-summary">
          {STATS.map((stat) => (
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
          <div className={`wb-tools-search st-search${searchOpen ? " wb-tools-search--open" : ""}`}>
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

        {tab === "tokens" && <TokenList tokens={tokens} locals={locals} live={live} />}
        {tab === "bricks" && <BrickList groups={bricks} />}
        {tab === "classes" && <ClassList classes={classes} />}
      </section>
    </>
  );
}
