/**
 * Прев'ю кирпичиків для інвентаря вигляду (`/style`).
 *
 * Розмітка — справжня, зі спільними класами; повний перелік класів виводиться
 * з CSS (вкладка «Класи»), тож цей список свідомо неповний.
 *
 * @module web-admin-dev/src/pages/style/previews
 */

import type { ReactNode } from "react";
import { BASE_GROUPS } from "./previews-base";
import { SURFACE_GROUPS } from "./previews-surfaces";

export interface Brick {
  /** Стабільний ключ (не показується). */
  id: string;
  /** Людська назва елемента. */
  title: string;
  /** Класи, з яких він складений, — щоб було видно, що саме міряємо. */
  classes: string[];
  /** Розмітка кирпичика в тому вигляді, у якому її рендерить продукт. */
  node: ReactNode;
}

export interface BrickGroup {
  id: string;
  title: string;
  items: Brick[];
}

/** Кирпичики в порядку читання: від тексту до навігації. */
export const BRICKS: BrickGroup[] = [...BASE_GROUPS, ...SURFACE_GROUPS];
