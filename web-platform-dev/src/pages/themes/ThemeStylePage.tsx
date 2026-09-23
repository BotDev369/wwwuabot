/**
 * `/profile/theme/style` — характер продукту: Apple чи Material.
 *
 * **Стиль — не тема.** Тема (три кольори + шрифт) — те, що людина створює сама
 * й ділить з іншими; стиль — характер продукту, і він у тему не входить
 * (AGENTS.md §8). Тому він стоїть окремим розділом, а не полем у формі теми:
 * інакше «поділитись темою» означало б нав'язати комусь і характер.
 *
 * **Стан показує знак, а не підпис.** Галочка в тому ж місці, де в невибраного
 * пункту стоїть його іконка, — цього досить: підпис «Вибрано» поруч із
 * галочкою та ще й із назвою характеру був третім словом про те саме.
 *
 * Рядок тут — **пункт спільного сайдбара** (`SideBarMenu`), той самий, що в
 * хабі теми, у меню адмінки й у панелі Простору: вибір читається очима, тож
 * виглядає як вибір, а не як форма з перемикачами. Роль смуги — `radiogroup`,
 * а стан пункту каже `aria-checked`: це вибір, а не перехід, і розмітка це
 * мусить називати так само, як названо зором.
 *
 * @module web-platform-dev/src/pages/themes/ThemeStylePage
 */

import type { ReactElement } from "react";
import { useStyleTheme } from "@wwwuabot/shared";
import { SideBarMenu } from "@wwwuabot/ui/nav";

export function ThemeStylePage(): ReactElement {
  const { brand, setBrand, brands } = useStyleTheme();

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">Стиль</h1>
      </div>

      {/* Вибір — тим самим пунктом, що й розділи: одна мірка рядка на весь
          продукт, тож «Стиль» читається як вибір із сайдбара, а не як форма. */}
      <SideBarMenu
        label="Стиль"
        role="radiogroup"
        sections={[
          {
            key: "style",
            items: brands.map((definition) => {
              const active = definition.id === brand;
              return {
                key: definition.id,
                label: definition.labelUk,
                icon: active ? ("check" as const) : ("sliders" as const),
                role: "radio" as const,
                active,
                onSelect: () => setBrand(definition.id),
              };
            }),
          },
        ]}
      />
    </div>
  );
}
