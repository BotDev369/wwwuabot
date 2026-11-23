/**
 * Оголошення хедера для екранів аналізу.
 *
 * Батьківські рівні більше не живуть тут: хлібний шлях будує каркас із
 * `parent_key` реєстру (`layout/screen-trail.ts`), тож крок не може забути про
 * старі, а назва розділу не дублюється в коді.
 *
 * @module web-platform-dev/src/pages/analysis/analysis-chrome
 */

import { useScreenChrome } from "@wwwuabot/ui/nav";

/**
 * Назва розділу — та сама, що в реєстрі; поки що в коді, бо переїзд слів —
 * 7.2. Хедер усе одно бере її з реєстру, коли екран не передав своєї.
 */
export const ANALYSIS_TITLE = "Аналіз людей і подій";

/**
 * Оголошення хедера для сторінки аналізу.
 *
 * `enabled: false` — вкладений екран-вітрина, який не має перебивати хедер
 * батьківської сторінки.
 */
export function useAnalysisChrome(
  title: string | null,
  { enabled = true }: { enabled?: boolean } = {},
): void {
  useScreenChrome({ title }, enabled);
}
