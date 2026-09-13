/**
 * Вкладка «Поділитись» — третій бік того самого рядка.
 *
 * Рядок `pages` — це сторінка вебу **і** її подання в боті. Тому в картці три
 * вкладки по суті: «сторінка» (блоки), «бот» (повідомлення) і «поділитись» —
 * ланцюжок, який їх зшиває:
 *
 * ```
 * поділитись → t.me/<bot>?start=<адреса> → бот показує повідомлення →
 * кнопка web_app у ньому веде на ту саму сторінку
 * ```
 *
 * **Чому тут видно попередження, а не сама лише адреса.** Обидва кінці ланцюжка
 * ламаються тихо: задовгий `?start=` Telegram обрізає без помилки, а порожнє
 * повідомлення бота дає перехід у нікуди. Тому вкладка каже про це словами —
 * замість того, щоб показати гарне посилання й промовчати.
 *
 * @module web-admin-dev/src/pages/scenarios/ShareTab
 */

import { useCallback, useState } from "react";
import { Icon } from "@wwwuabot/shared";
import { MAX_BOT_PAYLOAD, buildShareLinks, type ShareLinkReason } from "@wwwuabot/shared/content";
import { useBotUsername } from "../../shared/hooks/useBotUsername";

interface Props {
  /** Легасі-ключ рядка: у таблицях `scenarios*` адреса ще жила в `codeword`. */
  codeword: string;
  /** Усі поля рядка — потрібні, щоб побачити, чи є що показувати в боті. */
  fields: Record<string, unknown>;
}

/** Причина без посилання, сказана так, щоб було ясно, що робити. */
const REASON_TEXT: Record<Exclude<ShareLinkReason, "ok">, string> = {
  invalid_slug:
    "Адреса не може стати діплінком: у сегменті є «_» (це розділювач Telegram), слеш або великі літери. Перейменуйте рядок — «_» прибирається, дефіс усередині дозволений.",
  no_bot_username:
    "Ім'я бота невідоме. Перевірте токен на сторінці «Налаштування бота» — діплінк без нього скласти неможливо.",
  too_long: `Параметр діплінка довший за ${MAX_BOT_PAYLOAD} символів — Telegram обріже його мовчки. Скоротіть адресу.`,
};

const cardStyle = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: 12,
  marginBottom: 12,
  background: "var(--bg-1, transparent)",
} as const;

const codeStyle = {
  display: "block",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 12,
  lineHeight: 1.5,
  wordBreak: "break-all",
  marginTop: 6,
} as const;

const labelStyle = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  color: "var(--text-muted)",
} as const;

/** Які поля роблять повідомлення бота непорожнім. */
const BOT_MESSAGE_FIELDS = ["caption_top", "caption_mid", "caption_bot", "rich_message"];

export function ShareTab({ codeword, fields }: Props) {
  const botUsername = useBotUsername();
  const links = buildShareLinks({ slug: codeword, botUsername });
  const [copied, setCopied] = useState<string | null>(null);

  const copy = useCallback(async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Буфер обміну недоступний (не-HTTPS, заборона браузера) — мовчати не
      // можна: людина натиснула «Копіювати» і мусить знати, що не скопіювалось.
      setCopied(null);
    }
  }, []);

  const hasBotMessage = BOT_MESSAGE_FIELDS.some((field) => {
    const value = fields[field];
    return typeof value === "string" && value.trim() !== "";
  });

  const copyButton = (value: string, key: string) => (
    <button
      className="wb-btn wb-btn-secondary"
      style={{ fontSize: 12, padding: "4px 10px" }}
      onClick={() => void copy(value, key)}
      title="Копіювати"
    >
      <Icon name={copied === key ? "check" : "copy"} size={13} />{" "}
      {copied === key ? "Скопійовано" : "Копіювати"}
    </button>
  );

  return (
    <div style={{ padding: 16 }}>
      <p style={{ margin: "0 0 14px", lineHeight: 1.5 }}>
        Посилання веде <strong>у бота</strong>: він показує повідомлення цього рядка, а кнопка на
        повідомленні відкриває ту саму сторінку в платформі.
      </p>

      {links.deepLink ? (
        <div style={cardStyle}>
          <div style={labelStyle}>Діплінк бота</div>
          <code style={codeStyle}>{links.deepLink}</code>
          <div style={{ marginTop: 8 }}>{copyButton(links.deepLink, "deep")}</div>
        </div>
      ) : (
        <div style={{ ...cardStyle, borderColor: "var(--danger, #dc2626)" }}>
          <div style={labelStyle}>Діплінк бота — недоступний</div>
          <p style={{ margin: "6px 0 0", lineHeight: 1.5 }}>
            {links.reason === "ok" ? "" : REASON_TEXT[links.reason]}
          </p>
        </div>
      )}

      <div style={cardStyle}>
        <div style={labelStyle}>Адреса сторінки</div>
        <code style={codeStyle}>{links.webPath}</code>
        <div style={{ marginTop: 8 }}>{copyButton(links.webPath, "web")}</div>
      </div>

      {!hasBotMessage && (
        <div style={{ ...cardStyle, borderColor: "var(--accent, #d97706)" }}>
          <div style={labelStyle}>Бот не має що показати</div>
          <p style={{ margin: "6px 0 0", lineHeight: 1.5 }}>
            Підписи та кнопки порожні — за діплінком бот відповість порожнім повідомленням, і
            перейти на сторінку буде нічим. Заповніть вкладку «Бот».
          </p>
        </div>
      )}
    </div>
  );
}
