/**
 * `ThemeEditorModal` — редактор теми поверх меню вигляду.
 *
 * **Тема — це річ, до якої можна повернутись.** Три кольори й шрифт живуть у
 * чернетці панелі (її ж вони редагують), а назва й перемикач публічності
 * роблять із цього **тему**: збережену в бібліотеку й, за перемикачем, у
 * Просторі. Тому редактор — окремий крок, а не ще один пункт меню: він має
 * власні поля й власну кнопку, а не тільки вибір кольорів.
 *
 * **Поверхня — спільна** (`.wb-sheet`, як меню й композер): аркуш на один
 * екран, вихід у шапці, дії останнім рядком.
 *
 * @module web-platform-dev/src/pages/themes/ThemeEditorModal
 */

import { useState, type ReactElement } from "react";
import {
  COLOR_SLOTS,
  ColorSlotRow,
  FontSlotRow,
  Icon,
  SwitchRow,
  type ColorSlot,
  type UseFontChoiceResult,
  type UseUserColorsResult,
} from "@wwwuabot/shared";
import { THEME_NAME_MAX_LENGTH } from "@wwwuabot/shared/themes";
import type { ThemeScheme } from "@wwwuabot/shared/themes";
import { useDialog } from "@wwwuabot/ui/dialog";
import type { MyThemesLibrary } from "./theme-library";
import { useSchemeEditor } from "./useSchemeEditor";

export interface ThemeEditorModalProps {
  /** Тема, яку редагують; `null` — нова. */
  editing: ThemeScheme | null;
  colors: UseUserColorsResult;
  fonts: UseFontChoiceResult;
  library: MyThemesLibrary;
  onClose: () => void;
}

export function ThemeEditorModal({
  editing,
  colors,
  fonts,
  library,
  onClose,
}: ThemeEditorModalProps): ReactElement {
  const dialog = useDialog();
  const editor = useSchemeEditor(editing, colors, fonts, library);
  // Відкритий рівно один рядок — як у панелі: три повзунки й список шрифтів
  // на телефоні це екран, у якому нічого не видно.
  const [openSlot, setOpenSlot] = useState<ColorSlot | null>("bg");
  const [fontOpen, setFontOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggleSlot(slot: ColorSlot): void {
    setFontOpen(false);
    setOpenSlot(openSlot === slot ? null : slot);
  }

  function toggleFont(): void {
    setOpenSlot(null);
    setFontOpen(!fontOpen);
  }

  async function submit(): Promise<void> {
    try {
      if (await editor.save()) setSaved(true);
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося зберегти тему", {
        tone: "danger",
      });
    }
  }

  return (
    <div
      className="wb-modal-overlay wb-modal-overlay--tight"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="wb-modal wb-modal--full wb-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Тема"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="wb-modal-header wb-sheet-head">
          <h2 className="wb-modal-title">{editing ? "Правка теми" : "Налаштувати тему"}</h2>
          <button type="button" className="wb-close-btn" onClick={onClose} aria-label="Закрити">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="wb-modal-body wb-menu-body">
          <div className="wb-theme-rows">
            {COLOR_SLOTS.map((slot) => (
              <ColorSlotRow
                key={slot.id}
                slot={slot}
                value={colors.draft[slot.id] ?? ""}
                expanded={openSlot === slot.id}
                onToggle={() => toggleSlot(slot.id)}
                onChange={(value) => colors.setSlot(slot.id, value)}
              />
            ))}

            {/* Шрифт — такий самий рядок-акордеон, як кольори: це один крок
                «Налаштувати тему», а не два різні списки. */}
            <FontSlotRow
              value={fonts.draft}
              expanded={fontOpen}
              onToggle={toggleFont}
              onChange={fonts.setFont}
            />
          </div>

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

            {colors.warning && (
              <p className="wb-theme-hint wb-theme-hint--warn">{colors.warning}</p>
            )}

            {/* Стан видно рядком: «збережено» без нього читалось би як «не спрацювало» */}
            {saved && (
              <p className="wb-theme-status wb-theme-status--saved">
                <Icon name="check" size={16} />«{editor.name}» уже в моїх темах
              </p>
            )}
          </div>

          <div className="wb-sheet-actions wb-theme-actions">
            <button type="button" className="wb-btn wb-btn-secondary wb-btn-sm" onClick={onClose}>
              Закрити
            </button>
            <button
              type="button"
              className="wb-btn wb-btn-primary wb-btn-sm"
              onClick={() => void submit()}
              disabled={!colors.complete || editor.busy}
            >
              <Icon name="save" size={16} />
              {editing ? "Оновити тему" : "Зберегти тему"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
