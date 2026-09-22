/**
 * Створення сторінки — **два кроки на одному екрані**, і крок живе в адресі.
 *
 * 1. `/pages/new` — вибір шаблону з переглядом (`PageTemplatePicker`);
 * 2. `/pages/new?template=card` — текст на обраній сторінці (`PageEditor`).
 *
 * **Чому крок у адресі.** Тут працює те саме правило, що з формою (`?new=1`,
 * `useCreateForm`): у Telegram Mini App «назад» — це найчастіше жест або кнопка
 * системи, тобто **крок по історії**. З локальним прапорцем «назад» із редактора
 * виводив би зі створення взагалі, а не вертав до вибору шаблону.
 *
 * **Після збереження — перегляд своєї сторінки** (`replace`, щоб «назад» не
 * вертав у вже збережений редактор): людині треба побачити, що вийшло, і саме
 * звідти вона відкриває сторінку назовні.
 *
 * @module web-platform-dev/src/pages/user-pages
 */

import type { ReactElement } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  PAGES_NEW_PATH,
  PAGES_PATH,
  readPageTemplate,
  userPagePath,
  withPageTemplate,
} from "@/app/routes";
import { PageEditor } from "./PageEditor";
import { PageTemplatePicker } from "./PageTemplatePicker";

export function PageCreatePage(): ReactElement {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const templateKey = readPageTemplate(params);

  if (!templateKey) {
    return (
      <PageTemplatePicker
        onBack={() => void navigate(PAGES_PATH)}
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
      // Крок назад — до вибору шаблону, а не в список: шаблон ще не обраний, і
      // повертати людину на початок було б втратою зробленого кроку.
      onBack={() => void navigate(PAGES_NEW_PATH)}
      onSaved={(page) => void navigate(userPagePath(page.id), { replace: true })}
    />
  );
}
