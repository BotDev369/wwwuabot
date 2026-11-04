/**
 * Розпорядники за період: три суми поруч, без «усього».
 *
 * Колонки навмисно не додаються: сума трьох чисел була б подвійним обліком
 * (сплата й надходження — дві сторони одного платежу), тож «всього громади»
 * тут не існує (`docs/SPENDING.md` §5).
 * @module web-admin-dev/src/pages/spending/SpendingOrgTable
 */

import type { SpendingOrg, SpendingTotals } from "@wwwuabot/shared/spending";
import { DataTable, type DataTableColumn } from "../../shared/components/DataTable";
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

const COLUMNS: readonly DataTableColumn<SpendingOrg>[] = [
  {
    key: "org",
    header: "Розпорядник",
    className: "spend-col-org",
    render: (org) => (
      <>
        <span className="wb-cell-title" title={org.name || undefined}>
          {org.name || "назви немає"}
        </span>
        <span className="wb-cell-sub">{org.edrpou}</span>
      </>
    ),
  },
  {
    key: "form",
    header: "Форма",
    className: "spend-col-form",
    render: (org) => org.form || "—",
  },
  {
    key: "documents",
    header: "Договори",
    className: "spend-col-num wb-col-num",
    render: (org) => <TotalsCell totals={org.documents} />,
  },
  {
    key: "payments",
    header: "Сплати",
    className: "spend-col-num wb-col-num",
    render: (org) => <TotalsCell totals={org.payments} />,
  },
  {
    key: "receipts",
    header: "Надходження",
    className: "spend-col-num wb-col-num",
    render: (org) => <TotalsCell totals={org.receipts} />,
  },
];

interface SpendingOrgTableProps {
  readonly orgs: readonly SpendingOrg[];
  readonly selected: string | null;
  readonly onSelect: (edrpou: string) => void;
}

export function SpendingOrgTable({ orgs, selected, onSelect }: SpendingOrgTableProps) {
  return (
    <div className="spend-panel">
      <DataTable
        columns={COLUMNS}
        rows={orgs}
        rowKey={(org) => org.edrpou}
        selectedKey={selected}
        tableClassName="spend-table--orgs"
        onRowClick={(org) => onSelect(org.edrpou)}
        empty="За цей період у базі немає жодного розпорядника — збір ще не приніс довідник."
      />
    </div>
  );
}
