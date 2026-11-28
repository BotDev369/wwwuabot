/**
 * Підпис «глобально» на екранах, які не належать жодному проєкту.
 *
 * @module web-admin-dev/src/pages/tenant/GlobalScopeBadge
 */

import labels from "./project-labels.json";

interface GlobalScopeBadgeProps {
  /** `personal` — власний профіль адміна; типово — дані всієї платформи. */
  kind?: "platform" | "personal";
}

export function GlobalScopeBadge({ kind = "platform" }: GlobalScopeBadgeProps) {
  const personal = kind === "personal";
  return (
    <span className="wb-count" title={personal ? labels.personalHint : labels.globalHint}>
      {personal ? labels.personal : labels.global}
    </span>
  );
}
