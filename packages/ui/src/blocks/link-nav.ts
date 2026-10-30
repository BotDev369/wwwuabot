/**
 * Посилання блоку: роутер бере внутрішній шлях, браузер — решту.
 *
 * Блок не знає про роутер — ручку дає оболонка через `context.navigate`; без
 * неї (адмінка, перегляд) лишається звичайний `<a>`.
 *
 * @module packages/ui/src/blocks/link-nav
 */

/** Шлях у межах застосунку: рівно один провідний `/`. */
export function isAppPath(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//");
}

/**
 * Обробник кліку для посилання блоку; `undefined` — подію не чіпаємо.
 *
 * `preventDefault` лише там, де перехід справді робить роутер: інакше
 * «відкрити в новій вкладці» і середній клік перестали б працювати.
 */
export function appLinkHandler(
  url: string,
  navigate?: (href: string) => void,
): ((event: { preventDefault: () => void }) => void) | undefined {
  if (!navigate || !isAppPath(url)) return undefined;
  return (event) => {
    event.preventDefault();
    navigate(url);
  };
}
