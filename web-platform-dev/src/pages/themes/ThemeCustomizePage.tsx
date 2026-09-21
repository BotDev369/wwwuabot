/**
 * `/profile/theme/customize` — три кольори, шрифт і збереження схеми.
 *
 * **Тут людина творить.** Три кольори задають усю палітру, шрифт — типографіку,
 * а назва й перемикач публічності роблять із цього **схему**: річ, до якої
 * можна повернутись і якою можна поділитись. Це не модалка (правило 13): щоб
 * повернутись до схеми посиланням, у неї мусить бути адреса — і вона є.
 *
 * **Живий перегляд.** Кольори й шрифт лягають на екран одразу: людина має
 * бачити застосунок у своїх кольорах, а не квадратик у полі. «Зберегти схему»
 * — це вже запис: у пам'ять пристрою і в бібліотеку.
 *
 * **Публічність — окремий перемикач, а не режим форми.** Схема може жити в
 * себе скільки завгодно, і відкрити її — рішення, яке приймають окремо
 * (`AGENTS.md` §8, «Простір»).
 *
 * @module web-platform-dev/src/pages/themes/ThemeCustomizePage
 */

import { useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import {
  COLOR_SLOTS,
  ColorSlotRow,
  FontPicker,
  Icon,
  SwitchRow,
  type ColorSlot,
} from "@wwwuabot/shared";
import { THEME_NAME_MAX_LENGTH } from "@wwwuabot/shared/themes";
import { useDialog } from "@wwwuabot/ui/dialog";
import { themeSectionPath } from "./theme-sections";
import { useSchemeEditor } from "./useSchemeEditor";

export function ThemeCustomizePage(): ReactElement {
  const navigate = useNavigate();
  const dialog = useDialog();
  const editor = useSchemeEditor();
  // Відкритий рівно один слот — як у панелі: три повзунки на телефоні це екран,
  // у якому нічого не видно.
  const [openSlot, setOpenSlot] = useState<ColorSlot | null>("bg");
  const [saved, setSaved] = useState(false);

  const { colors, fonts } = editor;

  async function submit(): Promise<void> {
    try {
      const ok = await editor.save();
      if (ok) setSaved(true);
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося зберегти схему", {
        tone: "danger",
      });
    }
  }

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">
          {editor.editing ? `Правка: ${editor.editing.name}` : "Налаштувати"}
        </h1>
      </div>

      <p className="wb-text-muted">
        Три кольори задають усю палітру: фон, текст і акцент. Шрифт міняє текст усього застосунку.
      </p>

      <div className="wb-theme-rows">
        {COLOR_SLOTS.map((slot) => (
          <ColorSlotRow
            key={slot.id}
            slot={slot}
            value={colors.draft[slot.id] ?? ""}
            expanded={openSlot === slot.id}
            onToggle={() => setOpenSlot(openSlot === slot.id ? null : slot.id)}
            onChange={(value) => colors.setSlot(slot.id, value)}
          />
        ))}
      </div>

      <h2 className="wb-theme-form-title">Шрифт</h2>
      <FontPicker value={fonts.draft} onChange={fonts.setFont} />

      <div className="wb-theme-form">
        <div className="wb-field">
          <label className="wb-label" htmlFor="wb-theme-name">
            Назва схеми
          </label>
          <input
            id="wb-theme-name"
            className="wb-input"
            value={editor.name}
            maxLength={THEME_NAME_MAX_LENGTH}
            placeholder="Наприклад: Ніч у Львові"
            onChange={(event) => editor.setName(event.target.value)}
          />
        </div>

        <SwitchRow
          label="Доступна публічно"
          hint="Схему побачать інші в Просторі й зможуть узяти собі"
          checked={editor.isPublic}
          onToggle={editor.setIsPublic}
        />

        {colors.warning && <p className="wb-theme-hint wb-theme-hint--warn">{colors.warning}</p>}

        <div className="wb-sheet-actions wb-theme-actions">
          <button
            type="button"
            className="wb-btn wb-btn-secondary wb-btn-sm"
            onClick={() => navigate(themeSectionPath("mine"))}
          >
            <Icon name="star" size={16} />
            До моїх схем
          </button>
          <button
            type="button"
            className="wb-btn wb-btn-primary wb-btn-sm"
            onClick={() => void submit()}
            disabled={!colors.complete || editor.busy}
          >
            <Icon name="save" size={16} />
            {editor.editing ? "Оновити схему" : "Зберегти схему"}
          </button>
        </div>

        {/* Стан видно рядком: «збережено» без нього читалось би як «не спрацювало» */}
        {saved && (
          <p className="wb-theme-status wb-theme-status--saved">
            <Icon name="check" size={16} />«{editor.name}» уже в моїх схемах
          </p>
        )}

        <p className="wb-text-muted">
          Вибір діє на цьому пристрої одразу — зберігати його для цього не потрібно.
        </p>
      </div>
    </div>
  );
}
