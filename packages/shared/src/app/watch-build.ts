/**
 * Нова збірка — новий екран: вкладка, відкрита до деплою, сама перезавантажиться.
 * SPA живе в пам'яті вкладки, тож без цього людина бачить старий код із новими
 * даними (у журналі — службовий ключ замість назви). Мітка лежить в `index.html`.
 *
 * @module @wwwuabot/shared/app/watch-build
 */

/** Мітка збірки з HTML; без неї перевіряти нічого. */
export function buildStamp(html: string): string | null {
  const match = /<meta name="x-build" content="([^"]*)"/.exec(html);
  return match?.[1] ?? null;
}

export interface WatchBuildOptions {
  /** Перевіряти лише у зібраній версії: у режимі розробки мітка змінюється щоразу. */
  enabled?: boolean;
  intervalMs?: number;
  /** Чим читати HTML — підмінюється в тесті. */
  load?: () => Promise<string>;
}

const DEFAULT_INTERVAL_MS = 60_000;

/**
 * Те, що потрібно оболонкам: нова збірка — перезавантаження вкладки.
 *
 * `enabled` передає оболонка (`import.meta.env.PROD`): у `packages/shared` типів
 * Vite немає, а другого місця, де це вирішується, бути не має.
 */
export function reloadOnNewBuild(options: WatchBuildOptions = {}): void {
  watchBuild(() => window.location.reload(), options);
}

/**
 * Стежить за міткою збірки й кличе `onStale`, коли на сервері вже інша.
 *
 * Перевірка — не таймер заради таймера: вона йде на повернення вкладки у
 * видимість (людина якраз дивиться) і рідко у фоні.
 */
export function watchBuild(onStale: () => void, options: WatchBuildOptions = {}): void {
  if (!options.enabled) return;
  const current = document.querySelector('meta[name="x-build"]')?.getAttribute("content")?.trim();
  if (!current) return;

  const load =
    options.load ?? (async () => (await fetch("/index.html", { cache: "no-store" })).text());

  const check = async (): Promise<void> => {
    try {
      const next = buildStamp(await load());
      if (next && next !== current) onStale();
    } catch {
      // Мережа мовчить — наступна перевірка спробує знову.
    }
  };

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void check();
  });
  window.setInterval(() => void check(), options.intervalMs ?? DEFAULT_INTERVAL_MS);
}
