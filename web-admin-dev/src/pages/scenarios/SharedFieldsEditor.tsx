/**
 * Конструктор вкладки «Спільне»: адреса рядка і його заголовок.
 *
 * **Чому адресу редагують саме тут.** Раніше адреса була ідентичністю: щоб її
 * змінити, рядок доводилося перестворювати. Тепер ідентичність — номер (`id`),
 * а адреса стала звичайним полем. Це видно в інтерфейсі: у заголовку картки
 * стоїть номер, а адреса редагується як поле.
 *
 * Обидва подання показуються одразу: `?start=` Telegram обрізає **мовчки**, і
 * про це треба дізнатись у редакторі, а не від користувача, який перейшов у
 * нікуди.
 *
 * @module web-admin-dev/src/pages/scenarios/SharedFieldsEditor
 */

import { Icon } from "@wwwuabot/shared";
import {
  MAX_BOT_PAYLOAD,
  isDeepLinkable,
  isValidSlug,
  normalizeSlug,
  toBotPayload,
  toWebPath,
} from "@wwwuabot/shared/content";

interface Props {
  fields: Record<string, unknown>;
  updateField: (key: string, value: unknown) => void;
}

const labelStyle = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  color: "var(--text-muted)",
} as const;

const hintStyle = {
  margin: "4px 0 0",
  fontSize: 12,
  lineHeight: 1.5,
  color: "var(--text-muted)",
} as const;

export function SharedFieldsEditor({ fields, updateField }: Props) {
  const address = typeof fields.slug === "string" ? fields.slug : "";
  const normalized = normalizeSlug(address);
  const valid = isValidSlug(normalized);
  const deepLinkable = isDeepLinkable(normalized);

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelStyle}>Адреса (slug)</span>
        <input
          className="wb-input"
          value={address}
          placeholder="mydate або galyashop/cart (порожньо — головна)"
          onChange={(e) => updateField("slug", e.target.value)}
        />
        {!valid ? (
          <p style={{ ...hintStyle, color: "var(--danger, #dc2626)" }}>
            <Icon name="warning" size={13} /> Сегменти — лише малі латинські літери, цифри й дефіс;
            «_» заборонений, бо це розділювач діплінка. Порожнє поле — головна сторінка.
          </p>
        ) : (
          <p style={hintStyle}>
            Веб: <code>{toWebPath(normalized)}</code> · бот:{" "}
            <code>{toBotPayload(normalized) || "«/start» без параметра"}</code>
          </p>
        )}
        {valid && !deepLinkable && (
          <p style={{ ...hintStyle, color: "var(--accent, #d97706)" }}>
            <Icon name="warning" size={13} /> Параметр довший за {MAX_BOT_PAYLOAD} символів —
            Telegram обріже його мовчки. Скоротіть адресу.
          </p>
        )}
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelStyle}>Заголовок</span>
        <input
          className="wb-input"
          value={typeof fields.title === "string" ? fields.title : ""}
          placeholder="Заголовок сторінки"
          onChange={(e) => updateField("title", e.target.value)}
        />
        <p style={hintStyle}>
          Заголовок бачать блоки сторінки (`context.title`); у боті він не показується.
        </p>
      </label>

      <p style={hintStyle}>
        Номер рядка: <strong>{String(fields.id ?? "—")}</strong>. Адресу можна міняти — номер
        лишається тим самим, і посилання з попередньою адресою перестане працювати.
      </p>
    </div>
  );
}
