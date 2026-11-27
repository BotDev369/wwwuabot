/**
 * Код помилки з API — не повідомлення: `tenant_not_found` і `lookup_taken`
 * перекладаються тут, в одному місці для обох контентних екранів.
 *
 * @module web-admin-dev/src/pages/tenant/content-errors
 */

import labels from "./project-labels.json";

/** Зрозуміле повідомлення; невідомий код лишається як є — він хоч щось каже. */
export function contentErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  switch (raw) {
    case "tenant_not_found":
    case "tenant_forbidden":
      return labels.projectUnavailable;
    case "invalid_tenant_key":
      return labels.invalidKey;
    case "lookup_taken":
      return labels.lookupTaken;
    default:
      return raw;
  }
}
