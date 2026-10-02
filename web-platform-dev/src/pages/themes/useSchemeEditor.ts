/**
 * `useSchemeEditor` — стан редактора теми: назва, публічність і збереження.
 *
 * **Правка теми — це та сама форма.** Коли редактор відкривають на темі, її
 * поля заповнюються **один раз** (інакше перечитування затирало б те, що
 * людина щойно міняє), а збереження надсилає її номер — тобто оновлює, а не
 * створює другу з тією ж назвою.
 *
 * **Кольори й шрифт — не свої, а спільні з меню.** Вони живуть у чернетці
 * панелі вигляду (`useUserColors` / `useFontChoice`), і редактор працює з
 * тією ж чернеткою: другий примірник цих хуків у модалці поверх меню
 * застосував би свої кольори й скасовував би вибір панелі на виході.
 *
 * **Живий перегляд лишається живим.** Кольори й шрифт лягають на екран одразу,
 * а «Зберегти тему» — це два записи: у пам'ять пристрою (щоб вибір пережив
 * перезавантаження) і на сервер (щоб тема була в бібліотеці).
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
  setName: (name: string) => void;
  isPublic: boolean;
  setIsPublic: (value: boolean) => void;
  busy: boolean;
  save: () => Promise<boolean>;
}

export function useSchemeEditor(
  editing: ThemeScheme | null,
  colors: UseUserColorsResult,
  fonts: UseFontChoiceResult,
  library: MyThemesLibrary,
): SchemeEditor {
  const [name, setName] = useState(editing ? editing.name : "Моя тема");
  const [isPublic, setIsPublic] = useState(editing?.isPublic ?? false);
  const [busy, setBusy] = useState(false);

  // Заповнюємо редактор **один раз** на тему: далі полями керує людина.
  const loaded = useRef(0);
  useEffect(() => {
    const id = editing?.id ?? 0;
    if (!editing || loaded.current === id) return;
    loaded.current = id;
    setName(editing.name);
    setIsPublic(editing.isPublic);
    colors.setColors({ bg: editing.bg, text: editing.text, accent: editing.accent });
    fonts.setFont(editing.font);
  }, [editing, colors, fonts]);

  /** Зберегти: той самий вибір іде і в пам'ять пристрою, і в бібліотеку. */
  const save = useCallback(async (): Promise<boolean> => {
    const draft = colors.draft;
    // Порожніх кольорів не буває: без них тема не має сенсу (як і на сервері).
    if (busy || !isCompleteColors(draft)) return false;
    setBusy(true);
    try {
      colors.save();
      fonts.save();
      await library.save({
        ...(editing ? { id: editing.id } : {}),
        name,
        bg: draft.bg,
        text: draft.text,
        accent: draft.accent,
        font: fonts.draft,
        isPublic,
      });
      return true;
    } finally {
      setBusy(false);
    }
  }, [busy, colors, editing, fonts, isPublic, library, name]);

  return { name, setName, isPublic, setIsPublic, busy, save };
}
