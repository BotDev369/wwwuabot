/**
 * Вибір шаблону — **погляд**, а не форма.
 *
 * Шаблон — це готовий вигляд сторінки, і обрати його наосліп неможливо: підписи
 * полів («Назва події», «Коли», «Де») нічого не кажуть про те, що вийде.
 * Тому кожна картка показує **справжню сторінку** — той самий `PageRenderer` із
 * тим самим `page_data`, який будує `buildPageConfig(template, template.preview)`:
 * перегляд не може розійтися з результатом, бо це буквально він і є.
 *
 * **Текст-приклад — з даних шаблону**, а не з розмітки екрана: інакше третій
 * шаблон отримав би перегляд без тексту (стереже `templates.test.ts`).
 *
 * **Дотик — лише кнопкою.** Прев'ю — це картинка (`pointer-events: none`,
 * `aria-hidden`): усередині нього живуть справжні блоки, і випадковий дотик по
 * посиланню в прикладі відкрив би чужу сторінку замість вибору шаблону.
 *
 * @module web-platform-dev/src/pages/user-pages
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { PAGE_TEMPLATES, buildPageConfig, type PageTemplateKey } from "@wwwuabot/shared/pages";
import { PageRenderer } from "@wwwuabot/ui/PageRenderer";
import { registerAllBlocks } from "@wwwuabot/ui/blocks";
import { pageTemplateIcon } from "./pages-view";

registerAllBlocks();

export function PageTemplatePicker({
  onBack,
  onPick,
}: {
  onBack: () => void;
  /** Дотик до «Обрати шаблон»: далі — текст на обраній сторінці. */
  onPick: (key: PageTemplateKey) => void;
}): ReactElement {
  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">
          <button type="button" className="wb-close-btn" onClick={onBack} aria-label="Назад">
            <Icon name="arrow-left" size={18} />
          </button>
          Обрати шаблон
        </h1>
      </div>

      <p className="wb-text-muted wb-template-lead">
        Структуру вже зібрано — вам лишиться вписати свій текст. Ось як виглядатиме кожна сторінка.
      </p>

      <div className="wb-template-list">
        {PAGE_TEMPLATES.map((template) => (
          <article className="wb-template-card" key={template.key}>
            <div className="wb-template-card-head">
              <span className="wb-template-card-icon">
                <Icon name={pageTemplateIcon(template.key)} size={20} />
              </span>
              <span className="wb-template-card-text">
                <span className="wb-template-card-title">{template.label}</span>
                <span className="wb-template-card-hint">{template.hint}</span>
              </span>
            </div>

            <div className="wb-template-preview" aria-hidden="true">
              <PageRenderer
                config={buildPageConfig(template, template.preview)}
                context={{ slug: "", title: template.label, photoUrl: null }}
                className="page-layout"
              />
            </div>

            <div className="wb-template-card-actions">
              <button
                type="button"
                className="wb-btn wb-btn-primary"
                onClick={() => onPick(template.key)}
              >
                <Icon name="check" size={16} />
                {`Обрати шаблон: ${template.label}`}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
