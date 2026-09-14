import type { ReactNode } from "react";
import type { IconName } from "../icons";
import { ico } from "./badges";

/** Рядок «підпис → значення» у `.wb-profile-fields`. Порожнє значення — «—». */
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
