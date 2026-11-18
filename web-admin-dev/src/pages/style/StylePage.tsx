/**
 * Сторінка «Стиль» — демо-лендінг продукту.
 *
 * **Не перелік токенів і не галерея тем.** Сторінка показує сам вигляд: гасло,
 * каталог ролей, палітру, дані, таблицю, форми, стани й рух. Тему тут
 * перемикають одним перемикачем — світла / темна.
 *
 * **Вигляд не описаний на сторінці.** Кожен блок бере роль із
 * `@wwwuabot/shared/ui/role-catalog`; тексти — у `demo-content.ts`. Тому нова
 * сторінка продукту не пише CSS: вона пише тексти й називає категорію.
 *
 * @module web-admin-dev/src/pages/style/StylePage
 */

import type { ReactElement } from "react";
import { ThemeButton } from "@wwwuabot/shared";
import { PageTopbar } from "../../layout/PageTopbar";
import { DataSection } from "./DataSection";
import { FormSection } from "./FormSection";
import { MiscSection } from "./MiscSection";
import { PaletteSection } from "./PaletteSection";
import { RoleCatalogSection } from "./RoleCatalogSection";
import { StyleHero } from "./StyleHero";
import { UsersTable } from "./UsersTable";

export function StylePage(): ReactElement {
  return (
    <>
      <PageTopbar>
        <h1 className="wb-topbar-title">Стиль</h1>
        <div className="wb-topbar-right">
          <span className="sc-demo-note">дві теми · каталог ролей · демо</span>
        </div>
      </PageTopbar>

      <section className="sc-page">
        <StyleHero />

        <div className="sc-card sc-row">
          <div>
            <h3 className="sc-card-title">Тема</h3>
            <p className="sc-demo-note">
              Тем рівно дві. Перемикач міняє палітру й памʼятає вибір на пристрої.
            </p>
          </div>
          <ThemeButton />
        </div>

        <RoleCatalogSection />
        <PaletteSection />
        <DataSection />
        <UsersTable />
        <FormSection />
        <MiscSection />
      </section>
    </>
  );
}
