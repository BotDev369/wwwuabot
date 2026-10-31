/**
 * Розпорядник зсередини: договори й дві сторони платежів окремими вкладками.
 *
 * Вкладки, а не одна таблиця: договір і платіж мають різні поля. Сторони
 * платежу теж окремо — у базі роль одна (`payer` або `recipt`), тож «обидві»
 * дали б подвійний рядок там, де обидві сторони з громади.
 * @module web-admin-dev/src/pages/spending/SpendingOrgDetail
 */

import { useState } from "react";
import type { SpendingOrg } from "@wwwuabot/shared/spending";
import { contractorNames, counterparty, formatDate, formatMoney, formatCount } from "./format";
import { useSpendingDocuments, useSpendingTransactions } from "./useSpendingList";

type DetailTab = "documents" | "payer" | "recipt";

const TABS: readonly { key: DetailTab; label: string }[] = [
  { key: "documents", label: "Договори" },
  { key: "payer", label: "Сплати" },
  { key: "recipt", label: "Надходження" },
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
      <div className="spend-table-wrap">
        <table className="wb-data-table spend-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Номер</th>
              <th>Предмет</th>
              <th>Контрагенти</th>
              <th className="spend-th-num">Сума</th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((document) => (
              <tr key={document.id} className="spend-row">
                <td className="spend-date" data-label="Дата">
                  {formatDate(document.documentDate)}
                </td>
                <td data-label="Номер">{document.number || "—"}</td>
                <td className="spend-subject" data-label="Предмет">
                  {document.subject || "—"}
                </td>
                <td className="spend-subject" data-label="Контрагенти">
                  {contractorNames(document.contractors)}
                </td>
                <td className="spend-num" data-label="Сума">
                  {formatMoney(document.amount, document.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
      <div className="spend-table-wrap">
        <table className="wb-data-table spend-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>{role === "payer" ? "Отримувач" : "Платник"}</th>
              <th>Призначення</th>
              <th>КЕКВ</th>
              <th className="spend-th-num">Сума</th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((transaction) => (
              <tr key={transaction.id} className="spend-row">
                <td className="spend-date" data-label="Дата">
                  {formatDate(transaction.transDate)}
                </td>
                <td
                  className="spend-subject"
                  data-label={role === "payer" ? "Отримувач" : "Платник"}
                >
                  {counterparty(transaction, role)}
                </td>
                <td className="spend-subject" data-label="Призначення">
                  {transaction.paymentDetails || "—"}
                </td>
                <td className="spend-code" data-label="КЕКВ">
                  {transaction.kekv || "—"}
                </td>
                <td className="spend-num" data-label="Сума">
                  {formatMoney(transaction.amount, transaction.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
