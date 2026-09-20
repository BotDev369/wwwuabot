/**
 * Акаунт — сторінка, яку відкриває рядок хабу `/profile`.
 *
 * Тут живуть **дані** акаунта, і живуть вони окремо за двома розділами:
 * **Платформа** (ім'я, обране тут, і фото, яке людина поставить) та **Telegram**
 * (усе, що віддав Telegram, як є). Один суцільний список змішував їх, і людина
 * не могла зрозуміти, що з цього можна змінити, а що ні.
 *
 * **Розділи — вкладки на всю ширину, з підписами.** Сегмент у шапці тут не
 * підходить: там він ділить місце із заголовком і мусить читатись знаками, а ці
 * два розділи обирають **за словом** — «Платформа» й «Телеграм» не вгадуються
 * зі знака. Тому кирпичик інший (`.wb-tabs*`), хоч обидва й перемикачі.
 *
 * **Вигляд вкладки — кирпичик кнопки, і це не деталь.** Клас `.wb-tabs-btn`
 * дає саму розкладку (половинки рядка), а форму, висоту й заливку — `wb-btn`
 * із `wb-btn-primary` / `wb-btn-secondary`. Інакше власний `border-radius`
 * робив би вкладки прямокутними в обох брендів, тоді як решта кнопок продукту
 * овальна в Apple й заокруглена в Material.
 *
 * **Пояснень немає навмисно.** Підпис поля й значення вже кажуть усе потрібне;
 * абзац про те, що «саме його вживає система», був текстом для нас, а не для
 * людини. Єдине, що лишається сказати словами, — те, чого людина не бачить:
 * чому Telegram-дані незмінні й де буде своє фото.
 *
 * @module web-platform-dev/src/pages/ProfileAccountPage
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { useNavigate } from "react-router-dom";
import { PROFILE_PATH } from "@/app/routes";
import { ACCOUNT_TABS, DEFAULT_ACCOUNT_TAB, type AccountTab } from "./account-tabs";
import { AccountPlatformSection } from "./AccountPlatformSection";
import { AccountTelegramSection } from "./AccountTelegramSection";
import { useProfile } from "./useProfile";

/** Ідентифікатори вкладки й розділу — щоб `role="tabpanel"` знав свою вкладку. */
const tabId = (key: AccountTab): string => `account-tab-${key}`;
const panelId = (key: AccountTab): string => `account-panel-${key}`;

export function ProfileAccountPage(): ReactElement {
  const { profile, loading, error, saveUsername } = useProfile();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AccountTab>(DEFAULT_ACCOUNT_TAB);

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        {/* «Назад» — у рядку із заголовком, як у шапці поверхні: сторінка
            відкривається з хабу, і дотик вертає саме туди. Знак без підпису —
            місця в рядку небагато, а ім'я лишається в `aria-label`. */}
        <h1 className="wb-page-title">
          <button
            type="button"
            className="wb-close-btn"
            onClick={() => navigate(PROFILE_PATH)}
            aria-label="Назад"
          >
            <Icon name="arrow-left" size={18} />
          </button>
          Акаунт
        </h1>
      </div>

      {loading && (
        <div className="wb-empty">
          <div className="wb-skeleton" style={{ width: 160, height: 20 }} />
          <p className="wb-text-muted">Завантаження акаунта…</p>
        </div>
      )}

      {!loading && error && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="warning" size={32} />
          </span>
          <p className="wb-text-red">{error}</p>
        </div>
      )}

      {profile && !loading && !error && (
        <>
          {/* Розділи — двома рівними половинами рядка: обидва видно одразу, і
              планка пальця в кожного своя. Форму дає кнопка (кирпичик), тут
              лишається розкладка. */}
          <div className="wb-tabs" role="tablist" aria-label="Розділи акаунта">
            {ACCOUNT_TABS.map((option) => {
              const active = option.key === tab;
              return (
                <button
                  key={option.key}
                  id={tabId(option.key)}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={panelId(option.key)}
                  className={`wb-btn wb-tabs-btn ${active ? "wb-btn-primary" : "wb-btn-secondary"}`}
                  onClick={() => setTab(option.key)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {/* Розділ без власного класу: його малюють картки всередині, а
              обгортка лише каже, котра вкладка зараз відкрита. */}
          <div id={panelId(tab)} role="tabpanel" aria-labelledby={tabId(tab)}>
            {tab === "platform" ? (
              <AccountPlatformSection user={profile} onChangeUsername={saveUsername} />
            ) : (
              <AccountTelegramSection user={profile} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
