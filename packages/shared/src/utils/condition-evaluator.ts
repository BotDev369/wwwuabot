/**
 * Condition Evaluator — перевірка умов показу блоку проти профілю користувача.
 *
 * Використовується ZoneRenderer'ом для вирішення чи рендерити блок,
 * чи показувати fallback, чи пропустити.
 *
 * @module packages/shared/src/utils/condition-evaluator
 */

import type {
  BlockConditions,
  UserProfile,
} from '../types/page-config';

// ---------------------------------------------------------------------------
// Основна функція
// ---------------------------------------------------------------------------

/**
 * Перевіряє чи виконуються умови блоку для даного користувача.
 *
 * @param conditions - умови з блоку (BlockConditions)
 * @param user - профіль користувача (UserProfile)
 * @returns true якщо ВСІ умови виконуються
 *
 * @example
 * evaluateConditions(
 *   { role: ['admin', 'moderator'], tariff: ['pro'] },
 *   { id: 1, role: 'admin', tariff: 'pro' }
 * );
 * // => true
 *
 * @example
 * evaluateConditions(
 *   { role: ['admin'] },
 *   { id: 1, role: 'user' }
 * );
 * // => false
 */
export function evaluateConditions(
  conditions: BlockConditions | undefined,
  user: UserProfile | undefined,
): boolean {
  // Немає умов = показуємо завжди
  if (!conditions) return true;

  // Немає користувача = не показуємо (якщо є умови — потрібен юзер)
  if (!user) return false;

  // Роль
  if (conditions.role && conditions.role.length > 0) {
    const userRole = user.role ?? '';
    if (!conditions.role.includes(userRole)) return false;
  }

  // Тариф
  if (conditions.tariff && conditions.tariff.length > 0) {
    const userTariff = user.tariff ?? '';
    if (!conditions.tariff.includes(userTariff)) return false;
  }

  // Статус
  if (conditions.status && conditions.status.length > 0) {
    const userStatus = user.status ?? '';
    if (!conditions.status.includes(userStatus)) return false;
  }

  // Мінімальна знижка
  if (conditions.minDiscount !== undefined) {
    const userDiscount = user.discount ?? 0;
    if (userDiscount < conditions.minDiscount) return false;
  }

  // Дозволи (permissions) — user має мати ВСІ вказані
  if (conditions.permissions && conditions.permissions.length > 0) {
    const userPerms = user.permissions ?? [];
    for (const required of conditions.permissions) {
      if (!userPerms.includes(required)) return false;
    }
  }

  // Довільні поля (fieldMatch)
  if (conditions.fieldMatch) {
    for (const [path, expected] of Object.entries(conditions.fieldMatch)) {
      const actual = getByPath(user, path);
      if (actual !== expected) return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Допоміжні
// ---------------------------------------------------------------------------

/**
 * Отримати значення за шляхом з крапками.
 * Наприклад: getByPath({ a: { b: 42 } }, "a.b") => 42
 */
function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Отримати блок для показу (основний або fallback).
 *
 * @param block - блок з умовами
 * @param user - профіль користувача
 * @returns блок для рендеру або null якщо нічого не показувати
 */
export function resolveBlock(
  block: { conditions?: BlockConditions; fallback?: unknown },
  user: UserProfile | undefined,
): { show: boolean; useFallback: boolean } {
  if (!block.conditions) {
    return { show: true, useFallback: false };
  }

  const matches = evaluateConditions(block.conditions, user);

  if (matches) {
    return { show: true, useFallback: false };
  }

  // Умови не виконались — є fallback?
  if (block.conditions.fallback) {
    return { show: true, useFallback: true };
  }

  // Ні fallback, ні збігу — не показуємо
  return { show: false, useFallback: false };
}

/**
 * Отримати значення користувача для відображення в UI-редакторі умов.
 * Повертає список можливих значень для кожного параметра.
 */
export function getAvailableConditionFields(): {
  key: string;
  label: string;
  type: 'select' | 'number' | 'permissions';
  options?: string[];
}[] {
  return [
    { key: 'role', label: 'Роль', type: 'select', options: ['user', 'moderator', 'admin', 'vip'] },
    { key: 'tariff', label: 'Тариф', type: 'select', options: ['free', 'basic', 'pro', 'enterprise'] },
    { key: 'status', label: 'Статус', type: 'select', options: ['active', 'pending', 'suspended'] },
    { key: 'minDiscount', label: 'Мін. знижка (%)', type: 'number' },
    { key: 'permissions', label: 'Дозволи', type: 'permissions', options: ['analytics', 'export', 'messaging', 'settings', 'users', 'billing'] },
  ];
}
