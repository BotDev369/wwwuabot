/**
 * Гасло демо-лендінгу: назва продукту найбільша, опис дрібний.
 *
 * @module web-admin-dev/src/pages/style/StyleHero
 */

import type { ReactElement } from "react";
import { roleClass, STYLE_ROLES } from "@wwwuabot/shared/ui/role-catalog";
import demo from "./demo.json";

const display = STYLE_ROLES.find((role) => role.id === "hero-display")!;
const lead = STYLE_ROLES.find((role) => role.id === "hero-lead")!;

export function StyleHero(): ReactElement {
  return (
    <div className="sc-hero">
      <p className="sc-hero-cap">{demo.hero.cap}</p>
      <h2 className={roleClass(display)}>{demo.hero.title}</h2>
      <p className={`${roleClass(lead)} sc-hero-lead`}>{demo.hero.lead}</p>
      <div className="sc-hero-row">
        {demo.hero.badges.map((badge, index) => (
          <span
            className={`wb-badge ${["wb-badge-accent", "wb-badge-green", "wb-badge-yellow", "wb-badge-neutral"][index % 4]}`}
            key={badge}
          >
            {badge}
          </span>
        ))}
      </div>
    </div>
  );
}
