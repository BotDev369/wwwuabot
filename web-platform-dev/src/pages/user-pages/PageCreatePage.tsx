/**
 * Створення сторінки — **три кроки на одному екрані**, і крок живе в адресі.
 *
 * 1. `/pages/new` — список шаблонів (`PageTemplatePicker`);
 * 2. `/pages/new?preview=card` — **сторінка цілком** (`PageTemplatePreview`), і
 *    лише з неї шаблон беруть;
 * 3. `/pages/new?template=card` — текст на цій самій сторінці (`PageEditor`).
 *
 * **Чому перегляд окремим кроком.** Шаблон обирають очима, а сторінку, обрізану
 * до картки в списку, очима не побачиш: половина її лишалась за межею. Перегляд
 * тому — повноцінний екран, а список — вхід у нього.
 *
 * **Чому крок у адресі.** Тут працює те саме правило, що з формою (`?new=1`,
 * `useCreateForm`): у Telegram Mini App «назад» — це найчастіше жест або кнопка
 * системи, тобто **крок по історії**. З локальним прапорцем «назад» із редактора
 * виводив би зі створення взагалі, а не вертав на перегляд.
 *
 * **Після збереження — перегляд своєї сторінки** (`replace`, щоб «назад» не
 * вертав у вже збережений редактор): людині треба побачити, що вийшло, і саме
 * звідти вона відкриває сторінку назовні.
 *
 * @module web-platform-dev/src/pages/user-pages
 */

import type { ReactElement } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { pageTemplate } from "@wwwuabot/shared/pages";
import {
  PAGES_NEW_PATH,
  PAGES_PATH,
  readPagePreview,
  readPageTemplate,
  userPagePath,
  withPagePreview,
  withPageTemplate,
} from "@/app/routes";
import { PageEditor } from "./PageEditor";
import { PageTemplatePicker } from "./PageTemplatePicker";
import { PageTemplatePreview } from "./PageTemplatePreview";

export function PageCreatePage(): ReactElement {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const templateKey = readPageTemplate(params);
  const previewKey = readPagePreview(params);

  if (!templateKey) {
    if (!previewKey) {
      return (
        <PageTemplatePicker
          onBack={() => void navigate(PAGES_PATH)}
          onPreview={(key) => void navigate(withPagePreview(PAGES_NEW_PATH, key))}
        />
      );
    }

    return (
      <PageTemplatePreview
        template={pageTemplate(previewKey)}
        onBack={() => void navigate(PAGES_NEW_PATH)}
        // Дотик до «Обрати шаблон» — це перехід до тексту: `?preview=` зникає,
        // бо кроку «показати» за ним уже немає.
        onPick={(key) => void navigate(withPageTemplate(PAGES_NEW_PATH, key))}
      />
    );
  }

  return (
    <PageEditor
      // `key` — щоб зміна шаблону в адресі (напр. посиланням) відкривала новий
      // стан: чернетка шаблону живе в `useState`, і той самий екземпляр показав
      // би поля попереднього.
      key={templateKey}
      mode="create"
      initial={{ template: templateKey }}
      // Крок назад — на перегляд цього ж шаблону, а не в список: людина вже
      // бачила сторінку, і вертати її на початок було б втратою кроку.
      onBack={() => void navigate(withPagePreview(PAGES_NEW_PATH, templateKey))}
      onSaved={(page) => void navigate(userPagePath(page.id), { replace: true })}
    />
  );
}
