/**
 * «Аналітика» — журнал дій людей у боті й на платформі: два режими, спільний
 * діапазон. Шапка — три ряди одного закріпленого блока (назва з діями,
 * зведення, період), між ними немає шва. Правила — `docs/EVENTS.md`.
 *
 * @module web-admin-dev/src/pages/analytics/AnalyticsPage
 */

import type { ReactElement } from "react";
import { Icon, type IconName } from "@wwwuabot/shared";
import { formatStamp } from "@wwwuabot/shared/utils/datetime";
import { EVENT_PRESETS, clockStamp, userLabel, userMeta } from "./analytics-view";
import { CleanupModal } from "./CleanupModal";
import { EventRows } from "./EventRows";
import { RangeModal } from "./RangeModal";
import { useAnalytics } from "./useAnalytics";

/** Зведення: одна смуга, чотири рівні клітинки — число й знак, підпис у підказці. */
interface StatCell {
  key: string;
  icon: IconName;
  hint: string;
  value: number | undefined;
}

export function AnalyticsPage(): ReactElement {
  const a = useAnalytics();
  const users = a.summary?.users ?? [];

  const stats: StatCell[] = [
    { key: "events", icon: "pulse", hint: "подій", value: a.summary?.total },
    { key: "users", icon: "users", hint: "людей", value: a.summary?.users?.length },
    { key: "bot", icon: "bot", hint: "у боті", value: a.summary?.bySurface?.bot },
    {
      key: "platform",
      icon: "mobile",
      hint: "на платформі",
      value: a.summary?.bySurface?.platform,
    },
  ];

  return (
    <>
      <div className="ana-page">
        <header className="ana-pinned">
          <div className="ana-head">
            {/* Матеріал задає `h1` 400 — назва екрана мусить переважати числа
                зведення, тож вага живе на вкладеному вузлі. */}
            <h1 className="wb-page-title">
              <span className="ana-head-title">Аналітика</span>
            </h1>
            <div className="ana-actions">
              {/* Режими — знаки: підпис читається з підказки й `aria-label`, а
                  місце лишається списку. */}
              <div className="ana-mode" role="tablist" aria-label="Режим перегляду">
                <button
                  type="button"
                  role="tab"
                  aria-selected={a.mode === "users"}
                  aria-label="По користувачах"
                  title="По користувачах"
                  className={`ana-mode-btn${a.mode === "users" ? " ana-mode-btn--active" : ""}`}
                  onClick={() => a.setMode("users")}
                >
                  <Icon name="user" size={16} />
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={a.mode === "time"}
                  aria-label="За часом"
                  title="За часом"
                  className={`ana-mode-btn${a.mode === "time" ? " ana-mode-btn--active" : ""}`}
                  onClick={() => a.setMode("time")}
                >
                  <Icon name="clock" size={16} />
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
          </div>

          <div className="ana-stats" role="group" aria-label="Зведення за діапазон">
            {stats.map((stat) => (
              <span
                key={stat.key}
                className="ana-stat"
                title={stat.hint}
                aria-label={`${stat.hint}: ${stat.value ?? "немає даних"}`}
              >
                <Icon name={stat.icon} size={16} />
                <span className="ana-stat-value">{stat.value ?? "—"}</span>
              </span>
            ))}
          </div>

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
        </header>

        <div className="ana-body">
          {a.updatedAt !== null && !a.loading && (
            <p className="ana-updated" role="status">
              оновлено о {clockStamp(a.updatedAt)}
            </p>
          )}

          {a.error && (
            <p className="ana-error" role="alert">
              {a.error}
            </p>
          )}

          {a.loading && !a.summary && <p className="ana-loading">Завантаження журналу…</p>}

          {a.summary &&
            (a.mode === "users" ? (
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
                        onClick={() => a.toggleUser(user.userId)}
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
            ))}
        </div>
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
