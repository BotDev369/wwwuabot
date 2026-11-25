/**
 * Чи сторінку відкрито як Telegram Mini App. Продукт показуємо лише тоді,
 * коли є підписаний `initData`; у браузері — екран-блок, а не платформа.
 * Перший кадр вирішує інлайновий скрипт `index.html` оболонки, цей модуль —
 * той самий вибір для коду й тестів.
 *
 * @module packages/shared/src/security/mini-app
 */

/** Атрибут гейта першого кадру; контракт живе в `entry-gate`, тут — для коду й тестів. */
import { WEB_BLOCK_ATTR } from "./entry-gate";

export { WEB_BLOCK_ATTR };

/** Що потрібно знати про вікно, щоб ухвалити рішення. */
export interface WebEntry {
  /** Підписаний рядок від Telegram; поза Mini App порожній. */
  initData?: string | null;
  /** Ім'я хоста сторінки. */
  hostname: string;
  /** Ключ дев-прев'ю в адресі або сховищі вкладки (лише платформа). */
  preview?: boolean;
}

/** Підпис від Telegram є — сторінка справді в Mini App. */
export function isTelegramMiniApp(initData: string | null | undefined): boolean {
  return typeof initData === "string" && initData.length > 0;
}

/** Локальна розробка: `vite` віддає сторінку на петлі, а не на публічній адресі. */
export function isLocalDevHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

/**
 * Продукт у цьому вікні показувати не можна.
 *
 * `initData` лежить у фрагменті адреси, а фрагмент браузер на сервер не
 * надсилає — тому вирішує клієнт; дані все одно закриває підпис у `api-dev`.
 */
export function blocksWebEntry(entry: WebEntry): boolean {
  if (entry.preview) return false;
  if (isTelegramMiniApp(entry.initData)) return false;
  return !isLocalDevHost(entry.hostname);
}

/** Гейт першого кадру вже позначив документ як «веб». */
export function isWebEntryBlocked(root: { hasAttribute(name: string): boolean }): boolean {
  return root.hasAttribute(WEB_BLOCK_ATTR);
}
