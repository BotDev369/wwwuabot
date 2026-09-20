import type { ReactNode } from "react";
import type { IconName } from "../icons";
import { ico } from "./badges";

/**
 * Рядок «підпис → значення» у `.wb-profile-fields`.
 *
 * Порожнє значення показує **сам рядок** («—»), а не ховає його: у наших полях
 * (роль, знижка, права) пропущений рядок не відрізниш від помилки. Там, де
 * порожніх рядків багато й вони не наші — картка Telegram, — їх просто не
 * створюють (`telegram-fields.ts`), тож окремого тексту для них не потрібно.
 */
export function FieldRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon?: IconName;
}) {
  return (
    <div className="wb-profile-field">
      <div className="wb-profile-label">
        {icon && ico(icon, 14)}
        <span>{label}</span>
      </div>
      <div className="wb-profile-value">{value || "—"}</div>
    </div>
  );
}
