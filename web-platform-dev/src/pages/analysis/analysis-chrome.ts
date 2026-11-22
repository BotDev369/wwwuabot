/**
 * Хлібні крихти розділу «Аналіз людей і подій»: екран дає лише свою назву,
 * а батьківські рівні додає ця функція за адресою (`/analysis/compare/systems`
 * — три рівні). Тож новий крок не забуває про старі.
 *
 * @module web-platform-dev/src/pages/analysis/analysis-chrome
 */

import { useScreenChrome } from "@wwwuabot/ui/nav";
import { ANALYSIS_PATH } from "@/app/routes";
import { ANALYSIS_LABEL } from "@/layout/platform-nav";

/** Назва розділу — та сама, що в меню: спільний перший рівень усіх його сторінок. */
export const ANALYSIS_TITLE = ANALYSIS_LABEL;

/**
 * Батьківські рівні для адреси. Поточну назву додає сам хедер із `title`, тому
 * тут її немає.
 */
export function analysisAncestors(pathname: string): readonly string[] {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === ANALYSIS_PATH || !path.startsWith(`${ANALYSIS_PATH}/`)) return [];
  if (path.startsWith(`${ANALYSIS_PATH}/tests/`)) {
    return [ANALYSIS_TITLE, "Пройти тестування"];
  }
  if (path.startsWith(`${ANALYSIS_PATH}/person/`) || path.startsWith(`${ANALYSIS_PATH}/event/`)) {
    return [ANALYSIS_TITLE, "Аналізувати за датою"];
  }
  if (path.startsWith(`${ANALYSIS_PATH}/compare/`)) {
    return [ANALYSIS_TITLE, "Співставити"];
  }
  return [ANALYSIS_TITLE];
}

/**
 * Оголошення хедера для сторінки аналізу.
 *
 * `hero` — великий `h1` у контенті: до прокрутки хедер показує лише бренд.
 * `enabled: false` — вкладений екран-вітрина, який не має перебивати хедер
 * батьківської сторінки.
 */
export function useAnalysisChrome(
  title: string | null,
  { hero = true, enabled = true }: { hero?: boolean; enabled?: boolean } = {},
): void {
  useScreenChrome(
    {
      title,
      titleMode: hero ? "hero" : "header",
      ancestors: analysisAncestors(window.location.pathname),
    },
    enabled,
  );
}
