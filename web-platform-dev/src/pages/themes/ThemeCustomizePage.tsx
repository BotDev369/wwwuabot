/**
 * `/profile/theme/customize` — три кольори, шрифт і збереження теми.
 *
 * **Тут людина творить.** Три кольори задають усю палітру, шрифт — типографіку,
 * а назва й перемикач публічності роблять із цього **тему**: річ, до якої
 * можна повернутись і якою можна поділитись. Це не модалка (правило 13): щоб
 * повернутись до теми посиланням, у неї мусить бути адреса — і вона є.
 *
 * **Живий перегляд.** Кольори й шрифт лягають на екран одразу: людина має
 * бачити застосунок у своїх кольорах, а не квадратик у полі. «Зберегти тему» —
 * це вже запис: у пам'ять пристрою і в бібліотеку. Саме тому тут немає абзацу
 * про те, що вибір діє негайно — це видно на екрані.
 *
 * **Публічність — окремий перемикач, а не режим форми.** Тема може жити в
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
import { presetTabPath } from "./presets-tabs";
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
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося зберегти тему", {
        tone: "danger",
      });
    }
  }

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">
          {editor.editing ? `Правка: ${editor.editing.name}` : "Налаштувати тему"}
        </h1>
      </div>

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
            Назва теми
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
          hint="Тему побачать інші в Просторі й зможуть узяти собі"
          checked={editor.isPublic}
          onToggle={editor.setIsPublic}
        />

        {colors.warning && <p className="wb-theme-hint wb-theme-hint--warn">{colors.warning}</p>}

        <div className="wb-sheet-actions wb-theme-actions">
          <button
            type="button"
            className="wb-btn wb-btn-secondary wb-btn-sm"
            onClick={() => navigate(presetTabPath("mine"))}
          >
            <Icon name="star" size={16} />
            До готових тем
          </button>
          <button
            type="button"
            className="wb-btn wb-btn-primary wb-btn-sm"
            onClick={() => void submit()}
            disabled={!colors.complete || editor.busy}
          >
            <Icon name="save" size={16} />
            {editor.editing ? "Оновити тему" : "Зберегти тему"}
          </button>
        </div>

        {/* Стан видно рядком: «збережено» без нього читалось би як «не спрацювало» */}
        {saved && (
          <p className="wb-theme-status wb-theme-status--saved">
            <Icon name="check" size={16} />«{editor.name}» уже в моїх темах
          </p>
        )}
      </div>
    </div>
  );
}
