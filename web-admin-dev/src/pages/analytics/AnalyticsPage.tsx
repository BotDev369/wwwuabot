/**
 * «Аналітика» — поведінка людей у боті й на платформі.
 *
 * Два режими того самого журналу: по користувачах (акордеон із діями людини)
 * і за часом (суцільний список). Діапазон у них спільний — `docs/EVENTS.md`.
 *
 * @module web-admin-dev/src/pages/analytics/AnalyticsPage
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { formatStamp } from "@wwwuabot/shared/utils/datetime";
import { PageTopbar } from "../../layout/PageTopbar";
import { EVENT_PRESETS, userLabel, userMeta } from "./analytics-view";
import { EventRows } from "./EventRows";
import { useAnalytics } from "./useAnalytics";

export function AnalyticsPage(): ReactElement {
  const a = useAnalytics();
  const users = a.summary?.users ?? [];

  return (
    <>
      <PageTopbar>
        <div className="wb-topbar-left">
          <h1 className="wb-topbar-title">Аналітика</h1>
        </div>
        <div className="wb-topbar-right">
          <div className="ana-mode" role="tablist" aria-label="Режим перегляду">
            <button
              type="button"
              role="tab"
              aria-selected={a.mode === "users"}
              className={`ana-mode-btn${a.mode === "users" ? " ana-mode-btn--active" : ""}`}
              onClick={() => a.setMode("users")}
            >
              По користувачах
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={a.mode === "time"}
              className={`ana-mode-btn${a.mode === "time" ? " ana-mode-btn--active" : ""}`}
              onClick={() => a.setMode("time")}
            >
              За часом
            </button>
          </div>
          <button
            type="button"
            className="wb-btn wb-btn-secondary"
            onClick={a.reload}
            disabled={a.loading}
          >
            <Icon name="refresh" size={14} /> Оновити
          </button>
        </div>
      </PageTopbar>

      <div className="ana-page">
        <section className="ana-range" aria-label="Діапазон дат">
          <label className="ana-field">
            <span className="ana-label">Від</span>
            <input
              className="ana-input"
              type="datetime-local"
              value={a.fromInput}
              onChange={(event) => a.setFromInput(event.target.value)}
            />
          </label>
          <label className="ana-field">
            <span className="ana-label">До</span>
            <input
              className="ana-input"
              type="datetime-local"
              value={a.toInput}
              onChange={(event) => a.setToInput(event.target.value)}
            />
          </label>
          <button type="button" className="wb-btn wb-btn-primary" onClick={a.applyRange}>
            Застосувати
          </button>
          <div className="ana-presets">
            {EVENT_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                className="ana-preset"
                onClick={() => a.applyPreset(preset.hours)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </section>

        {a.error && (
          <p className="ana-error" role="alert">
            {a.error}
          </p>
        )}

        {a.loading && !a.summary && <p className="ana-loading">Завантаження журналу…</p>}

        {a.summary && (
          <>
            <div className="ana-stats">
              <div className="ana-stat">
                <span className="ana-stat-value">{a.summary.total}</span>
                <span className="ana-stat-label">подій</span>
              </div>
              <div className="ana-stat">
                <span className="ana-stat-value">{a.summary.users.length}</span>
                <span className="ana-stat-label">людей</span>
              </div>
              <div className="ana-stat">
                <span className="ana-stat-value">{a.summary.bySurface.bot}</span>
                <span className="ana-stat-label">у боті</span>
              </div>
              <div className="ana-stat">
                <span className="ana-stat-value">{a.summary.bySurface.platform}</span>
                <span className="ana-stat-label">на платформі</span>
              </div>
            </div>

            {a.mode === "users" ? (
              <ul className="ana-users">
                {users.length === 0 && <li className="ana-empty">Подій за цей час немає</li>}
                {users.map((user) => {
                  const open = a.expandedUserId === user.userId;
                  const items = a.userEvents[user.userId] ?? [];
                  const total = a.userTotals[user.userId] ?? 0;
                  return (
                    <li className="ana-user" key={user.userId}>
                      <button
                        type="button"
                        className="ana-user-head"
                        aria-expanded={open}
                        onClick={() => void a.toggleUser(user.userId)}
                      >
                        <span className="ana-user-name">{userLabel(user)}</span>
                        <span className="ana-user-meta">{userMeta(user)}</span>
                        <span className="ana-user-last">{formatStamp(user.lastAt)}</span>
                        <span className="ana-user-count" title="подій за діапазон">
                          {user.count}
                        </span>
                        <Icon name={open ? "chevron-down" : "chevron-right"} size={16} />
                      </button>

                      {open && (
                        <div className="ana-user-body">
                          {a.loadingUser === user.userId ? (
                            <p className="ana-loading">Завантаження дій…</p>
                          ) : (
                            <>
                              <EventRows events={items} showUser={false} />
                              {total > items.length && (
                                <p className="ana-note">
                                  Показано перші {items.length} з {total} — звузьте діапазон.
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <>
                <EventRows events={a.events} />
                {a.events.length < a.listTotal && (
                  <button
                    type="button"
                    className="wb-btn wb-btn-secondary ana-more"
                    onClick={() => void a.loadMore()}
                    disabled={a.loadingMore}
                  >
                    {a.loadingMore ? "Завантаження…" : "Показати ще"}
                  </button>
                )}
                <p className="ana-note">
                  Показано {a.events.length} з {a.listTotal}
                </p>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
