/**
 * Гасло демо-лендінгу: назва продукту найбільша, опис дрібний.
 *
 * @module web-admin-dev/src/pages/style/StyleHero
 */

import type { ReactElement } from "react";
import { roleClass, STYLE_ROLES } from "@wwwuabot/shared/ui/role-catalog";

const display = STYLE_ROLES.find((role) => role.id === "hero-display")!;
const lead = STYLE_ROLES.find((role) => role.id === "hero-lead")!;

export function StyleHero(): ReactElement {
  return (
    <div className="sc-hero">
      <p className="sc-hero-cap">Демо стилю · дві теми · каталог ролей</p>
      <h2 className={roleClass(display)}>ПАЛЯНИЦЯ</h2>
      <p className={`${roleClass(lead)} sc-hero-lead`}>
        Ділова платформа для Своїх: люди, повідомлення, трекери, сторінки й магазин. Ця сторінка
        показує не опис стилю, а сам продукт: кожен блок нижче — роль із каталогу, а не окремо
        намальований екран.
      </p>
      <div className="sc-hero-row">
        <span className="wb-badge wb-badge-accent">7 користувачів</span>
        <span className="wb-badge wb-badge-green">33 активні трекери</span>
        <span className="wb-badge wb-badge-yellow">6 непрочитаних</span>
        <span className="wb-badge wb-badge-neutral">29 сторінок</span>
      </div>
    </div>
  );
}
