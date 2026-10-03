/**
 * `useSchemeEditor` — стан редактора теми: назва, публічність і збереження.
 *
 * **Правка теми — це та сама форма.** Коли редактор відкривають на темі, її
 * поля заповнюються **один раз** (інакше перечитування затирало б те, що
 * людина щойно міняє), а збереження надсилає її номер — тобто оновлює, а не
 * створює другу з тією ж назвою.
 *
 * **Кольори й шрифт — не свої, а спільні з меню.** Вони живуть у тих самих
 * хуках, що й панель вигляду (`useUserColors` / `useFontChoice`), і редактор
 * працює з ними ж: другий примірник цих хуків у модалці поверх меню тримав би
 * другий «поточний» вибір.
 *
 * **«Зберегти тему» — це запис на сервер.** Правити колір у редакторі вже
 * означає застосувати його на екрані й у пам'яті пристрою (хук робить це сам),
 * тож кнопка лишається лише для бібліотеки: тема мусить у неї потрапити.
 *
 * @module web-platform-dev/src/pages/themes/useSchemeEditor
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  isCompleteColors,
  type UseFontChoiceResult,
  type UseUserColorsResult,
} from "@wwwuabot/shared";
import type { ThemeScheme } from "@wwwuabot/shared/themes";
import type { MyThemesLibrary } from "./theme-library";

export interface SchemeEditor {
  name: string;
  setName: (value: string) => void;
  isPublic: boolean;
  setIsPublic: (value: boolean) => void;
  busy: boolean;
  save: () => Promise<boolean>;
}

export function useSchemeEditor(
  editing: ThemeScheme | null,
  colorsArg: UseUserColorsResult,
  fontsArg: UseFontChoiceResult,
  library: MyThemesLibrary,
): SchemeEditor {
  const [name, setName] = useState(editing ? editing.name : "Моя тема");
  const [isPublic, setIsPublic] = useState(editing?.isPublic ?? false);
  const [busy, setBusy] = useState(false);

  // Хуки повертають свіжий об'єкт на кожен рендер, тож у залежностях має бути
  // саме значення, а не `colors.current`: інакше `useCallback` тримав би застаріле.
  const { current: colors, setColors } = colorsArg;
  const { current: font, setFont } = fontsArg;

  // Заповнюємо редактор **один раз** на тему: далі полями керує людина.
  const loaded = useRef(0);
  useEffect(() => {
    const id = editing?.id ?? 0;
    if (!editing || loaded.current === id) return;
    loaded.current = id;
    setName(editing.name);
    setIsPublic(editing.isPublic);
    setColors({ bg: editing.bg, text: editing.text, accent: editing.accent });
    setFont(editing.font);
  }, [editing, setColors, setFont]);

  /** Зберегти в бібліотеку: на екрані й у пам'яті цей вибір уже. */
  const save = useCallback(async (): Promise<boolean> => {
    // Порожніх кольорів не буває: без них тема не має сенсу (як і на сервері).
    if (busy || !isCompleteColors(colors)) return false;
    setBusy(true);
    try {
      await library.save({
        ...(editing ? { id: editing.id } : {}),
        name,
        bg: colors.bg,
        text: colors.text,
        accent: colors.accent,
        font,
        isPublic,
      });
      return true;
    } finally {
      setBusy(false);
    }
  }, [busy, colors, editing, font, isPublic, library, name]);

  return { name, setName, isPublic, setIsPublic, busy, save };
}
