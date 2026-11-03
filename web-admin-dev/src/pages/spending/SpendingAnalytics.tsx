/**
 * Аналізи Є-data: ті самі платежі у двох розрізах.
 *
 * Обидва розрізи не додають нових даних — вони лише групують зібране, тож
 * стоять нижче таблиці розпорядників і не конкурують із нею за увагу.
 * @module web-admin-dev/src/pages/spending/SpendingAnalytics
 */

import { useState } from "react";
import { SpendingCodesPanel } from "./SpendingCodesPanel";
import { SpendingRecipientsPanel } from "./SpendingRecipientsPanel";

type Tab = "codes" | "recipients";

interface SpendingAnalyticsProps {
  readonly period: string | null;
}

export function SpendingAnalytics({ period }: SpendingAnalyticsProps) {
  const [tab, setTab] = useState<Tab>("codes");

  return (
    <section className="spend-panel spend-analytics">
      <h2 className="spend-detail-title">Аналізи</h2>
      <div className="spend-tabs" role="tablist" aria-label="Розріз аналізу">
        <button
          role="tab"
          aria-selected={tab === "codes"}
          className={`spend-tab${tab === "codes" ? " spend-tab-active" : ""}`}
          onClick={() => setTab("codes")}
        >
          Коди платежів
        </button>
        <button
          role="tab"
          aria-selected={tab === "recipients"}
          className={`spend-tab${tab === "recipients" ? " spend-tab-active" : ""}`}
          onClick={() => setTab("recipients")}
        >
          Отримувачі
        </button>
      </div>

      {tab === "codes" ? <SpendingCodesPanel period={period} /> : <SpendingRecipientsPanel />}
    </section>
  );
}
