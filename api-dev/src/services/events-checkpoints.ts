/**
 * Чек-поінти журналу: місце в продукті, за яким ми стежимо. Ключі — латиниця
 * й крапки, підписи — з наявних словників (`events`), тож другого списку слів
 * не з'являється; неоголошене в журнал не пишеться.
 * @module api-dev/src/services/events-checkpoints
 */

import {
  PLATFORM_SCREENS,
  platformAction,
  platformActionLabel,
  screenLabel,
} from "@wwwuabot/shared/events";

/** Третій рівень: важлива дія всередині екрана і шлях, який її означає. */
export interface CheckpointAction {
  readonly key: string;
  readonly screen: string;
  readonly action: string;
}

/**
 * Оголошені дії — єдине, що платформа пише як «запис»: решта змін стану в
 * журнал не потрапляє, бо не описує місця, за яким ми стежимо.
 */
export const CHECKPOINT_ACTIONS: readonly CheckpointAction[] = [
  { key: "trackers.entry", screen: "trackers", action: "POST /api/user/trackers/entry" },
  { key: "trackers.create", screen: "trackers", action: "POST /api/user/trackers" },
  { key: "trackers.group", screen: "trackers", action: "POST /api/user/trackers/group" },
  { key: "trackers.remove", screen: "trackers", action: "DELETE /api/user/trackers" },
  { key: "favorites.add", screen: "favorites", action: "POST /api/favorites" },
  { key: "favorites.remove", screen: "favorites", action: "DELETE /api/favorites" },
  { key: "messages.send", screen: "messages", action: "POST /api/messages/send" },
  { key: "dates.compare", screen: "date-analysis", action: "POST /api/mydate/compare" },
  { key: "dates.save", screen: "date-analysis", action: "POST /api/my-dates" },
  { key: "pages.save", screen: "pages", action: "POST /api/user/pages" },
  { key: "shop.order", screen: "orders", action: "POST /api/public/shop/orders" },
  { key: "ads.save", screen: "ads", action: "POST /api/ads" },
];

/** Другий рівень: екран, у який людина зайшла. */
export function viewCheckpointKey(screen: string): string {
  return `platform.${screen}`;
}

/**
 * Ключ дії за методом і шляхом; `null` — це місце не оголошене чек-поінтом,
 * тож у журнал воно не йде.
 */
export function checkpointActionKey(method: string, pathname: string): string | null {
  const action = platformAction(method, pathname);
  const found = CHECKPOINT_ACTIONS.find((item) => item.action === action);
  return found ? `platform.${found.screen}.${found.key}` : null;
}

/** Рядок таблиці, до якого належить подія журналу; `null` — не наш чек-поінт. */
export interface CheckpointRowRef {
  readonly key: string;
  readonly label: string;
  /** Екран цієї дії; `null` — рядок сам і є екраном. */
  readonly parent: string | null;
}

/**
 * Місце події в таблиці.
 *
 * Рахуємо з полів, які є в журналі **завжди** (`surface`, `kind`, `action`), а
 * не з пізнішої колонки `node`: інакше вся історія до її появи дала б нулі —
 * що вже сталося й виглядало як «нічого не відбувається».
 */
export function checkpointRowOf(event: {
  surface: string;
  kind: string;
  action: string;
}): CheckpointRowRef | null {
  if (event.surface !== "platform") return null;
  const action = event.action.trim();

  if (event.kind === "view") {
    // Відкриття екрана: у `action` — назва з шапки, у старих рядках — ключ.
    const screen = PLATFORM_SCREENS.find((item) => item.key === action || item.label === action);
    if (!screen) return null;
    return { key: viewCheckpointKey(screen.key), label: screenLabel(screen.key), parent: null };
  }

  if (event.kind === "request") {
    const found = CHECKPOINT_ACTIONS.find((item) => item.action === action);
    if (!found) return null;
    return {
      key: `platform.${found.screen}.${found.key}`,
      label: platformActionLabel(found.action),
      parent: viewCheckpointKey(found.screen),
    };
  }

  return null;
}
