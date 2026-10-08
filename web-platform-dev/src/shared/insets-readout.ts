/**
 * Смужка з числами вставок клієнта — **тимчасовий інструмент**, не частина
 * продукту: він потрібен, щоб побачити, які числа Telegram віддає на
 * конкретному телефоні (частину з них клієнт шле як `0` — див.
 * `docs/PLATFORM.md`, «Екран і хром»), а видно їх лише з телефона. Стоїть
 * **унизу**, бо вгорі заступав би саме те місце, яке діагностує, і знімається
 * першим дотиком.
 */
import type { TelegramWebApp } from "@wwwuabot/shared/types/telegram";

const REPAINT_MS = 1000;
const REPAINT_COUNT = 8;

function num(value: unknown): string {
  return typeof value === "number" ? String(Math.round(value)) : "?";
}

function px(value: string): string {
  return value.trim() || "—";
}

/** Одне зведення: що клієнт прислав і де насправді стоїть наш хедер. */
function report(app: TelegramWebApp): string {
  const root = getComputedStyle(document.documentElement);
  const appbar = document.querySelector(".wb-appbar");
  const top = appbar ? Math.round(appbar.getBoundingClientRect().top) : -1;
  return [
    `tg: ${app?.platform ?? "?"} full=${String(app?.isFullscreen)} v=${px(root.getPropertyValue("--safe-top"))}`,
    `safeArea t=${num(app?.safeAreaInset?.top)} b=${num(app?.safeAreaInset?.bottom)}`,
    `content t=${num(app?.contentSafeAreaInset?.top)} b=${num(app?.contentSafeAreaInset?.bottom)}`,
    `client t=${px(root.getPropertyValue("--client-inset-top"))} b=${px(root.getPropertyValue("--client-inset-bottom"))}`,
    `vp=${window.innerHeight} screen=${window.screen.height} dpr=${window.devicePixelRatio}`,
    `appbar.top=${top}`,
  ].join("\n");
}

/**
 * Ставить смужку на екран, якщо в ньому є Telegram WebApp; без нього (браузер,
 * тест) — no-op. Перші проходи повторюються: клієнт заповнює вставки не одразу.
 */
export function mountInsetsReadout(): void {
  if (typeof document === "undefined") return;
  const app = window.Telegram?.WebApp;
  if (!app || !document.body) return;

  const box = document.createElement("pre");
  box.style.cssText =
    "position:fixed;left:0;right:0;bottom:0;z-index:2147483647;margin:0;" +
    "padding:6px 8px;background:rgba(0,0,0,.82);color:#7dff7d;" +
    "font:11px/1.4 ui-monospace,monospace;white-space:pre-wrap;pointer-events:none";
  box.textContent = report(app);
  document.body.appendChild(box);

  let ticks = 0;
  const timer = setInterval(() => {
    box.textContent = report(app);
    if (++ticks >= REPAINT_COUNT) window.clearInterval(timer);
  }, REPAINT_MS);

  const drop = () => {
    window.clearInterval(timer);
    box.remove();
  };
  for (const event of ["touchstart", "pointerdown", "click", "keydown"]) {
    window.addEventListener(event, drop, { once: true, passive: true });
  }
}
