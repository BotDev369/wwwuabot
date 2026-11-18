/**
 * Каталог ролей: категорія → роль → колір, розмір, відступ, рух.
 *
 * Це головний доказ правила: сторінка не описує вигляд, вона бере роль.
 *
 * @module web-admin-dev/src/pages/style/RoleCatalogSection
 */

import type { ReactElement } from "react";
import {
  ROLE_CATEGORIES,
  roleClass,
  rolesIn,
  type StyleRole,
} from "@wwwuabot/shared/ui/role-catalog";

function RoleCard({ role }: { role: StyleRole }): ReactElement {
  return (
    <article className="sc-role-card">
      <span className={roleClass(role)}>{role.label}</span>
      <span className="sc-role-note">{role.note}</span>
      <div className="sc-role-tokens">
        <span className="sc-token">{role.tone}</span>
        <span className="sc-token">{role.size}</span>
        <span className="sc-token">{role.space}</span>
        <span className="sc-token">{role.motion}</span>
        <span className="sc-token">{role.radius}</span>
      </div>
    </article>
  );
}

export function RoleCatalogSection(): ReactElement {
  return (
    <section className="sc-section">
      <div className="sc-sect-head">
        <h3 className="sc-sect-title">Каталог ролей</h3>
        <span className="sc-sect-note">
          колір, розмір, відступ, рух і радіус задає роль — не сторінка
        </span>
      </div>
      {ROLE_CATEGORIES.map((category) => (
        <div className="sc-section" key={category.id}>
          <div className="sc-sect-head">
            <h4 className="sc-sect-title">{category.label}</h4>
            <span className="sc-sect-note">{category.note}</span>
          </div>
          <div className="sc-roles">
            {rolesIn(category.id).map((role) => (
              <RoleCard key={role.id} role={role} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
