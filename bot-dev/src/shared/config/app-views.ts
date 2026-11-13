/**
 * Головний віджет — один HTML-документ із видами всередині.
 *
 * Bot API міняє лише стан віджета (`editMessageWidgetData`), не HTML. Тому
 * екран бренду — один документ, а вид перемикається полем `v` у `chat_data`.
 *
 * @module bot-dev/src/shared/config/app-views
 */

/** Ключ сценарію, у якому лежить документ. */
export const APP_LOOKUP = "/start";

/** Види документа: старт, «Про платформу», «Зв’язок». */
export const APP_VIEWS = ["start", "about", "contacts"] as const;

export type AppView = (typeof APP_VIEWS)[number];

/** Чи це вид головного віджета — тобто навігація, а не окремий сценарій. */
export function isAppView(value: string): value is AppView {
  return (APP_VIEWS as readonly string[]).includes(value);
}

/** Початковий стан віджета для виду. */
export function appChatData(view: AppView): string {
  return JSON.stringify({ v: view });
}
