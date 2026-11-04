/**
 * Розпорядники за період: три суми поруч, без «усього».
 *
 * Колонки навмисно не додаються: сума трьох чисел була б подвійним обліком
 * (сплата й надходження — дві сторони одного платежу), тож «всього громади»
 * тут не існує (`docs/SPENDING.md` §5).
 * @module web-admin-dev/src/pages/spending/SpendingOrgTable
 */

import type { SpendingOrg, SpendingTotals } from "@wwwuabot/shared/spending";
import { formatCount, formatMoney } from "./format";

/**
 * Число й сума в одній клітинці — двома рядками: «18 · 240 000,00 грн» читалось
 * як одне незрозуміле число, а стовпчик і без того вузький.
 */
function TotalsCell({ totals }: { readonly totals: SpendingTotals }) {
  if (totals.count === 0) return <span className="spend-totals-empty">не оприлюднено</span>;
  return (
    <span className="spend-totals">
      <span className="spend-totals-count">{formatCount(totals.count)}</span>
      <span className="spend-totals-sum">{formatMoney(totals.amount)}</span>
    </span>
  );
}

interface SpendingOrgTableProps {
  orgs: readonly SpendingOrg[];
  selected: string | null;
  onSelect: (edrpou: string) => void;
}

export function SpendingOrgTable({ orgs, selected, onSelect }: SpendingOrgTableProps) {
  return (
    <div className="spend-panel">
      <div className="spend-table-wrap">
        <table className="wb-data-table spend-table">
          <thead>
            <tr>
              <th>Розпорядник</th>
              <th>Форма</th>
              <th className="spend-th-num">Договори</th>
              <th className="spend-th-num">Сплати</th>
              <th className="spend-th-num">Надходження</th>
            </tr>
          </thead>
          <tbody>
            {orgs.length === 0 ? (
              <tr>
                <td className="spend-empty" colSpan={5}>
                  За цей період у базі немає жодного розпорядника — збір ще не приніс довідник.
                </td>
              </tr>
            ) : (
              orgs.map((org) => (
                <tr
                  key={org.edrpou}
                  className={selected === org.edrpou ? "spend-row spend-row-active" : "spend-row"}
                  onClick={() => onSelect(org.edrpou)}
                >
                  <td data-label="">
                    <span className="spend-org-name">{org.name || "назви немає"}</span>
                    <span className="spend-org-code">{org.edrpou}</span>
                  </td>
                  <td className="spend-form" data-label="Форма">
                    {org.form || "—"}
                  </td>
                  <td className="spend-num" data-label="Договори">
                    <TotalsCell totals={org.documents} />
                  </td>
                  <td className="spend-num" data-label="Сплати">
                    <TotalsCell totals={org.payments} />
                  </td>
                  <td className="spend-num" data-label="Надходження">
                    <TotalsCell totals={org.receipts} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
