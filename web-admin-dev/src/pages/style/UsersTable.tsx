/**
 * Таблиця демо: 14 стовпців × 60 рядків.
 *
 * **Гортається сама.** Висота обмежена, тож сторінка їде далі, коли курсор
 * усередині таблиці; шапка й перший стовпець закріплені.
 *
 * @module web-admin-dev/src/pages/style/UsersTable
 */

import type { ReactElement } from "react";
import { COLUMN_TONES, DEMO_USERS } from "./demo-content";
import demo from "./demo.json";

export function UsersTable(): ReactElement {
  const { table } = demo;
  return (
    <section className="sc-section">
      <div className="sc-sect-head">
        <h3 className="sc-sect-title">{table.title}</h3>
        <span className="sc-sect-note">{table.note}</span>
      </div>

      <div className="sc-table-wrap">
        <table className="sc-table">
          <caption className="sc-demo-note">{table.caption}</caption>
          <thead>
            <tr>
              {table.columns.map((column, index) => (
                <th
                  key={column}
                  scope="col"
                  className={index === 0 ? "sc-table-pin" : `sc-col-${COLUMN_TONES[index] ?? 1}`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DEMO_USERS.map((user) => (
              <tr key={user.handle}>
                <td className="sc-table-pin">
                  <span className="sc-user">
                    <span className="sc-avatar">{user.lead.slice(0, 1)}</span>
                    {user.lead}
                  </span>
                </td>
                <td className="sc-mono">{user.handle}</td>
                <td className="sc-mono">{user.telegram}</td>
                <td>{user.role}</td>
                <td>{user.plan}</td>
                <td>
                  <span className={`wb-badge ${user.statusTone}`}>{user.status}</span>
                </td>
                <td>{user.access}</td>
                <td>{user.city}</td>
                <td className="sc-mono">{user.trackers}</td>
                <td className="sc-mono">{user.entries}</td>
                <td className="sc-mono">{user.notes}</td>
                <td className="sc-mono">{user.lastSeen}</td>
                <td className="sc-mono">{user.created}</td>
                <td>
                  <button
                    type="button"
                    className="wb-btn wb-btn-ghost wb-btn-sm"
                    aria-label={`${table.action}: ${user.lead}`}
                  >
                    {table.action}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
