/**
 * Перегляд шаблону — **це і є сторінка**, а не картка з нею.
 *
 * Раніше тут стояла рамка (межа, радіус, тінь) на екрані платформи: шапка
 * «Візитка», пояснення й кнопки навколо. Виходив не перегляд сторінки, а
 * **зображення** сторінки — і саме тому перегляд не читався: людина бачила
 * картку в застосунку, а не сторінку, яку вона відкриє.
 *
 * Тому тепер тут рівно одне: справжня сторінка, на весь екран, тими самими
 * класами й тією самою шириною, що в опублікованої (`page-layout` +
 * `page-zone--main` зі спільного `page-layout.css` і `main` цієї оболонки).
 * Полотно не має жодного власного правила розкладки — інакше перегляд знову
 * показував би не те, що побачить відвідувач.
 *
 * **Чому перегляд збігається з результатом.** Його рендерить той самий
 * `PageRenderer` із тією ж `page_data` (`buildPageConfig(template,
 * template.preview)`), а текст-приклад лежить у **даних шаблону** — не в
 * розмітці екрана. Третій шаблон тому отримує перегляд разом із собою, і
 * стереже це `templates.test.ts`.
 *
 * **Дотик по сторінці не проходить** (`pointer-events: none`, `aria-hidden`):
 * усередині справжні блоки, і дотик по посиланню в прикладі відкрив би чуже
 * замість вибору шаблону. Вигляд від цього не змінюється — приклад і мусить
 * виглядати так, як виглядатиме.
 *
 * **Керування — одна липка смуга внизу.** Воно мусить бути, бо це перегляд
 * («обрати» й «назад» — обидві дії), і мусить бути **поверх** сторінки, а не
 * навколо неї: усе, що стоїть над полотном, знову робить із перегляду екран
 * платформи. У кінці сторінки кнопку шукали б прокруткою, тож смуга липка.
 *
 * Звідси ж і **два корені замість обгортки**: обгортка (`.wb-page` чи власний
 * бокс) додала б рівно те, чого тут не треба, — відступ і свою розкладку
 * навколо полотна. Сторінка й смуга поверх неї — сусіди, і ніщо між ними не
 * стоїть.
 *
 * @module web-platform-dev/src/pages/user-pages
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { buildPageConfig, type PageTemplate, type PageTemplateKey } from "@wwwuabot/shared/pages";
import { PageRenderer } from "@wwwuabot/ui/PageRenderer";
import { registerAllBlocks } from "@wwwuabot/ui/blocks";

registerAllBlocks();

export function PageTemplatePreview({
  template,
  onBack,
  onPick,
}: {
  template: PageTemplate;
  /** Крок назад — до списку шаблонів: огляд ще нічого не обрав. */
  onBack: () => void;
  /** «Обрати шаблон»: далі — текст на цій самій сторінці. */
  onPick: (key: PageTemplateKey) => void;
}): ReactElement {
  return (
    <>
      <div className="wb-template-canvas" aria-hidden="true">
        <PageRenderer
          config={buildPageConfig(template, template.preview)}
          // `preview` — єдина різниця між переглядом і справжньою сторінкою:
          // під нею немає нічого, чого немає в `page_data`. Ним користується
          // блок, чий вміст лежить у своїй таблиці (`shop-grid`): товарів у
          // шаблоні ще немає, тож він малює приклад — інакше шаблон магазину
          // виглядав би парою текстових карток (docs/SHOPS.md §3).
          context={{ slug: "", title: template.label, photoUrl: null, preview: true }}
          className="page-layout"
        />
      </div>

      <div className="wb-template-actions">
        {/* Назад — компактна кнопка-знак: підпис «Обрати шаблон: …» довгий, і
            два повні підписи в одному рядку не вміщаються на телефоні. */}
        <button
          type="button"
          className="wb-btn wb-btn-secondary wb-template-back"
          onClick={onBack}
          aria-label="Назад"
        >
          <Icon name="arrow-left" size={16} />
        </button>
        <button
          type="button"
          className="wb-btn wb-btn-primary"
          onClick={() => onPick(template.key)}
        >
          <Icon name="check" size={16} />
          {`Обрати шаблон: ${template.label}`}
        </button>
      </div>
    </>
  );
}
