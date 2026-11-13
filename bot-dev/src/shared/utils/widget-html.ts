/**
 * Підстановка адреси платформи в HTML віджета.
 *
 * У документі стоїть маркер `__PLATFORM__`, а справжня адреса — у
 * `WEB_PLATFORM_URL`: сценарій у базі не тримає домену.
 * @module bot-dev/src/shared/utils/widget-html
 */

const MARKER = "__PLATFORM__";

/** HTML із підставленою адресою. Без адреси маркер зникає: плитки неактивні. */
export function applyPlatformUrl(html: string, platformUrl?: string | null): string {
  return html.split(MARKER).join(platformUrl ? platformUrl.replace(/\/+$/, "") : "");
}
