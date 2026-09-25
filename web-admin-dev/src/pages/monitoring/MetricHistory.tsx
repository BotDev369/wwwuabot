/**
 * Динаміка показника по зрізах — графік без бібліотеки.
 *
 * **Чому SVG власними руками.** У панелі немає жодної чарт-бібліотеки, і
 * тягнути її заради однієї лінії означало б додати залежність, яку ніхто не
 * перевіряв на мобільному. Тут потрібні дві речі: полілінія й площа під нею —
 * це кілька рядків, і вони працюють із токенами теми (`var(--accent)`), чого
 * бібліотека не гарантує.
 *
 * **Графік показує лише `total`.** Динаміка окремого воркспейса — це вже
 * порівняння груп (окремий екран); на графіку воно перетворилось би на
 * п'ять ліній, які треба читати з легендою.
 *
 * **Рівна лінія пояснюється вголос.** Якщо всі зрізи стоять на одному коміті,
 * нульова динаміка — це правда (код не змінювався), а не поломка. Без
 * пояснення такий графік читається як «нічого не працює», і саме тут сторінка
 * мусить сказати причину.
 *
 * **Стан вибору показника живе тут, а не в панелі.** Згортання панелі не має
 * його скидати: `MonPanel` лише рендерить вміст, а `metric` — це намір
 * людини, який тримає сторінка.
 *
 * @module web-admin-dev/src/pages/monitoring/MetricHistory
 */

import { useState } from "react";
import {
  TOTAL_GROUP,
  formatMetric,
  metricDefinition,
  metricSeries,
  sameRef,
  sortPoints,
  type SnapshotPoint,
} from "@wwwuabot/shared/monitoring";
import { MonPanel } from "./MonPanel";
import { formatStamp, shortRef } from "./format";

/** Показники, які має сенс бачити лінією: гроші, обсяг і зростання. */
const SERIES_METRICS = [
  "code.lines",
  "code.size_bytes",
  "code.files",
  "github.commits",
  "github.stars",
] as const;

const WIDTH = 640;
const HEIGHT = 180;
const PAD = 14;

interface MetricHistoryProps {
  history: readonly SnapshotPoint[];
  open: boolean;
  onToggle: () => void;
}

interface Point {
  x: number;
  y: number;
}

/** Геометрія лінії: значення → координати в системі `viewBox`. */
function geometry(series: readonly number[]): Point[] {
  if (series.length === 0) return [];
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const step = series.length > 1 ? WIDTH / (series.length - 1) : 0;

  return series.map((value, index) => ({
    x: series.length > 1 ? index * step : WIDTH / 2,
    y: HEIGHT - PAD - ((value - min) / span) * (HEIGHT - PAD * 2),
  }));
}

export function MetricHistory({ history, open, onToggle }: MetricHistoryProps) {
  const [metric, setMetric] = useState<string>(SERIES_METRICS[0]);

  const ordered = sortPoints(history);
  const series = metricSeries(history, metric, TOTAL_GROUP);
  const points = geometry(series);
  const line = points
    .map((point, i) => `${i === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ");
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  // Коміт, спільний для всіх зрізів: якщо він є, нульова динаміка очікувана.
  const flatRef = series.length >= 2 ? sameRef(ordered) : null;

  return (
    <MonPanel
      title={`Динаміка: ${metricDefinition(metric)?.label ?? metric}`}
      open={open}
      onToggle={onToggle}
      tools={
        <div className="mon-chart-tools">
          {SERIES_METRICS.map((key) => (
            <button
              key={key}
              type="button"
              className={`mon-chip ${key === metric ? "mon-chip-active" : ""}`}
              onClick={() => setMetric(key)}
            >
              {metricDefinition(key)?.label ?? key}
            </button>
          ))}
        </div>
      }
    >
      {series.length < 2 ? (
        <p className="mon-chart-empty">
          Зрізів поки {series.length === 0 ? "немає" : "один"} — лінії нема з чого малювати. Другий
          зріз (ручний або за розкладом) покаже динаміку.
        </p>
      ) : (
        <svg
          className="mon-chart-svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Динаміка показника ${metricDefinition(metric)?.label ?? metric}`}
        >
          {[PAD, HEIGHT / 2, HEIGHT - PAD].map((y) => (
            <line key={y} className="mon-chart-grid" x1={0} x2={WIDTH} y1={y} y2={y} />
          ))}
          <path className="mon-chart-area" d={`${line} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z`} />
          <path className="mon-chart-line" d={line} />
          {points.map((point, index) => (
            <circle key={index} className="mon-chart-dot" cx={point.x} cy={point.y} r={3}>
              <title>{`${formatStamp(ordered[index].collectedAt)} — ${formatMetric(metric, series[index])}`}</title>
            </circle>
          ))}
        </svg>
      )}

      <div className="mon-chart-foot">
        <span>
          {first
            ? `${formatStamp(first.collectedAt)} · ${formatMetric(metric, series[0] ?? 0)}`
            : "—"}
        </span>
        <span>{series.length} зрізів</span>
        <span>
          {last
            ? `${formatStamp(last.collectedAt)} · ${formatMetric(metric, series[series.length - 1] ?? 0)}`
            : "—"}
        </span>
      </div>

      {flatRef && (
        <p className="mon-chart-note">
          Усі {series.length} зрізів знято на коміті <code>{shortRef(flatRef)}</code> — код між ними
          не змінювався, тож лінія рівна. Щойно код зміниться, наступний зріз покаже динаміку.
        </p>
      )}
    </MonPanel>
  );
}
