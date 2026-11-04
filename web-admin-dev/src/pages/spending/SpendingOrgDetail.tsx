/**
 * Розпорядник зсередини: договори й дві сторони платежів окремими вкладками.
 *
 * Вкладки, а не одна таблиця: договір і платіж мають різні поля. Сторони
 * платежу теж окремо — у базі роль одна (`payer` або `recipt`), тож «обидві»
 * дали б подвійний рядок там, де обидві сторони з громади.
 * @module web-admin-dev/src/pages/spending/SpendingOrgDetail
 */

import { useState } from "react";
import type { SpendingDocument, SpendingOrg, SpendingTransaction } from "@wwwuabot/shared/spending";
import { DataTable, type DataTableColumn } from "../../shared/components/DataTable";
import { contractorNames, counterparty, formatCount, formatDate, formatMoney } from "./format";
import { useSpendingDocuments, useSpendingTransactions } from "./useSpendingList";

type DetailTab = "documents" | "payer" | "recipt";

const TABS: readonly { key: DetailTab; label: string }[] = [
  { key: "documents", label: "Договори" },
  { key: "payer", label: "Сплати" },
  { key: "recipt", label: "Надходження" },
];

const DOCUMENT_COLUMNS: readonly DataTableColumn<SpendingDocument>[] = [
  {
    key: "subject",
    header: "Предмет",
    className: "spend-col-subject",
    render: (document) => (
      <>
        <span className="wb-cell-title">{document.subject || "—"}</span>
        {document.number && <span className="wb-cell-sub">№ {document.number}</span>}
      </>
    ),
  },
  {
    key: "contractors",
    header: "Контрагенти",
    className: "spend-col-party",
    render: (document) => (
      <span className="spend-subject">{contractorNames(document.contractors)}</span>
    ),
  },
  {
    key: "date",
    header: "Дата",
    className: "spend-col-date",
    render: (document) => formatDate(document.documentDate),
  },
  {
    key: "number",
    header: "Номер",
    className: "spend-col-code",
    render: (document) => document.number || "—",
  },
  {
    key: "amount",
    header: "Сума",
    className: "spend-col-sum wb-col-num",
    render: (document) => formatMoney(document.amount, document.currency),
  },
];

function DocumentList({ edrpou, period }: { edrpou: string; period: string }) {
  const list = useSpendingDocuments(edrpou, period);

  if (list.loading && list.items.length === 0)
    return <p className="spend-list-note">Завантаження…</p>;
  if (list.error) return <p className="spend-list-note">{list.error}</p>;
  if (list.items.length === 0) {
    return (
      <p className="spend-list-note">Договорів за цей період немає — джерело їх не віддало.</p>
    );
  }

  return (
    <>
      <DataTable
        columns={DOCUMENT_COLUMNS}
        rows={list.items}
        rowKey={(document) => document.id}
        tableClassName="spend-table--documents"
        mobileMeta={(document) => (
          <>
            <dt>Контрагенти</dt>
            <dd>{contractorNames(document.contractors)}</dd>
            <dt>Дата</dt>
            <dd>{formatDate(document.documentDate)}</dd>
            <dt>Номер</dt>
            <dd>{document.number || "—"}</dd>
            <dt>Сума</dt>
            <dd>{formatMoney(document.amount, document.currency)}</dd>
          </>
        )}
        empty="Договорів немає."
      />
      {list.nextCursor && (
        <button
          type="button"
          className="wb-btn wb-btn-ghost wb-btn-sm"
          onClick={() => void list.more()}
          disabled={list.loading}
        >
          {list.loading ? "Завантажую…" : "Показати ще"}
        </button>
      )}
    </>
  );
}

function TransactionList({
  edrpou,
  period,
  role,
}: {
  edrpou: string;
  period: string;
  role: "payer" | "recipt";
}) {
  const list = useSpendingTransactions(edrpou, period, role);
  const party = role === "payer" ? "Отримувач" : "Платник";

  const columns: readonly DataTableColumn<SpendingTransaction>[] = [
    {
      key: "party",
      header: party,
      className: "spend-col-party",
      render: (transaction) => (
        <>
          <span className="wb-cell-title">{counterparty(transaction, role)}</span>
          <span className="wb-cell-sub">{formatDate(transaction.transDate)}</span>
        </>
      ),
    },
    {
      key: "subject",
      header: "Призначення",
      className: "spend-col-subject",
      render: (transaction) => (
        <span className="spend-subject">{transaction.paymentDetails || "—"}</span>
      ),
    },
    {
      key: "date",
      header: "Дата",
      className: "spend-col-date",
      render: (transaction) => formatDate(transaction.transDate),
    },
    {
      key: "kekv",
      header: "КЕКВ",
      className: "spend-col-code",
      render: (transaction) => transaction.kekv || "—",
    },
    {
      key: "amount",
      header: "Сума",
      className: "spend-col-sum wb-col-num",
      render: (transaction) => formatMoney(transaction.amount, transaction.currency),
    },
  ];

  if (list.loading && list.items.length === 0)
    return <p className="spend-list-note">Завантаження…</p>;
  if (list.error) return <p className="spend-list-note">{list.error}</p>;
  if (list.items.length === 0) {
    return (
      <p className="spend-list-note">
        {role === "payer" ? "Сплат" : "Надходжень"} за цей період немає — джерело їх не віддало.
      </p>
    );
  }

  return (
    <>
      <DataTable
        columns={columns}
        rows={list.items}
        rowKey={(item) => item.id}
        tableClassName="spend-table--transactions"
        mobileMeta={(transaction) => (
          <>
            <dt>Призначення</dt>
            <dd>{transaction.paymentDetails || "—"}</dd>
            <dt>КЕКВ</dt>
            <dd>{transaction.kekv || "—"}</dd>
            <dt>Сума</dt>
            <dd>{formatMoney(transaction.amount, transaction.currency)}</dd>
          </>
        )}
        empty="Записів немає."
      />
      <p className="spend-list-note">
        Показано {formatCount(list.items.length)} записів із зібраних; решта — за кнопкою нижче.
      </p>
      {list.nextCursor && (
        <button
          type="button"
          className="wb-btn wb-btn-ghost wb-btn-sm"
          onClick={() => void list.more()}
          disabled={list.loading}
        >
          {list.loading ? "Завантажую…" : "Показати ще"}
        </button>
      )}
    </>
  );
}

interface SpendingOrgDetailProps {
  org: SpendingOrg;
  period: string;
}

export function SpendingOrgDetail({ org, period }: SpendingOrgDetailProps) {
  const [tab, setTab] = useState<DetailTab>("documents");

  return (
    <div className="spend-panel">
      <div className="spend-detail-head">
        <div>
          <h2 className="spend-detail-title">{org.name || "назви немає"}</h2>
          <span className="spend-org-code">
            {org.edrpou}
            {org.form ? ` · ${org.form}` : ""}
            {org.koatuu ? ` · КОАТУУ ${org.koatuu}` : ""}
          </span>
        </div>
        <div className="spend-tabs">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={tab === item.key ? "spend-tab spend-tab-active" : "spend-tab"}
              aria-pressed={tab === item.key}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "documents" ? (
        <DocumentList edrpou={org.edrpou} period={period} />
      ) : (
        <TransactionList edrpou={org.edrpou} period={period} role={tab} />
      )}
    </div>
  );
}
