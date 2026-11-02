/**
 * Сторінка «Стиль»: одна демосторінка візуалу.
 *
 * Замість переліку токенів і класів — продукт цілком: шапка, числа, графіки,
 * картки, поля, статуси й навігація. Перемикач тем стоїть тут же, тож зміну
 * вигляду видно одразу, а відбиток CSS каже, чи є що дивитись.
 * @module web-admin-dev/src/pages/style/StylePage
 */

import { useState } from "react";
import { applyTheme, readStoredTheme, THEMES } from "@wwwuabot/shared";
import { Tabs, type TabOption } from "@wwwuabot/ui/tabs";
import { PageTopbar } from "../../layout/PageTopbar";
import { DemoArticle } from "./DemoArticle";
import { DemoUi } from "./DemoUi";
import { useStyleVersion } from "./useStyleVersion";

type ThemeId = (typeof THEMES)[number]["id"];

const THEME_OPTIONS: readonly TabOption<ThemeId>[] = THEMES.map((theme) => ({
  key: theme.id,
  label: theme.label,
}));

export function StylePage() {
  const [theme, setTheme] = useState<ThemeId>(() => readStoredTheme());
  const version = useStyleVersion();

  const pickTheme = (next: ThemeId): void => {
    applyTheme(next);
    setTheme(next);
  };

  const versionLabel =
    version.status === "ready" ? version.version : version.status === "error" ? "—" : "…";

  return (
    <>
      <PageTopbar>
        <h1 className="wb-topbar-title">Візуал</h1>
        <div className="wb-topbar-right">
          <span className="st-version" title="Відбиток CSS — змінюється разом із виглядом">
            <span className="st-version-key">вигляд</span>
            {versionLabel}
          </span>
        </div>
      </PageTopbar>

      <section className="st">
        <div className="st-bar">
          {/* Перемикач — спільна смуга вкладок: продукт має один контрол вибору,
              і демосторінка не заводить другого. */}
          <Tabs options={THEME_OPTIONS} value={theme} onChange={pickTheme} label="Тема вигляду" />
          <span className="st-note">
            {version.seenAt
              ? `оновлень не було з ${version.seenAt}`
              : "версію ще не позначено як переглянуту"}
          </span>
          <button
            type="button"
            className="wb-btn wb-btn-ghost wb-btn-sm"
            onClick={version.markSeen}
            disabled={!version.version}
          >
            Позначити переглянутим
          </button>
        </div>

        {version.updated && (
          <div className="st-banner" role="status">
            <span className="st-banner-title">Вигляд оновився</span>
            <p className="st-banner-text">
              Було {version.previous}, стало {version.version}. Нижче — продукт у поточній темі.
            </p>
            <button
              type="button"
              className="wb-btn wb-btn-primary wb-btn-sm"
              onClick={version.markSeen}
            >
              Бачу
            </button>
          </div>
        )}

        <div className="st-demo">
          <DemoArticle />
          <DemoUi />
        </div>

        <p className="st-footnote">
          {version.status === "error" &&
            "Каталог вигляду не завантажився — версії не видно, решта сторінки працює. "}
          {version.seenAt
            ? `Востаннє позначено: ${version.seenAt}.`
            : "Позначте версію переглянутою, щоб наступного разу побачити лише справжні зміни."}
        </p>
      </section>
    </>
  );
}
