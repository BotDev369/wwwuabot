/**
 * «Створити» — хаб власних екранів людини, куди веде «+» у футері.
 *
 * **Це місце, а не дія.** «+» довго відкривав композер поверхні: слот футера
 * не мав адреси, тож ні історії, ні «назад», ні посилання в нього не було, а
 * шість власних екранів людини (Дати, Контакти, Локації, Нотатки, Сторінки й
 * Тема) жили в хабі профілю — серед них губився сам акаунт. Тепер у «+» є
 * сторінка, і з неї видно **все, що людина робить**.
 *
 * **У кожного пункту два входи, і вони різні.** «Подивитись» веде на екран
 * розділу — це інша сторінка. «Створити» **не веде нікуди**: форма
 * відкривається **поверх хабу** (`CreateSheetHost`), а закриття (✕, збереження
 * чи «назад») лишає людину рівно там, де вона стояла. Автоматичного переходу
 * немає навмисно: перехід на іншу сторінку — це «подивитись», окрема кнопка.
 *
 * Другої форми для того самого тут немає: поверхню дає спільний кирпичик
 * (`@wwwuabot/ui/composer`, `@wwwuabot/ui/messages`), а хаб лише зводить її з
 * ключем пункту — інакше в хабі з'явилася б друга форма нотатки, третя форма
 * оголошення й четверта форма листа (AGENTS.md §7).
 *
 * **Порядок, адреси й чесність заглушок** — у даних (`create-hub.ts`), розмітку
 * пункту дає спільний кирпичик, а свавілля «як показати» — вибір людини
 * (`section-layout.ts`). Тут лишається рівно зведення: стан, вибір і поверхня.
 *
 * @module web-platform-dev/src/pages/CreatePage
 */

import { useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { useDialog } from "@wwwuabot/ui/dialog";
import { HubList } from "@wwwuabot/ui/hub";
import type { MenuLayout } from "@wwwuabot/ui/menu";
import { buildHubItems, type CreateFormKey } from "./create-hub";
import { CreateSheetHost, type CreateSheetKey } from "./create/CreateSheetHost";
import { useContactAdd } from "./create/useContactAdd";
import { readSectionsLayout, writeSectionsLayout } from "./section-layout";
import { SectionLayoutSwitch } from "./SectionLayoutSwitch";

/** Поверхня, яку хаб тримає відкритою; «контакт» не поверхня — він діалог. */
function sheetOf(form: CreateFormKey): CreateSheetKey | null {
  return form === "contact" ? null : form;
}

export function CreatePage(): ReactElement {
  const navigate = useNavigate();
  const dialog = useDialog();
  // Вибір вигляду лежить у сховищі пристрою: екран перемонтовується на
  // кожному переході, і стан компонента скидався б.
  const [layout, setLayout] = useState(readSectionsLayout);
  // Яка форма відкрита поверх хабу. Це **стан екрана**, а не адреса: форма не
  // має власної сторінки, бо людина з хабу нікуди не переходить.
  const [sheet, setSheet] = useState<CreateSheetKey | null>(null);
  const contact = useContactAdd();

  function changeLayout(next: MenuLayout): void {
    setLayout(next);
    writeSectionsLayout(next);
  }

  const items = buildHubItems({
    // Перехід у межах SPA: повне перезавантаження в TWA — це втрачений стан і
    // біла вспишка.
    navigate: (href, options) => navigate(href, options),
    onForm: (form) => {
      // Контакт заводять діалогом — поверхні в нього немає, і це не виняток із
      // правила: форма з полями контакту лишається на своєму екрані.
      if (form === "contact") {
        void contact.add();
        return;
      }
      setSheet(sheetOf(form));
    },
    // Дія, за якою ще нічого немає, не мовчить: у пункту вже є пояснення, що
    // там буде, і саме його показує діалог — без вигаданого тексту на місці (§7).
    onSoon: (message) => void dialog.alert(message, { title: "Скоро" }),
  });

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">Створити</h1>
        <SectionLayoutSwitch layout={layout} onChange={changeLayout} />
      </div>

      <HubList items={items} layout={layout} />

      {sheet !== null && <CreateSheetHost form={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}
