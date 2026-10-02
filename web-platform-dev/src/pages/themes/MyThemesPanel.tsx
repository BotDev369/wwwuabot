/**
 * «Мої кольори» — вкладка пункту «Кольори теми»: власна бібліотека.
 *
 * **Це бібліотека, а не поточний вибір.** Поточне живе в чернетці панелі;
 * тут — те, до чого людина вертається: «Ніч у Львові», «Робоча», «М'яка».
 * Саме тому тему можна змінити й прибрати, і саме тому їх може бути багато.
 *
 * **Прибирання питає.** Тема — написане людиною, і зникає назавжди: діалог тут
 * не формальність, а єдиний спосіб відрізнити дотик від рішення.
 *
 * @module web-platform-dev/src/pages/themes/MyThemesPanel
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { ThemeScheme } from "@wwwuabot/shared/themes";
import type { ApplicableScheme } from "@wwwuabot/shared/themes/apply";
import { useDialog } from "@wwwuabot/ui/dialog";
import { SchemeList } from "./SchemeList";
import type { AppliedLook } from "./useAppliedScheme";
import type { MyThemesLibrary } from "./theme-library";

export interface MyThemesPanelProps {
  list: MyThemesLibrary;
  applied: AppliedLook;
  onApply: (scheme: ApplicableScheme) => void;
  onEdit: (scheme: ThemeScheme | null) => void;
  onCreate: () => void;
}

export function MyThemesPanel({
  list,
  applied,
  onApply,
  onEdit,
  onCreate,
}: MyThemesPanelProps): ReactElement {
  const dialog = useDialog();

  async function remove(theme: ThemeScheme): Promise<void> {
    const confirmed = await dialog.confirm(`Прибрати тему «${theme.name}»?`, {
      tone: "danger",
      confirmText: "Прибрати",
    });
    if (!confirmed) return;

    try {
      await list.remove(theme.id);
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося прибрати тему", {
        tone: "danger",
      });
    }
  }

  return (
    <SchemeList
      items={list.items}
      loading={list.loading}
      error={list.error}
      onRetry={() => list.reload(true)}
      applied={applied}
      onApply={onApply}
      mine
      onEdit={onEdit}
      onRemove={(theme) => void remove(theme)}
      empty={{
        icon: "star",
        title: "Тем поки немає.",
        hint: "Складіть свої три кольори й шрифт — і збережіть їх як тему.",
        action: (
          <button className="wb-btn wb-btn-primary" onClick={onCreate}>
            <Icon name="edit" size={16} />
            Створити тему
          </button>
        ),
      }}
    />
  );
}
