/**
 * `ThemeLibrary` — список тем одним іменем.
 *
 * Меню теми читає **обидві** бібліотеки по одному разу: вкладка показує
 * список, а другий рядок пункту — назву теми, яка діє. Тому тип один, а не
 * два схожі по імені «властивість хука»: два імені означали б два списки на
 * одному екрані.
 *
 * @module web-platform-dev/src/pages/themes/theme-library
 */

import type { ThemeScheme, ThemeSchemeInput } from "@wwwuabot/shared/themes";

export interface ThemeLibrary {
  items: ThemeScheme[];
  loading: boolean;
  error: string | null;
  /** Перечитати список; `true` — зі скелетом (повтор після помилки). */
  reload: (showSpinner?: boolean) => void;
}

/** Власні теми: список плюс дії над ним — запис і прибирання. */
export type MyThemesLibrary = ThemeLibrary & {
  save: (input: ThemeSchemeInput) => Promise<void>;
  remove: (id: number) => Promise<void>;
};
