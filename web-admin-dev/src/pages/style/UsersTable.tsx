/**
 * Таблиця демо: 14 стовпців × 60 рядків.
 *
 * **Гортається сама.** Висота обмежена, тож сторінка їде далі, коли курсор
 * усередині таблиці; шапка й перший стовпець закріплені — видно, чий це рядок
 * і що в колонці, навіть після прокрутки вбік.
 *
 * @module web-admin-dev/src/pages/style/UsersTable
 */

import type { ReactElement } from "react";
import { DEMO_USERS, USER_COLUMNS, USER_COLUMN_TONES } from "./demo-content";

const STATUS_TONE: Record<string, string> = {
  Активний: "wb-badge-green",
  Запрошено: "wb-badge-yellow",
  Заблоковано: "wb-badge-red",
  Чернетка: "wb-badge-neutral",
};

export function UsersTable(): ReactElement {
  return (
    <section className="sc-section">
      <div className="sc-sect-head">
        <h3 className="sc-sect-title">Люди платформи</h3>
        <span className="sc-sect-note">
          14 стовпців · 60 рядків · шапка й перший стовпець закріплені
        </span>
      </div>

      <div className="sc-table-wrap">
        <table className="sc-table">
          <caption className="sc-demo-note">
            Дані вигадані: таблиця показує поведінку поверхні, а не базу.
          </caption>
          <thead>
            <tr>
              {USER_COLUMNS.map((column, index) => (
                <th
                  key={column}
                  scope="col"
                  className={
                    index === 0 ? "sc-table-pin" : `sc-col-${USER_COLUMN_TONES[index] ?? 1}`
                  }
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
                  <span className={`wb-badge ${STATUS_TONE[user.status] ?? "wb-badge-neutral"}`}>
                    {user.status}
                  </span>
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
                    aria-label={`Дії: ${user.lead}`}
                  >
                    Відкрити
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
