/**
 * `/profile/theme/mine` — власна бібліотека схем.
 *
 * **Це бібліотека, а не поточний вибір.** Поточне живе в пам'яті пристрою;
 * тут — те, до чого людина вертається: «Ніч у Львові», «Робоча», «М'яка».
 * Саме тому схему можна змінити й прибрати, і саме тому їх може бути багато.
 *
 * **Видалення питає.** Схема — написане людиною, і зникає назавжди; діалог тут
 * не формальність, а єдиний спосіб відрізнити дотик від рішення.
 *
 * @module web-platform-dev/src/pages/themes/ThemeMinePage
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

export function ThemeMinePage(): ReactElement {
  const themes = useMyThemes();
  const { applied, apply } = useAppliedScheme();
  const dialog = useDialog();
  const navigate = useNavigate();

  async function remove(scheme: ThemeScheme): Promise<void> {
    const confirmed = await dialog.confirm(`Прибрати схему «${scheme.name}»?`, {
      tone: "danger",
      confirmText: "Прибрати",
    });
    if (!confirmed) return;

    try {
      await themes.remove(scheme.id);
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося прибрати схему", {
        tone: "danger",
      });
    }
  }

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">Мої схеми</h1>
      </div>

      <p className="wb-text-muted">
        Схеми, які ви створили. Візьміть будь-яку собі — і екран одразу стане таким.
      </p>

      <SchemeList
        items={themes.items}
        loading={themes.loading}
        error={themes.error}
        onRetry={() => themes.reload(true)}
        applied={applied}
        onApply={apply}
        mine
        onEdit={(scheme) => navigate(`${themeSectionPath("customize")}?id=${scheme.id}`)}
        onRemove={(scheme) => void remove(scheme)}
        empty={{
          icon: "star",
          title: "Схем поки немає.",
          hint: "Складіть свої три кольори й шрифт у розділі «Налаштувати» — і збережіть як схему.",
          action: (
            <button
              className="wb-btn wb-btn-primary"
              onClick={() => navigate(themeSectionPath("customize"))}
            >
              <Icon name="edit" size={16} />
              Створити схему
            </button>
          ),
        }}
      />
    </div>
  );
}
