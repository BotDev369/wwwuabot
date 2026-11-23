/**
 * Хлібний шлях з реєстру: ланцюжок стоїть у `parent_key`, екран передає лише адресу.
 *
 * @module web-platform-dev/src/layout/screen-trail
 */

import {
  matchScreen,
  screenByKey,
  screenChain,
  screenHref,
  screenLabel,
  type ScreenRow,
} from "@wwwuabot/shared/screens";

/** Рівень шляху: підпис і адреса; `href: null` — рівень без посилання. */
export interface Crumb {
  label: string;
  href: string | null;
}

/**
 * Ланцюжок для адреси: розділ → підрозділ → поточна сторінка. `title` з даних
 * замінює статичну назву останнього рівня; батьки — завжди з реєстру.
 *
 * Порожнього шляху не буває: `/` — рядок реєстру `entry`, а сторінка контенту
 * без рядка отримує рівень «Сторінки» з журналу ще до завантаження сценарію.
 */
export function screenTrail(
  rows: readonly ScreenRow[],
  pathname: string,
  title: string | null,
): Crumb[] {
  // `matchScreen` навмисно не бере корінь: `/` — не шаблон, а один екран.
  const entry = pathname === "/" ? screenByKey("entry") : null;
  const match = entry ? { screen: entry, params: {} } : matchScreen(pathname);
  if (!match) {
    // Сторінка контенту: рівень «Сторінки» — підпис із журналу (`pages`), а не
    // нове слово в коді. Назва сторінки долучається, щойно прийде з даних.
    const parent: Crumb = { label: screenLabel("pages"), href: null };
    return title ? [parent, { label: title, href: null }] : [parent];
  }

  const byKey = new Map(rows.map((row) => [row.key, row]));
  const chain = screenChain(match.screen.key);
  if (chain.length === 0) {
    const parent: Crumb = { label: screenLabel("pages"), href: null };
    return title ? [parent, { label: title, href: null }] : [parent];
  }

  return chain.map((screen, index) => {
    const current = index === chain.length - 1;
    const row = byKey.get(screen.key);
    return {
      label: current && title ? title : (row?.title ?? screen.title),
      href: current ? null : screenHref(screen, match.params),
    };
  });
}
