/**
 * Вибір шаблону — **список входів у перегляд**, а не прев'ю в рядку.
 *
 * Шаблон обирають очима, і зупиняє це рівно одне: **чи видно сторінку**. Перша
 * спроба показувала її тут же, обрізаною до 260px із згасанням краю, — і саме
 * цей уривок читався як зламана розмітка: половина блоків за межею, дотиків
 * усередині немає, а решта сторінки просто не існує.
 *
 * Тому кожен рядок веде на **окремий екран перегляду** (`?preview=`), де та
 * сама `page_data` рендериться цілком, без обрізання: скільки блоків у шаблоні —
 * стільки й видно. Рядок же несе рівно те, чим шаблони відрізняються **до**
 * відкриття: підпис і одне речення.
 *
 * Список — кнопкою цілком, а не рядком із кнопкою праворуч: дотик по картці в
 * Telegram і так читається як «відкрити», і другий маленький тап-таргет поруч
 * із ним тільки змушував би цілитись.
 *
 * @module web-platform-dev/src/pages/user-pages
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { PAGE_TEMPLATES, type PageTemplateKey } from "@wwwuabot/shared/pages";
import { pageTemplateIcon } from "./pages-view";

export function PageTemplatePicker({
  onBack,
  onPreview,
}: {
  onBack: () => void;
  /** Дотик до рядка: далі — сторінка цілком, і вже потім вибір. */
  onPreview: (key: PageTemplateKey) => void;
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
        Обидва шаблони вже зверстані — вам лишиться вписати свій текст. Відкрийте будь-який, щоб
        побачити сторінку цілком.
      </p>

      <div className="wb-template-list">
        {PAGE_TEMPLATES.map((template) => (
          <button
            type="button"
            className="wb-template-row"
            key={template.key}
            onClick={() => onPreview(template.key)}
          >
            <span className="wb-template-row-icon">
              <Icon name={pageTemplateIcon(template.key)} size={20} />
            </span>
            <span className="wb-template-row-text">
              <span className="wb-template-row-title">{template.label}</span>
              <span className="wb-template-row-hint">{template.hint}</span>
            </span>
            <span className="wb-template-row-action">
              <Icon name="chevron-right" size={18} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
