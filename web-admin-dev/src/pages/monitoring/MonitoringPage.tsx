/**
 * Сторінка моніторингу: зріз, динаміка, розбивка й історія.
 *
 * Сторінка лише рендерить (AGENTS.md §3): стан і запити — у `useMonitoring`,
 * підписи й класи — у `format`, панелі показників — `ScopePanel`, графік і
 * таблиці — окремі компоненти.
 *
 * Список карток тут **не перелічується**: склад кожної теми бере `ScopePanel`
 * із реєстру показників. Перелік у розмітці розійшовся б із реєстром на
 * першому ж новому показнику — і зібрані числа лишались би невидимими.
 *
 * Честність важливіша за вигляд: якщо токена GitHub немає, це сказано прямо,
 * а частковий зріз позначений бейджем — число з нього не можна читати як повне.
 *
 * @module web-admin-dev/src/pages/monitoring/MonitoringPage
 */

import { PageTopbar } from "../../layout/PageTopbar";
import { Icon } from "@wwwuabot/shared";
import { TOTAL_GROUP, diffSnapshots, groupValues } from "@wwwuabot/shared/monitoring";
import { CollectorReportList } from "./CollectorReportList";
import { MetricHistory } from "./MetricHistory";
import { ScopePanel } from "./ScopePanel";
import { SnapshotHistory } from "./SnapshotHistory";
import { WorkspaceTable } from "./WorkspaceTable";
import { formatRelative, formatStamp, statusClass, statusLabel } from "./format";
import { useMonitoring } from "./useMonitoring";

export function MonitoringPage() {
  const { summary, loading, collecting, error, collect } = useMonitoring();
  const latest = summary?.latest ?? null;
  const previous = summary?.previous ?? null;

  const totals = latest ? groupValues(latest.values, TOTAL_GROUP) : {};
  const deltas = diffSnapshots(latest, previous);

  return (
    <>
      <PageTopbar>
        <h1 className="wb-topbar-title">Моніторинг</h1>
        <div className="wb-topbar-right">
          {latest && <span className="mon-stamp">зріз {formatRelative(latest.collectedAt)}</span>}
          <button className="wb-btn wb-btn-primary" onClick={collect} disabled={collecting}>
            {collecting ? "Збираю..." : "Зібрати зріз"}
          </button>
        </div>
      </PageTopbar>

      <section className="mon">
        {error && <div className="wb-badge wb-badge-red">{error}</div>}

        {summary && !summary.sources.githubTokenConfigured && (
          <div className="mon-note">
            <Icon name="info" size={16} />
            <span>
              Токен GitHub не доданий — репозиторій <code>{summary.sources.repo}</code> читається
              анонімно (60 запитів/год). Для приватного репо додай секрет{" "}
              <code>GITHUB_MONITOR_TOKEN</code> на воркері <code>api-dev</code>. Розклад збору:{" "}
              <code>{summary.sources.cronSchedule ?? "—"}</code> (UTC).
            </span>
          </div>
        )}

        {loading ? (
          <div className="empty-state">
            <span className="empty-state-text">Завантаження...</span>
          </div>
        ) : !latest ? (
          <div className="empty-state">
            <span className="empty-state-text">
              Зрізів ще немає. Перший зріз створить поточні показники коду, запише їх у KV і D1 —
              далі кожен новий зріз додає динаміку.
            </span>
            <button className="wb-btn wb-btn-primary" onClick={collect} disabled={collecting}>
              {collecting ? "Збираю..." : "Зібрати перший зріз"}
            </button>
          </div>
        ) : (
          <>
            <div className="mon-status-line">
              <span className={`mon-status ${statusClass(latest.status)}`}>
                {statusLabel(latest.status)}
              </span>
              <span className="mon-collector-meta">
                {formatStamp(latest.collectedAt)} · {latest.values.length} значень · коміт{" "}
                {latest.ref ? latest.ref.slice(0, 7) : "—"}
              </span>
            </div>

            <ScopePanel scope="code" title="Код" values={totals} deltas={deltas} />
            <ScopePanel scope="github" title="Репозиторій" values={totals} deltas={deltas} />

            <MetricHistory history={summary?.history ?? []} />

            <div className="mon-columns">
              <div className="mon-panel">
                <div className="mon-panel-head">
                  <span className="mon-panel-title">Розбивка по воркспейсах</span>
                </div>
                <div className="mon-panel-body">
                  <WorkspaceTable values={latest.values} />
                </div>
              </div>

              <div className="mon-panel">
                <div className="mon-panel-head">
                  <span className="mon-panel-title">Збір</span>
                </div>
                <div className="mon-panel-body">
                  <CollectorReportList collectors={latest.collectors} />
                </div>
              </div>
            </div>

            <div className="mon-panel">
              <div className="mon-panel-head">
                <span className="mon-panel-title">Історія зрізів</span>
              </div>
              <div className="mon-panel-body">
                <SnapshotHistory history={summary?.history ?? []} />
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}
