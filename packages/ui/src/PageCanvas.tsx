/**
 * Полотно сторінки — **один вхід до `PageRenderer` на весь продукт**.
 *
 * Сторінка скрізь одна: контент за адресою (`/slug`) і своя сторінка в
 * платформі відрізняються тим, звідки взялася `PageConfig` (з `page_data` чи з
 * шаблону), а не тим, як вона малюється. Друга копія виклику рендерера в
 * оболонці розійшлася б із першою тихо — саме тому тут, а не в двох місцях.
 *
 * **Стаття — це спосіб читати, а не інший набір блоків:** та сама сторінка стає
 * текстом із міркою рядка. Рамки (дослідження, магазин) лишаються в оболонці:
 * вони додають те, чого в `page_data` немає.
 *
 * @module @wwwuabot/ui
 */

import type { BlockContext, PageConfig } from "@wwwuabot/shared/types/page-config";
import { PageRenderer } from "./PageRenderer";

export function PageCanvas({
  config,
  context,
  article = false,
}: {
  /** Сторінка як дані: зони й блоки. */
  config: PageConfig;
  /** Те, що блоки знають про сторінку: адреса, назва, користувач, товари. */
  context: BlockContext;
  /** Читати як статтю: та сама сторінка, мірка рядка й типографіка тексту. */
  article?: boolean;
}) {
  const rendered = <PageRenderer config={config} context={context} className="page-layout" />;

  if (!article) return rendered;

  return (
    <div className="wb-article wb-article--page">
      <div className="wb-article-body">{rendered}</div>
    </div>
  );
}
