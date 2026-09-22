/**
 * Перегляд шаблону — **сторінка цілком**, і лише потім вибір.
 *
 * Це і є крок, якого бракувало: шаблон обирають очима, тож спершу його
 * **показують** — усі блоки, усі підписи, усі шрифти, від першого рядка до
 * останнього. Обрізаного уривка тут немає навмисно: сторінка, яку видно
 * наполовину, не дає відповіді на єдине питання цього екрана — «а що вийде?».
 *
 * **Перегляд не може розійтися з результатом**: його рендерить той самий
 * `PageRenderer` із тією ж `page_data`, яку потім збереже редактор
 * (`buildPageConfig(template, template.preview)`), а текст-приклад лежить у
 * **даних шаблону** — не в розмітці екрана. Третій шаблон тому отримує перегляд
 * разом із собою, і стереже це `templates.test.ts`.
 *
 * **Дотик по перегляду не проходить** (`pointer-events: none`, `aria-hidden`):
 * усередині справжні блоки, і в шаблоні з посиланням дотик до прикладу відкрив
 * би чуже замість вибору. Вигляд від цього не змінюється — приклад і мусить
 * виглядати так, як виглядатиме.
 *
 * **Вибір — окрема кнопка, а не дотик до сторінки.** «Бачу» і «беру» — дві різні
 * дії, і друга веде вже в текст (`?template=`), де сторінка стає полями.
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
  /** Крок назад — до списку шаблонів: дотик до рядка ще нічого не обрав. */
  onBack: () => void;
  /** «Обрати шаблон»: далі — текст на цій самій сторінці. */
  onPick: (key: PageTemplateKey) => void;
}): ReactElement {
  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">
          <button type="button" className="wb-close-btn" onClick={onBack} aria-label="Назад">
            <Icon name="arrow-left" size={18} />
          </button>
          {template.label}
        </h1>
      </div>

      <p className="wb-text-muted wb-template-lead">
        Ось сторінка цілком — так вона виглядатиме. Текст у ній приклад: свій ви впишете на цих
        самих місцях.
      </p>

      <div className="wb-template-frame" aria-hidden="true">
        <PageRenderer
          config={buildPageConfig(template, template.preview)}
          context={{ slug: "", title: template.label, photoUrl: null }}
          className="page-layout"
        />
      </div>

      {/* Кнопка — **липка**, а не в кінці сторінки: перегляд довгий рівно
          настільки, наскільки довгий шаблон, і в кінці він вимагав би
          прокрутити все донизу, щоб щось узяти. */}
      <div className="wb-template-actions">
        <button
          type="button"
          className="wb-btn wb-btn-primary"
          onClick={() => onPick(template.key)}
        >
          <Icon name="check" size={16} />
          {`Обрати шаблон: ${template.label}`}
        </button>
      </div>
    </div>
  );
}
