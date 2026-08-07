import type { AppContext } from "../shared/types/env";

export interface MenuEntry {
  f: string; // family (codeword prefix)
  t: string; // title (public name)
}

const COMMAND_RE = /^[a-z0-9_]{1,32}$/;

/**
 * Безпечний парс меню юзера.
 * Битий/відсутній JSON → [].
 */
export function getMenu(user: Record<string, any> | undefined): MenuEntry[] {
  if (!user?.menu) return [];
  try {
    const parsed = typeof user.menu === "string" ? JSON.parse(user.menu) : user.menu;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e: any) => e && typeof e.f === "string" && typeof e.t === "string"
    ) as MenuEntry[];
  } catch {
    return [];
  }
}

/**
 * Додає або оновлює запис у меню.
 * Повертає { menu, changed }.
 * Правила:
 * - family має проходити COMMAND_RE;
 * - menu.length < 99 для додавання;
 * - якщо family вже є і t відрізняється → оновити;
 * - інакше без змін.
 */
export function upsertMenu(
  menu: MenuEntry[],
  family: string,
  title: string
): { menu: MenuEntry[]; changed: boolean } {
  // Валідація family як Telegram-команди
  if (!COMMAND_RE.test(family)) {
    return { menu, changed: false };
  }

  // Перевірка ліміту (тільки для додавання нового)
  const existingIndex = menu.findIndex((e) => e.f === family);

  if (existingIndex === -1) {
    // Новий запис
    if (menu.length >= 99) {
      return { menu, changed: false };
    }
    const newMenu = [...menu, { f: family, t: title }];
    return { menu: newMenu, changed: true };
  } else {
    // Існуючий запис
    if (menu[existingIndex].t !== title) {
      const newMenu = menu.map((e, i) =>
        i === existingIndex ? { ...e, t: title } : e
      );
      return { menu: newMenu, changed: true };
    }
    return { menu, changed: false };
  }
}

/**
 * Будує масив команд для setMyCommands.
 * Першим завжди йде restart, далі — всі entry з меню.
 * Description обрізається до 256 символів.
 */
export function buildCommands(menu: MenuEntry[]): { command: string; description: string }[] {
  const result = [{ command: "restart", description: "🔄 Перезапуск бота" }];

  for (const entry of menu) {
    result.push({
      command: entry.f,
      description: entry.t.slice(0, 256),
    });
  }

  return result;
}
