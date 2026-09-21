/**
 * Список дошки — те, що бачить людина у вкладці «Оголошення».
 *
 * Дві вибірки й одне подання: **дошка** (показане іншими) і **власні** (разом
 * із чернетками). Злити їх мусить одне місце, інакше «моє» визначалося б у
 * розмітці — а це саме те правило, яке на другому екрані забувають.
 *
 * **Чернетки стоять першими.** Вони не на дошці, тож без цього людина не
 * бачила б їх узагалі — а вони ж і чекають на увагу: або дописати, або
 * показати.
 *
 * Порядок дошки не змінюється: він іде з бази (свіжіші — першими), і
 * переставляти його тут означало б мати другу правду про «що новіше».
 *
 * @module web-platform-dev/src/pages/ads-list
 */

import type { Ad, AdDraft } from "@wwwuabot/shared/ads";

/** Оголошення в списку **разом із тим, чиє воно**: дії бувають лише свої. */
export interface SpaceAd {
  ad: Ad;
  mine: boolean;
}

export function composeAds(board: readonly Ad[], own: readonly Ad[]): SpaceAd[] {
  const ownIds = new Set(own.map((ad) => ad.id));
  const drafts = own.filter((ad) => !ad.isActive).map((ad) => ({ ad, mine: true }));
  const published = board.map((ad) => ({ ad, mine: ownIds.has(ad.id) }));

  return [...drafts, ...published];
}

/**
 * Оголошення → чернетка форми.
 *
 * Одне місце, де «рядок із бази» стає «тим, що надсилають». Ним користуються
 * **обидві** дії: правка (нічого не змінюючи) і «прибрати / показати» (те саме
 * з іншим прапорцем). Друга збірка в компоненті мусила б повторити всі поля —
 * і одного дня забула б одне, тихо стерши його при збереженні.
 */
export function adDraftFrom(ad: Ad, overrides: Partial<AdDraft> = {}): AdDraft {
  return {
    id: ad.id,
    kind: ad.kind,
    title: ad.title,
    body: ad.body,
    price: ad.price,
    place: ad.place,
    isActive: ad.isActive,
    ...overrides,
  };
}
