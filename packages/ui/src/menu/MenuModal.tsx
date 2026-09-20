/**
 * MenuModal — поверхня зі списком пунктів (аркуш над скримом).
 *
 * Це та сама поверхня, що й композер (`.wb-modal--full wb-sheet`), лише
 * замість вкладок — список пунктів (або свій вміст: форма контакту й форма
 * нового листа приходять сюди слотом `content`). Вигляд пункту задає оболонка:
 * **рядок** на всю ширину (`layout="rows"`, типове) або **плитка** по дві в
 * ряду (`layout="blocks"`). Різниця не косметична: рядок читають (вибір
 * одного з багатьох — вигляд колекції, теги), плитку тицяють (розділи, назву
 * яких знають напам'ять).
 *
 * Самі пункти рендерить `MenuList` — та сама розмітка працює і **в потоці
 * сторінки** (хаб профілю платформи), тож деталь тут не дублюється.
 *
 * **Вихід у поверхні один — у шапці.** Друге місце для нього означало б два
 * місця, де його шукати, а сама поверхня під палець унизу більше нічого не
 * несе: перемикач вигляду переїхав у шапку екрана (`ProfileSectionsSwitch`),
 * а повноекранна розмова має власний кирпичик смуги (`wb-thread-bar`).
 *
 * Ліній тут немає жодної: пункт видно тлом (`--field-bg`, той самий кирпичик,
 * що у видимого поля) і підсвіченням на дотик, а не рамкою (`DESIGN_SYSTEM.md`,
 * правило 15). Вибраний пункт позначається галочкою (`selected`), бо вибір — це
 * стан, а не перехід.
 *
 * @module @wwwuabot/ui/menu
 */

import type { KeyboardEvent, ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { MenuList } from "./MenuList";
import type { MenuModalProps } from "./types";

export function MenuModal({
  title,
  items,
  content,
  header,
  layout = "rows",
  onClose,
}: MenuModalProps): ReactElement {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  }

  return (
    <div
      // Поля — майже весь екран: поверхня несе список, а не сторінку. Хто
      // забирає екран повністю, каже це сам (`wb-modal--screen` у розмови).
      className="wb-modal-overlay wb-modal-overlay--tight"
      onClick={onClose}
    >
      <div
        className="wb-modal wb-modal--full wb-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="wb-modal-header wb-sheet-head">
          <h2 className="wb-modal-title">{title}</h2>
          <button type="button" className="wb-close-btn" onClick={onClose} aria-label="Закрити">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="wb-modal-body wb-menu-body">
          {/* Блок над списком — не пункт, тож і не всередині `role="menu"`:
              він описує меню, а не діє замість нього. */}
          {header}
          {/* Вміст і список — один слот: форма замінює список, а не стає ще
              одним над ним. */}
          {content ?? <MenuList items={items ?? []} layout={layout} />}
        </div>
      </div>
    </div>
  );
}
