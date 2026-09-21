/**
 * «Мої» — вкладка готових тем: власна бібліотека.
 *
 * **Це бібліотека, а не поточний вибір.** Поточне живе в пам'яті пристрою;
 * тут — те, до чого людина вертається: «Ніч у Львові», «Робоча», «М'яка».
 * Саме тому тему можна змінити й прибрати, і саме тому їх може бути багато.
 *
 * **Прибирання питає.** Тема — написане людиною, і зникає назавжди; діалог тут
 * не формальність, а єдиний спосіб відрізнити дотик від рішення.
 *
 * @module web-platform-dev/src/pages/themes/MyThemesPanel
 */

import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import type { ThemeScheme } from "@wwwuabot/shared/themes";
import { useDialog } from "@wwwuabot/ui/dialog";
import { SchemeList } from "./SchemeList";
import { themeSectionPath } from "./theme-sections";
import { useAppliedScheme } from "./useAppliedScheme";
import { useMyThemes } from "./useMyThemes";

export function MyThemesPanel(): ReactElement {
  const themes = useMyThemes();
  const { applied, apply } = useAppliedScheme();
  const dialog = useDialog();
  const navigate = useNavigate();

  async function remove(theme: ThemeScheme): Promise<void> {
    const confirmed = await dialog.confirm(`Прибрати тему «${theme.name}»?`, {
      tone: "danger",
      confirmText: "Прибрати",
    });
    if (!confirmed) return;

    try {
      await themes.remove(theme.id);
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося прибрати тему", {
        tone: "danger",
      });
    }
  }

  return (
    <SchemeList
      items={themes.items}
      loading={themes.loading}
      error={themes.error}
      onRetry={() => themes.reload(true)}
      applied={applied}
      onApply={apply}
      mine
      onEdit={(theme) => navigate(`${themeSectionPath("customize")}?id=${theme.id}`)}
      onRemove={(theme) => void remove(theme)}
      empty={{
        icon: "star",
        title: "Тем поки немає.",
        hint: "Складіть свої три кольори й шрифт у розділі «Налаштувати тему» — і збережіть як тему.",
        action: (
          <button
            className="wb-btn wb-btn-primary"
            onClick={() => navigate(themeSectionPath("customize"))}
          >
            <Icon name="edit" size={16} />
            Створити тему
          </button>
        ),
      }}
    />
  );
}
