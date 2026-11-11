/**
 * Чек-поінти журналу: три рівні — поверхня, екран, важлива дія. Ключі —
 * латиниця й крапки, підписи — з наявних словників (`events`), тож другого
 * списку слів не з'являється; неоголошене в журнал не пишеться.
 * @module api-dev/src/services/events-checkpoints
 */

import {
  EVENT_KINDS,
  PLATFORM_SCREENS,
  eventKindLabel,
  platformAction,
  platformActionLabel,
  screenLabel,
  surfaceLabel,
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

/** Другий рівень дерева: екран, у який людина зайшла. */
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

/** Підпис вузла: поверхня, екран або дія — з наявних словників. */
export function checkpointLabel(key: string): string {
  const [surface, screen, ...rest] = key.split(".");
  if (!screen) return surfaceLabel(surface);
  // Ключ дії складається з кількох частин (`trackers.entry`), тож решта
  // збирається назад: інакше підпис губкав другу половину й повертався ключ.
  if (rest.length === 0) return screenLabel(screen);
  const action = rest.join(".");
  const found = CHECKPOINT_ACTIONS.find((item) => item.screen === screen && item.key === action);
  return found ? platformActionLabel(found.action) : key;
}

/** Вузол дерева з кількістю відвідувань за діапазон. */
export interface CheckpointNode {
  readonly key: string;
  readonly label: string;
  /** Лічба разом із нащадками: `count` змінюється, коли додається чужий ключ. */
  count: number;
  readonly children: CheckpointNode[];
}

/** Вузол скелета: ті самі поля, але без лічби — її дає журнал. */
interface SkeletonNode {
  readonly key: string;
  readonly label: string;
  readonly children: SkeletonNode[];
}

/**
 * Скелет дерева: поверхня → екран → оголошені дії.
 *
 * Скелет, а не те, що знайшлось у журналі: екран без відвідувань — це теж
 * відповідь («сюди ніхто не заходить»), а не привід його ховати.
 */
function skeleton(): SkeletonNode[] {
  const platform: SkeletonNode[] = PLATFORM_SCREENS.map((screen) => ({
    key: viewCheckpointKey(screen.key),
    label: screenLabel(screen.key),
    children: CHECKPOINT_ACTIONS.filter((item) => item.screen === screen.key).map((item) => ({
      key: `platform.${item.screen}.${item.key}`,
      label: platformActionLabel(item.action),
      children: [],
    })),
  }));

  // Бот пише вузол виду оновлення (`bot.command`, `bot.message`): меню його
  // поки не описане, але «команда», «натискання», «правка» вже мають місце.
  const bot: SkeletonNode[] = EVENT_KINDS.map((kind) => ({
    key: `bot.${kind}`,
    label: eventKindLabel(kind),
    children: [],
  }));

  return [
    { key: "bot", label: surfaceLabel("bot"), children: bot },
    { key: "platform", label: surfaceLabel("platform"), children: platform },
  ];
}

/** Вузол дерева разом із кількістю: скелет плюс лічба журналу. */
function withCounts(node: SkeletonNode, counts: ReadonlyMap<string, number>): CheckpointNode {
  const children = node.children.map((child) => withCounts(child, counts));
  const own = counts.get(node.key) ?? 0;
  return {
    key: node.key,
    label: node.label,
    count: own + children.reduce((sum, child) => sum + child.count, 0),
    children,
  };
}

/**
 * Дерево з лічбою за діапазон.
 *
 * Ключі, яких немає в скелеті (старі рядки, нові екрани), не губляться: вони
 * стають додатковими дітьми своєї поверхні, тож «дивний» рядок видно, а не
 * викинуто з очей.
 */
export function checkpointTree(counts: ReadonlyMap<string, number>): CheckpointNode[] {
  const tree = skeleton().map((node) => withCounts(node, counts));
  const known = new Set<string>();
  const collect = (node: CheckpointNode): void => {
    known.add(node.key);
    node.children.forEach(collect);
  };
  tree.forEach(collect);

  for (const [key, count] of counts) {
    if (known.has(key)) continue;
    const [surface] = key.split(".");
    const parent = tree.find((node) => node.key === surface);
    if (!parent) continue;
    parent.children.push({ key, label: checkpointLabel(key), count, children: [] });
    parent.count += count;
  }

  return tree;
}
