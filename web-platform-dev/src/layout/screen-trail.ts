/**
 * Хлібний шлях з реєстру: ланцюжок стоїть у `parent_key`, екран передає лише адресу.
 *
 * @module web-platform-dev/src/layout/screen-trail
 */

import { matchScreen, screenChain, screenHref, type ScreenRow } from "@wwwuabot/shared/screens";

/** Рівень шляху: підпис і адреса; `href: null` — рівень без посилання. */
export interface Crumb {
  label: string;
  href: string | null;
}

/**
 * Ланцюжок для адреси: розділ → підрозділ → поточна сторінка.
 *
 * `title` — назва з даних (трекер, товар, тест): вона замінює статичну назву
 * **останнього** рівня, бо саме її людина бачить на екрані. Батьківські рівні
 * завжди беруться з реєстру.
 */
export function screenTrail(
  rows: readonly ScreenRow[],
  pathname: string,
  title: string | null,
): Crumb[] {
  const match = matchScreen(pathname);
  if (!match) return title ? [{ label: title, href: null }] : [];

  const byKey = new Map(rows.map((row) => [row.key, row]));
  const chain = screenChain(match.screen.key);
  if (chain.length === 0) return title ? [{ label: title, href: null }] : [];

  return chain.map((screen, index) => {
    const current = index === chain.length - 1;
    const row = byKey.get(screen.key);
    return {
      label: current && title ? title : (row?.title ?? screen.title),
      href: current ? null : screenHref(screen, match.params),
    };
  });
}
