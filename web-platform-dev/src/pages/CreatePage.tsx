/**
 * «Створити» — хаб власних екранів людини, куди веде «+» у футері.
 *
 * **Це місце, а не дія.** «+» довго відкривав композер поверхні: слот футера
 * не мав адреси, тож ні історії, ні «назад», ні посилання в нього не було, а
 * шість власних екранів людини (Дати, Контакти, Локації, Нотатки, Сторінки й
 * Тема) жили в хабі профілю — серед них губився сам акаунт. Тепер у «+» є
 * сторінка, і з неї видно **все, що людина робить**.
 *
 * **У кожного пункту два входи** — подивитись і створити (`HubList`). Другого
 * створення тут немає навмисно: «+» веде **в той самий** екран, де створення
 * вже живе, лише з наміром `?new=1` — інакше в хабі з'явилася б друга форма
 * нотатки, третя форма оголошення й четверта форма листа, і кожна розійшлася б
 * зі своєю першою ж правкою (AGENTS.md §7).
 *
 * **Порядок, адреси й чесність заглушок** — у даних (`create-hub.ts`), розмітку
 * пункту дає спільний кирпичик, а свавілля «як показати» — вибір людини
 * (`section-layout.ts`). Тут лишається рівно зведення: стан, вибір і перехід.
 *
 * @module web-platform-dev/src/pages/CreatePage
 */

import { useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { useDialog } from "@wwwuabot/ui/dialog";
import { HubList } from "@wwwuabot/ui/hub";
import type { MenuLayout } from "@wwwuabot/ui/menu";
import { buildHubItems } from "./create-hub";
import { readSectionsLayout, writeSectionsLayout } from "./section-layout";
import { SectionLayoutSwitch } from "./SectionLayoutSwitch";

export function CreatePage(): ReactElement {
  const navigate = useNavigate();
  const dialog = useDialog();
  // Вибір вигляду лежить у сховищі пристрою: екран перемонтовується на
  // кожному переході, і стан компонента скидався б.
  const [layout, setLayout] = useState(readSectionsLayout);

  function changeLayout(next: MenuLayout): void {
    setLayout(next);
    writeSectionsLayout(next);
  }

  const items = buildHubItems({
    // Перехід у межах SPA: повне перезавантаження в TWA — це втрачений стан і
    // біла вспишка.
    navigate: (href) => navigate(href),
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
    </div>
  );
}
