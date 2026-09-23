/**
 * Рядок оголошення на дошці — **той самий рядок, що в решти розділів**.
 *
 * **Спочатку назва, і аж потім вид.** Вид оголошення — це підпис під назвою (його
 * чип стоїть у рядку мети), а не шапка над нею: назва мусить читатися першою,
 * як у гри, сторінки чи людини. Провідна клітинка — **знак виду**: він єдине,
 * що видно, не читаючи, і стоїть там само, де знак гри чи аватар.
 *
 * **Дотик відкриває оголошення.** У рядку вміщається рядок тексту, а сказати про
 * оголошення треба все: повний текст, ціну, місто, стан чернетки. Тож дотик
 * відкриває **поверхню** (`MenuModal`) — ту саму, якою в продукті відкривають
 * будь-що інше, — і в ній же живуть дії власника. Дій у рядку немає: по-перше,
 * рядок мусить виглядати однаково в усіх розділах, по-друге, три підписи під
 * кожним оголошенням займали власний рядок у стрічці, яку читають.
 *
 * **Дії бувають лише свої.** Чуже оголошення читають: редагувати його не можна,
 * і сервер теж відповість 404, бо власник стоїть у `WHERE`. Кнопка над чужим
 * була б обіцянкою, а не дією (§7).
 *
 * **Чернетка каже, що вона чернетка** — чипом у рядку мети й словами в
 * поверхні: вимкнене оголошення в списку нічим не відрізнялось би від
 * показаного, а різниця велика — його ніхто, крім власника, не бачить.
 *
 * @module web-platform-dev/src/pages/AdCard
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { adKindLabel, type Ad } from "@wwwuabot/shared/ads";
import { MenuModal } from "@wwwuabot/ui/menu";
import { adKindIcon } from "./ads-view";

/** Порожні поля в рядок не потрапляють: « · » без нічого читалось би як збій. */
function parts(...values: string[]): string[] {
  return values.map((value) => value.trim()).filter((value) => value !== "");
}

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
  const [open, setOpen] = useState(false);
  const kind = adKindLabel(ad.kind);
  // Назви немає — нею стає вид («Продам»): порожній рядок не має право
  // лишитись без підпису, а назва й вид — те саме слово в різних місцях.
  const heading = ad.title || kind;
  const meta = parts(ad.title ? kind : "", ad.price, ad.place);

  return (
    <article className="wb-ad">
      <button type="button" className="wb-ad-open" onClick={() => setOpen(true)}>
        <span className="wb-ad-icon">
          <Icon name={adKindIcon(ad.kind)} size={20} />
        </span>

        <span className="wb-ad-text">
          <span className="wb-ad-title">{heading}</span>

          <span className="wb-ad-meta">
            {!ad.isActive && <span className="wb-badge wb-badge-neutral">Чернетка</span>}
            {meta.length > 0 && <span className="wb-ad-meta-line">{meta.join(" · ")}</span>}
          </span>

          {ad.body && <span className="wb-ad-body">{ad.body}</span>}
        </span>

        {/* Шеврон — ознака переходу: за дотиком справді стоїть поверхня з
            оголошенням. Правило те саме, що в ігор і сторінок (§9). */}
        <span className="wb-ad-more">
          <Icon name="chevron-right" size={18} />
        </span>
      </button>

      {open && (
        <MenuModal
          // Ім'я в шапці — назва оголошення: дії стосуються одного рядка, і без
          // цього доводилось би згадувати, якого саме.
          title={heading}
          onClose={() => setOpen(false)}
          content={
            <AdFull
              ad={ad}
              mine={mine}
              onEdit={() => {
                setOpen(false);
                onEdit();
              }}
              onToggle={onToggle}
              onDelete={() => {
                setOpen(false);
                onDelete();
              }}
            />
          }
        />
      )}
    </article>
  );
}

/** Оголошення цілком — те, що не влізло в рядок. */
function AdFull({
  ad,
  mine,
  onEdit,
  onToggle,
  onDelete,
}: {
  ad: Ad;
  mine: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}): ReactElement {
  const meta = parts(ad.price, ad.place);

  return (
    <div className="wb-ad-view">
      <div className="wb-ad-view-flags">
        <span className="wb-badge wb-badge-accent">{adKindLabel(ad.kind)}</span>
        {!ad.isActive && <span className="wb-badge wb-badge-neutral">Чернетка</span>}
      </div>

      {ad.title && <h3 className="wb-ad-view-title">{ad.title}</h3>}
      {meta.length > 0 && <p className="wb-ad-view-meta">{meta.join(" · ")}</p>}
      {ad.body && <p className="wb-ad-view-body">{ad.body}</p>}

      {/* Стан чернетки — не прикраса: без пояснення людина бачила б своє
          оголошення в списку й вважала б, що його бачать усі. */}
      {!ad.isActive && (
        <p className="wb-text-muted">Чернетку бачите лише ви — на дошці її немає.</p>
      )}

      {mine && (
        <div className="wb-ad-view-actions">
          <button type="button" className="wb-btn wb-btn-primary" onClick={onEdit}>
            <Icon name="edit" size={16} />
            Змінити
          </button>

          <button type="button" className="wb-btn wb-btn-secondary" onClick={onToggle}>
            <Icon name={ad.isActive ? "eye-off" : "eye"} size={16} />
            {ad.isActive ? "Прибрати з дошки" : "Показати на дошці"}
          </button>

          <button
            type="button"
            className="wb-btn wb-btn-secondary wb-btn-danger"
            onClick={onDelete}
          >
            <Icon name="trash" size={16} />
            Видалити
          </button>
        </div>
      )}
    </div>
  );
}
