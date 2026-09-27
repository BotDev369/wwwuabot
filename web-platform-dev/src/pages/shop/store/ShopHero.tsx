/**
 * Шапка вітрини — обкладинка, назва магазину й короткий опис.
 *
 * **Обкладинка — тло шапки, а не картинка в ній:** із назвою поверх банера шапка
 * читається як сайт магазину, а не як плейсхолдер.
 *
 * **Клас `--cover` каже CSS, що шапку малює знімок** (`heroClass`): під підписом
 * тоді лягає м'яке затемнення без форми (`.shop-store-hero--cover` —
 * `shop-storefront.css`), а сам знімок лишається повним. CSS не ставить цей клас
 * сам: `:has()` довелося б чекати від рушія Telegram. Магазин без фото
 * лишається на темному тлі шапки, і градієнта там немає — він має сенс лише на
 * знімку.
 *
 * **У шапці — тільки назва й опис.** Пошук, кошик і вибір розділу належать
 * полиці, яка їде за прокруткою (`ShopStore`, `AGENTS.md` §7): друга копія цих
 * керувань зникала б з екрана разом із шапкою.
 *
 * @module web-platform-dev/src/pages/shop/store
 */

import type { ReactElement } from "react";
import { heroClass } from "./store-view";

export interface ShopHeroProps {
  /** Знімок обкладинки; `null` — магазин без фото. */
  photoUrl: string | null;
  /** Назва магазину — заголовок сторінки; порожня дає слово «Магазин». */
  title: string | null;
  /** Короткий опис під назвою; порожній не малює рядка. */
  tagline: string;
}

export function ShopHero({ photoUrl, title, tagline }: ShopHeroProps): ReactElement {
  return (
    <header className={heroClass(photoUrl)}>
      {photoUrl && <img className="shop-store-cover" src={photoUrl} alt="" />}

      <div className="shop-store-hero-body">
        <h1 className="shop-store-title">{title?.trim() || "Магазин"}</h1>
        {tagline && <p className="shop-store-tagline">{tagline}</p>}
      </div>
    </header>
  );
}
