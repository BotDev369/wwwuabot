/**
 * Порожній результат пошуку — один на всі розділи Простору.
 *
 * Список, з якого пошук прибрав усе, не має лишатись **порожнім екраном**:
 * без рядка це читалось би як «розділ поламався», хоч насправді звуження
 * спрацювало. Тому стан каже, що сталося, і тримає кнопку, яка повертає список.
 *
 * Текст і кнопку задає той, хто знає, **що саме** звужували: у дошки оголошень
 * це пошук і фільтри, у решти розділів — лише пошук.
 *
 * @module web-platform-dev/src/pages/SpaceListEmpty
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";

export function SpaceListEmpty({
  onReset,
  resetLabel = "Скинути пошук",
}: {
  /** Повернути список до повного: дотик має давати те саме, що й чип. */
  onReset: () => void;
  resetLabel?: string;
}): ReactElement {
  return (
    <div className="wb-empty">
      <span className="wb-empty-icon">
        <Icon name="search" size={32} />
      </span>
      <p className="wb-empty-text">Нічого не знайдено за цим запитом.</p>
      <button type="button" className="wb-btn wb-btn-secondary" onClick={onReset}>
        <Icon name="refresh" size={16} />
        {resetLabel}
      </button>
    </div>
  );
}
