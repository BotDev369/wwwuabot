/**
 * Картка оголошення на дошці.
 *
 * **Це не кнопка.** Картка оголошення нікуди не веде: усе, що про нього можна
 * сказати, стоїть на ній самій, а дії бувають лише свої (змінити, прибрати,
 * видалити) — вкладені кнопки в кнопці не працюють ні на тачі, ні для читача з
 * екрана. Тому кнопки всередині, а «відкрити» нема чого.
 *
 * **Дії показуються лише під своїм.** Чуже оголошення читають; редагувати його
 * не можна — і сервер теж відповість 404, бо власник стоїть у `WHERE`.
 *
 * **Чернетка каже, що вона чернетка.** Позначка стоїть на картці, бо вимкнене
 * оголошення в списку нічим не відрізнялось би від показаного — а різниця
 * велика: його ніхто, крім власника, не бачить.
 *
 * **Дії — словом, а не трьома кнопками** (`.wb-ad-actions`): у стрічці читають
 * оголошення, і ряд кнопок бренду важив би більше за сам текст.
 *
 * @module web-platform-dev/src/pages/AdCard
 */

import type { ReactElement } from "react";
import { adKindLabel, type Ad } from "@wwwuabot/shared/ads";

export function AdCard({
  ad,
  mine,
  onEdit,
  onToggle,
  onDelete,
}: {
  ad: Ad;
  mine: boolean;
  onEdit: () => void;
  /** Показати або прибрати з дошки — один дотик на обидва стани. */
  onToggle: () => void;
  onDelete: () => void;
}): ReactElement {
  const meta = [ad.price, ad.place].filter((part) => part.trim() !== "");

  return (
    <article className="wb-ad">
      <div className="wb-ad-head">
        <span className="wb-ad-kind">{adKindLabel(ad.kind)}</span>
        {!ad.isActive && <span className="wb-ad-draft">Чернетка</span>}
      </div>

      {ad.title && <h3 className="wb-ad-title">{ad.title}</h3>}
      {ad.body && <p className="wb-ad-body">{ad.body}</p>}
      {meta.length > 0 && <div className="wb-ad-meta">{meta.join(" · ")}</div>}

      {mine && (
        <div className="wb-ad-actions">
          <button type="button" className="wb-ad-action" onClick={onEdit}>
            Змінити
          </button>
          <button type="button" className="wb-ad-action" onClick={onToggle}>
            {ad.isActive ? "Прибрати" : "Показати"}
          </button>
          <button type="button" className="wb-ad-action wb-ad-action--danger" onClick={onDelete}>
            Видалити
          </button>
        </div>
      )}
    </article>
  );
}
