/**
 * Сторінка отримувачів: топ за сумою у вибраному вікні.
 *
 * Вікно («день / місяць / рік / все») — це вибір усередині сторінки, а не
 * місяць у шапці: розріз за отримувачами не прив'язаний до одного періоду
 * збору, і другий селектор тут лише плутав би.
 * @module web-admin-dev/src/pages/spending/SpendingRecipientsPage
 */

import { SpendingRecipientsPanel } from "./SpendingRecipientsPanel";
import { SpendingTopbar } from "./SpendingTopbar";

export function SpendingRecipientsPage() {
  return (
    <>
      <SpendingTopbar title="Отримувачі" back />
      <section className="spend">
        <div className="spend-panel">
          <SpendingRecipientsPanel />
        </div>
      </section>
    </>
  );
}
