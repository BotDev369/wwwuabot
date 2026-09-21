/**
 * Схема теми — рядок таблиці `theme_schemes`.
 *
 * **Що це.** Іменований набір налаштувань вигляду: три кольори (фон, основний,
 * акцент), шрифт — і публічність. «Схема» ≠ «поточний вибір»: поточний вибір
 * живе в пам'яті пристрою (`localStorage`), а схема — це **бібліотека**, до
 * якої людина вертається (`AGENTS.md` §8).
 *
 * **Чому на сервері, а не тільки на пристрої.** Схему видно з будь-якого
 * пристрою, і її можна зробити публічною — а публічне мусить жити там, де його
 * бачать інші. Локальний список дав би другу правду: «мої схеми» на телефоні й
 * на ноутбуці були б різні.
 *
 * **Чого тут немає: бренду.** Стиль (Apple / Material) у схему не входить —
 * це характер продукту, а не вибір людини. Схема включає те, що людина
 * створює сама, і нічого понад це (колонки на майбутнє — теж сюди).
 *
 * @module @wwwuabot/shared/themes
 */

/** Схема як вона лежить у базі й їде в клієнт. */
export interface ThemeScheme {
  id: number;
  /** Telegram-id того, хто створив: ідентичність із **підписаного** `initData`. */
  ownerId: number;
  name: string;
  /** Тло екрана. */
  bg: string;
  /** Основний колір: текст, межі, поверхні. */
  text: string;
  /** Акцент: кнопки, посилання, вибране. */
  accent: string;
  /** Ідентифікатор шрифту (`styles/fonts.ts`); порожньо — «як у стилі». */
  font: string;
  /** `true` — схема доступна всім у Просторі, і її можна взяти собі. */
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Те, що надсилає форма: без `id` — нова, з `id` — правка своєї. */
export interface ThemeSchemeInput {
  id?: number;
  name: string;
  bg: string;
  text: string;
  accent: string;
  font: string;
  isPublic: boolean;
}

/** Відповідь `GET /api/user/themes` і `GET /api/space/themes`. */
export interface ThemeListResponse {
  ok: boolean;
  themes: ThemeScheme[];
}

/** Відповідь `POST /api/user/themes`: збережена схема. */
export interface ThemeSaveResponse {
  ok: boolean;
  theme: ThemeScheme | null;
  error?: string;
}

/** Відповідь `DELETE /api/user/themes`. */
export interface ThemeDeleteResponse {
  ok: boolean;
  id?: number;
  error?: string;
}
