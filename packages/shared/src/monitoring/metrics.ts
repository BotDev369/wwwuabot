/**
 * Реєстр показників моніторингу — **перший зріз: код і репозиторій**.
 *
 * Це файл даних: ключ, підпис, одиниця, напрямок. Жодної логіки збору тут
 * немає (вона в `api-dev`), а жодного числа — тим паче: числа друкує сам зріз.
 *
 * **Навіщо реєстр, а не підписи в розмітці.** Сторінка малює будь-який
 * показник із цього списку: щоб додати новий (D1, KV, R2, воркери), треба
 * дописати рядок сюди й колектор у `api-dev` — розмітку правити не потрібно,
 * і підпис не може розійтися з ключем, бо він один.
 *
 * **Ключ — це адреса, а не текст.** Формат `scope.metric`: перша частина
 * каже, **звідки** число (код у репозиторії чи API GitHub), друга — що саме
 * виміряно. Так `code.size_bytes` і `github.repo_size_bytes` (оцінка самого
 * GitHub) не плутаються, хоч обидва — «розмір».
 *
 * @module @wwwuabot/shared/monitoring/metrics
 */

/** Одиниця показника: від неї залежить форматування. */
export type MetricUnit = "bytes" | "lines" | "count";

/** Звідки показник. */
export type MetricScope = "code" | "github" | "cloudflare";

/**
 * Куди дивитись на зміну.
 *
 * `neutral` — не «байдуже», а `ми не домовлялись, що більше = краще`:
 * зростання коду чи кількості відкритих issue не є ні добром, ні бідою, і
 * фарбувати його зеленим означало б вигадувати оцінку, якої ніхто не давав.
 */
export type MetricTrend = "neutral" | "up" | "down";

export interface MetricDefinition {
  /** Адреса показника в зрізі (`code.lines`). */
  readonly key: string;
  readonly label: string;
  readonly unit: MetricUnit;
  readonly scope: MetricScope;
  /** Чи має показник розбивку по групах (воркспейсах), крім `total`. */
  readonly grouped: boolean;
  readonly trend: MetricTrend;
  /** Одним рядком: що саме пораховано — щоб число не читалось як «щось». */
  readonly hint: string;
}

const REGISTRY: readonly MetricDefinition[] = [
  {
    key: "code.size_bytes",
    label: "Розмір коду",
    unit: "bytes",
    scope: "code",
    grouped: true,
    trend: "neutral",
    hint: "Сума байтів файлів, які ми написали (без lock-файлів, збірок і залежностей).",
  },
  {
    key: "code.lines",
    label: "Рядків усього",
    unit: "lines",
    scope: "code",
    grouped: true,
    trend: "neutral",
    hint: "Усі рядки тих самих файлів: код, коментарі й порожні.",
  },
  {
    key: "code.code_lines",
    label: "Рядків коду",
    unit: "lines",
    scope: "code",
    grouped: true,
    trend: "neutral",
    hint: "Рядки без коментарів і без порожніх — те, що реально читає компілятор.",
  },
  {
    key: "code.comment_lines",
    label: "Рядків коментарів",
    unit: "lines",
    scope: "code",
    grouped: true,
    trend: "neutral",
    hint: "Рядки, перший значущий вміст яких належить коментарю (`//`, `#`, `--`, `/* */`).",
  },
  {
    key: "code.blank_lines",
    label: "Порожніх рядків",
    unit: "lines",
    scope: "code",
    grouped: true,
    trend: "neutral",
    hint: "Рядки без жодного символу, крім пробілів і табуляцій.",
  },
  {
    key: "code.files",
    label: "Файлів",
    unit: "count",
    scope: "code",
    grouped: true,
    trend: "neutral",
    hint: "Скільки файлів ураховано в показниках вище (двійкові не рахуються).",
  },
  {
    key: "github.repo_size_bytes",
    label: "Розмір за GitHub",
    unit: "bytes",
    scope: "github",
    grouped: false,
    trend: "neutral",
    hint: "Оцінка репозиторію самим GitHub — з нею `code.size_bytes` розходиться (GitHub рахує і lock-файли).",
  },
  {
    key: "github.commits",
    label: "Комітів",
    unit: "count",
    scope: "github",
    grouped: false,
    trend: "up",
    hint: "Усього комітів у гілці за замовчуванням.",
  },
  {
    key: "github.contributors",
    label: "Авторів",
    unit: "count",
    scope: "github",
    grouped: false,
    trend: "up",
    hint: "Скільки людей мають бодай один коміт (анонімні автори GitHub рахуються окремо ним самим).",
  },
  {
    key: "github.stars",
    label: "Зірок",
    unit: "count",
    scope: "github",
    grouped: false,
    trend: "up",
    hint: "Скільки людей додали репозиторій у зірки.",
  },
  {
    key: "github.forks",
    label: "Форків",
    unit: "count",
    scope: "github",
    grouped: false,
    trend: "up",
    hint: "Кількість копій репозиторію.",
  },
  {
    key: "github.watchers",
    label: "Спостерігачів",
    unit: "count",
    scope: "github",
    grouped: false,
    trend: "up",
    hint: "Ті, хто стежить за репозиторієм (`subscribers`).",
  },
  {
    key: "github.open_issues",
    label: "Відкритих issue",
    unit: "count",
    scope: "github",
    grouped: false,
    trend: "neutral",
    hint: "Відкриті issue **без** pull request'ів: GitHub сам їх не розділяє, тому віднімаємо.",
  },
  {
    key: "github.open_pulls",
    label: "Відкритих PR",
    unit: "count",
    scope: "github",
    grouped: false,
    trend: "neutral",
    hint: "Відкриті pull request'и.",
  },
];

/** Усі показники зрізу — джерело правди для сторінки й для колекторів. */
export const METRICS: readonly MetricDefinition[] = REGISTRY;

/** Той самий реєстр за ключем — щоб розмітка не шукала по списку. */
export const METRIC_BY_KEY: Readonly<Record<string, MetricDefinition>> = Object.fromEntries(
  REGISTRY.map((metric) => [metric.key, metric]),
);

/** Показники однієї теми (`code`, `github`, …) — для груп на сторінці. */
export function metricsOfScope(scope: MetricScope): MetricDefinition[] {
  return REGISTRY.filter((metric) => metric.scope === scope);
}

export function metricDefinition(key: string): MetricDefinition | undefined {
  return METRIC_BY_KEY[key];
}

/**
 * Число в рядок — українською, з розділювачем розрядів.
 *
 * Дробові значення не округлюються «до цілого» навмання: показники бувають
 * дробовими (відсотки, середні), тож додаємо знак лише коли він є.
 */
export function formatNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return rounded.toLocaleString("uk-UA", { maximumFractionDigits: 2 });
}

/** Байти у звичні одиниці: `Б`, `КБ`, `МБ`, `ГБ` — з комою як десятковим знаком. */
export function formatBytes(value: number): string {
  const abs = Math.abs(value);
  if (abs < 1024) return `${formatNumber(value)} Б`;
  if (abs < 1024 ** 2) return `${formatNumber(value / 1024)} КБ`;
  if (abs < 1024 ** 3) return `${formatNumber(value / 1024 ** 2)} МБ`;
  return `${formatNumber(value / 1024 ** 3)} ГБ`;
}

/** Значення показника для людини: число, рядки чи байти — за реєстром. */
export function formatMetric(key: string, value: number): string {
  const unit = METRIC_BY_KEY[key]?.unit;
  if (unit === "bytes") return formatBytes(value);
  return formatNumber(value);
}

/** Зміну показника — тим самим форматуванням, але зі знаком (або без). */
export function formatDelta(key: string, delta: number): string {
  if (delta === 0) return "0";
  const sign = delta > 0 ? "+" : "−";
  return `${sign}${formatMetric(key, Math.abs(delta))}`;
}
