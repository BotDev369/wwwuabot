/**
 * «Аналітика» — поведінка людей у боті й на платформі.
 *
 * Два режими того самого журналу: по користувачах (акордеон із діями людини)
 * і за часом (суцільний список). Діапазон у них спільний — `docs/EVENTS.md`.
 *
 * Дії екрана стоять одним рядком у шапці: режими, «Оновити» і «Очистити»
 * (знаки, бо підпис тут дорожчий за місце списку), а період — окремим рядом
 * чипів під ним.
 *
 * @module web-admin-dev/src/pages/analytics/AnalyticsPage
 */

import type { ReactElement } from "react";
import { Icon, SwitchRow } from "@wwwuabot/shared";
import { formatStamp } from "@wwwuabot/shared/utils/datetime";
import { PageTopbar } from "../../layout/PageTopbar";
import { EVENT_PRESETS, clockStamp, userLabel, userMeta } from "./analytics-view";
import { CleanupModal } from "./CleanupModal";
import { EventRows } from "./EventRows";
import { RangeModal } from "./RangeModal";
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
              <Icon name="user" size={14} /> По користувачах
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={a.mode === "time"}
              className={`ana-mode-btn${a.mode === "time" ? " ana-mode-btn--active" : ""}`}
              onClick={() => a.setMode("time")}
            >
              <Icon name="clock" size={14} /> За часом
            </button>
          </div>
          <button
            type="button"
            className="wb-btn wb-btn-secondary ana-icon-btn"
            onClick={a.reload}
            disabled={a.loading}
            aria-busy={a.loading}
            aria-label={a.loading ? "Оновлюю…" : "Оновити"}
            title="Оновити"
          >
            <Icon name="refresh" size={16} />
          </button>
          <button
            type="button"
            className="wb-btn wb-btn-secondary ana-icon-btn"
            onClick={a.openCleanup}
            aria-label="Очистити журнал"
            title="Очистити журнал"
          >
            <Icon name="trash" size={16} />
          </button>
        </div>
      </PageTopbar>

      <div className="ana-page">
        <section className="ana-periods" aria-label="Період">
          {EVENT_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              aria-pressed={a.period === preset.key}
              className={`ana-preset${a.period === preset.key ? " ana-preset--active" : ""}`}
              onClick={() => a.applyPreset(preset.key)}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={a.period === "period"}
            className={`ana-preset${a.period === "period" ? " ana-preset--active" : ""}`}
            onClick={a.openRange}
          >
            <Icon name="calendar" size={13} /> Період
          </button>
        </section>

        {a.updatedAt !== null && !a.loading && (
          <p className="ana-updated" role="status">
            оновлено о {clockStamp(a.updatedAt)}
          </p>
        )}

        <section className="ana-settings" aria-label="Налаштування журналу">
          <SwitchRow
            label="Сквозна деталізація"
            hint="Дії: кнопки, вкладки, картки й вибір у полях — а не лише сторінки й модалки"
            checked={a.fullLogging}
            disabled={a.savingSettings}
            onToggle={(next) => void a.setFullLogging(next)}
          />
        </section>

        {a.error && (
          <p className="ana-error" role="alert">
            {a.error}
          </p>
        )}

        {a.loading && !a.summary && <p className="ana-loading">Завантаження журналу…</p>}

        {a.summary && (
          <>
            {/* Зведення — один рядок: питання «скільки всього» ставлять раз, а
                місце потрібне списку. Підпис під числом замінено знаком із
                підказкою. */}
            <section className="ana-summary" aria-label="Аналітика">
              <h2 className="ana-summary-title">Аналітика</h2>
              <span className="ana-stat" title="подій">
                <Icon name="pulse" size={14} />
                <span className="ana-stat-value">{a.summary.total}</span>
              </span>
              <span className="ana-stat" title="людей">
                <Icon name="users" size={14} />
                <span className="ana-stat-value">{a.summary.users.length}</span>
              </span>
              <span className="ana-stat" title="у боті">
                <Icon name="bot" size={14} />
                <span className="ana-stat-value">{a.summary.bySurface.bot}</span>
              </span>
              <span className="ana-stat" title="на платформі">
                <Icon name="mobile" size={14} />
                <span className="ana-stat-value">{a.summary.bySurface.platform}</span>
              </span>
            </section>

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

      {a.rangeOpen && (
        <RangeModal
          from={a.rangeInput.from}
          to={a.rangeInput.to}
          onApply={a.applyRange}
          onClose={a.closeRange}
        />
      )}

      {a.cleanupOpen && (
        <CleanupModal range={a.range} onClose={a.closeCleanup} onDeleted={a.reload} />
      )}
    </>
  );
}
