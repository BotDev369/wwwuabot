/**
 * Один дотик — один рядок: дотик, що відкрив сторінку чи вікно, не пише себе
 * ще раз. Клік надходить раніше за поверхню й адресу, тож дотик трохи чекає;
 * відкриття **забирає** його підпис — і саме він називає модалку, коли її
 * власна шапка каже щось загальне («Створити»).
 *
 * @module web-platform-dev/src/layout/platform-journal
 */

/**
 * Пауза дотику: довша — не встигає за людиною, коротша — не ловить модалку.
 * Товар у магазині відкривається після запиту каталогу, тож пауза мусить
 * накривати й цей час — інакше та сама дія пише два рядки.
 */
export const CLICK_HOLD_MS = 800;

interface Held {
  timer: ReturnType<typeof setTimeout>;
  label: string;
}

let held: Held | null = null;

/** Відкласти дотик — він піде, якщо нічого не відкрилось. */
export function holdClick(send: () => void, label: string): void {
  cancelHeldClick();
  const timer = setTimeout(() => {
    held = null;
    send();
  }, CLICK_HOLD_MS);
  held = { timer, label };
}

/** Скасувати відкладений дотик: сторінка чи модалка вже сказали, що відкрились. */
export function cancelHeldClick(): void {
  if (!held) return;
  clearTimeout(held.timer);
  held = null;
}

/** Забрати підпис відкладеного дотику — їм називається те, що він відкрив. */
export function claimHeldClick(): string | null {
  const label = held?.label ?? null;
  cancelHeldClick();
  return label;
}
