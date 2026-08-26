import { log } from "./debug";

/**
 * Безпечно читає JSON-коробку сім'ї з об'єкта користувача.
 * Якщо дані відсутні або биті — повертає порожній об'єкт {}.
 */
export function getFamilyBox(
  user: Record<string, any> | undefined,
  family: string,
): Record<string, any> {
  // ← ВИПРАВЛЕННЯ: Додаємо перевірку на undefined і змінюємо тип параметра
  if (!user) {
    return {};
  }

  const raw = user[family];
  if (!raw || typeof raw !== "string") {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
    log("FAMILY_BOX", "invalid structure (not object), resetting", { family });
    return {};
  } catch {
    log("FAMILY_BOX", "invalid JSON, resetting", { family });
    return {};
  }
}

/**
 * Записує значення за шляхом у JSON-коробці сім'ї.
 * Підтримує вкладені ключі через крапку (наприклад, "survey.name").
 */
export function setByPath(box: Record<string, any>, path: string, value: any): void {
  const keys = path.split(".");
  let current: any = box;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
}

/**
 * Серіалізує коробку в JSON і записує в об'єкт користувача.
 * userDirty встановлюється в bot-router.ts, а не тут.
 */
export function saveFamilyBox(
  user: Record<string, any>,
  family: string,
  box: Record<string, any>,
): void {
  user[family] = JSON.stringify(box);
}
