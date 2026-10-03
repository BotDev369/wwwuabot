/**
 * `ThemeMenu` — вибір вигляду: меню з хедера, а не сторінка.
 *
 * **Тема — це вибір, а не розділ.** Людина приходить за кольорами
 * і йде з того, що бачить; адреси, історії й «назад» тут не потрібно, тож
 * сторінки теми більше немає: меню відкривається палітрою в хедері, а
 * редактор теми (збережені теми, назва, публічність) — модалкою поверх нього.
 *
 * **Власна панель — спільна** (`ThemeColorPanel`), бо вигляд налаштовується
 * однаково в платформі й адмінці. Різниця одна: платформа має бібліотеки тем,
 * тому панель отримує вкладки, а кінець — кнопку редактора.
 *
 * **Усі бібліотеки читаються тут, по одному разу**: вкладки показують їх, а
 * «що обрано» — виділення картки. Вкладка, що читає бібліотеку сама, показала
 * б другий скелет у тому ж списку.
 *
 * @module web-platform-dev/src/pages/themes/ThemeMenu
 */

import { useCallback, useState, type ReactElement } from "react";
import { ThemeColorPanel, useFontChoice, useUserColors } from "@wwwuabot/shared";
import type { ThemeScheme } from "@wwwuabot/shared/themes";
import type { ApplicableScheme } from "@wwwuabot/shared/themes/apply";
import { themeSchemeColors } from "@wwwuabot/shared/themes";
import { MenuModal } from "@wwwuabot/ui/menu";
import { DEFAULT_COLOR_TAB, type ColorTab } from "./color-tabs";
import { ThemeColorTabs } from "./ThemeColorTabs";
import { ThemeEditorModal } from "./ThemeEditorModal";
import type { AppliedLook } from "./useAppliedScheme";
import type { MyThemesLibrary } from "./theme-library";
import { useMyThemes } from "./useMyThemes";
import { useSharedThemes } from "./useSharedThemes";

export interface ThemeMenuProps {
  /** Закрити меню: і «Відмінити», і «Застосувати» ведуть сюди. */
  onClose: () => void;
}

export function ThemeMenu({ onClose }: ThemeMenuProps): ReactElement {
  const colors = useUserColors();
  const fonts = useFontChoice();
  const mine: MyThemesLibrary = useMyThemes();
  const shared = useSharedThemes();
  const [tab, setTab] = useState<ColorTab>(DEFAULT_COLOR_TAB);
  const [editing, setEditing] = useState<ThemeScheme | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  // Поточний вибір — це вже застосована тема. Окремої напису «обрано: …» тут
  // немає: про обране каже виділення картки, дубль лише плутав би.
  const applied: AppliedLook = { colors: colors.current, font: fonts.current };

  /** Взяти схему собі: колори й шрифт стають поточними й одразу зберігаються. */
  const applyScheme = useCallback(
    (scheme: ApplicableScheme) => {
      colors.setColors(themeSchemeColors(scheme));
      fonts.setFont(scheme.font);
    },
    [colors, fonts],
  );

  const openEditor = useCallback((scheme: ThemeScheme | null) => {
    setEditing(scheme);
    setEditorOpen(true);
  }, []);

  const closeEditor = useCallback(() => setEditorOpen(false), []);

  return (
    <>
      <MenuModal
        title="Тема"
        onClose={onClose}
        content={
          <ThemeColorPanel
            colorsBody={
              <ThemeColorTabs
                value={tab}
                onChange={setTab}
                applied={applied}
                mine={mine}
                shared={shared}
                onApply={applyScheme}
                onEdit={openEditor}
              />
            }
            colorsExtra={
              <button
                type="button"
                className="wb-btn wb-btn-secondary"
                onClick={() => openEditor(null)}
              >
                Налаштувати власну
              </button>
            }
          />
        }
      />

      {editorOpen && (
        <ThemeEditorModal
          editing={editing}
          colors={colors}
          fonts={fonts}
          library={mine}
          onClose={closeEditor}
        />
      )}
    </>
  );
}
