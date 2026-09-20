import type { ReactNode } from "react";
import type { IconName } from "../icons";
import { ico } from "./badges";

/**
 * Рядок «підпис → значення» у `.wb-profile-fields`.
 *
 * Порожнє значення показує **сам рядок** (`empty`), а не ховає його: пропущений
 * рядок читався б як «такого поля немає», хоч воно є — просто без значення.
 * Тире — для наших полів (порожня роль, порожня знижка), `...` — для чужих, де
 * значення віддає не ми (розділ «Телеграм»).
 */
export function FieldRow({
  label,
  value,
  icon,
  empty = "—",
}: {
  label: string;
  value: ReactNode;
  icon?: IconName;
  empty?: string;
}) {
  return (
    <div className="wb-profile-field">
      <div className="wb-profile-label">
        {icon && ico(icon, 14)}
        <span>{label}</span>
      </div>
      <div className="wb-profile-value">{value || empty}</div>
    </div>
  );
}
