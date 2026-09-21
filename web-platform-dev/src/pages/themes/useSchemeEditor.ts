/**
 * `useSchemeEditor` — стан сторінки «Налаштувати тему»: три кольори, шрифт,
 * назва й публічність.
 *
 * **Правка теми — це та сама форма.** Коли адреса несе `?id=`, редактор
 * заповнюється з теми **один раз** (інакше перечитування затирало б те, що
 * людина щойно міняє), а збереження надсилає її номер — тобто оновлює, а не
 * створює другу з тією ж назвою.
 *
 * **Живий перегляд лишається живим.** Кольори й шрифт застосовуються на екран
 * одразу (це роблять `useUserColors` і `useFontChoice`), а «Зберегти тему» —
 * це два записи: у пам'ять пристрою (щоб вибір пережив перезавантаження) і на
 * сервер (щоб тема була в бібліотеці).
 *
 * @module web-platform-dev/src/pages/themes/useSchemeEditor
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { isCompleteColors, useFontChoice, useUserColors } from "@wwwuabot/shared";
import type { ThemeScheme } from "@wwwuabot/shared/themes";
import { useMyThemes } from "./useMyThemes";

export function useSchemeEditor() {
  const [searchParams] = useSearchParams();
  const themes = useMyThemes();
  const colors = useUserColors();
  const fonts = useFontChoice();

  const [name, setName] = useState("Моя тема");
  const [isPublic, setIsPublic] = useState(false);
  const [busy, setBusy] = useState(false);

  const editId = Number(searchParams.get("id")) || 0;
  const editing: ThemeScheme | null = editId
    ? (themes.items.find((scheme) => scheme.id === editId) ?? null)
    : null;

  // Заповнюємо редактор **один раз** на тему: далі полями керує людина.
  const loaded = useRef(0);
  useEffect(() => {
    if (!editing || loaded.current === editing.id) return;
    loaded.current = editing.id;
    setName(editing.name);
    setIsPublic(editing.isPublic);
    colors.setSlot("bg", editing.bg);
    colors.setSlot("text", editing.text);
    colors.setSlot("accent", editing.accent);
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
      await themes.save({
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
  }, [busy, colors, editing, fonts, isPublic, name, themes]);

  return {
    themes: { loading: themes.loading, error: themes.error, reload: themes.reload },
    colors,
    fonts,
    name,
    setName,
    isPublic,
    setIsPublic,
    editing,
    busy,
    save,
  };
}
