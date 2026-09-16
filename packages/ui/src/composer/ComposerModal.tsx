/**
 * ComposerModal — модалка швидкого створення на майже весь екран.
 *
 * Відкриває її центральний «+» у нижньому футері (`@wwwuabot/ui/nav`,
 * `withPrimaryAction`). Це не діалог: усередині вкладки, а кожна вкладка
 * відповідає за своє. Розмітка — кирпичики `.wb-modal*` (як у `useDialog`),
 * тому вигляд однаковий в обох оболонках; своє тут лише те, чого в модалки
 * не було: смуга вкладок і майже повноекранний розмір (`.wb-composer`).
 *
 * Незроблені дії не мовчать: вони кажуть, що це окрема тема. Так само
 * поводиться пункт футера без адреси — краще чесна відмова, ніж тиша (§7).
 *
 * @module @wwwuabot/ui/composer
 */

import type { KeyboardEvent, ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { useDialog } from "../dialog";
import { ComposerNoteTab } from "./ComposerNoteTab";
import { ComposerPlaceholderTab } from "./ComposerPlaceholderTab";
import { COMPOSER_TABS } from "./tabs";
import { useComposer } from "./useComposer";
import type { AttachmentKind, ComposerModalProps } from "./types";

const ATTACHMENT_TITLES: Record<AttachmentKind, string> = {
  photo: "Фото",
  video: "Відео",
  file: "Файли",
};

export function ComposerModal({ onClose }: ComposerModalProps): ReactElement {
  const dialog = useDialog();
  const { tab, selectTab, note, setNote, paste, error } = useComposer();

  // Заглушка — це діалог, а не нативне вікно: у Telegram на iOS `alert`
  // не показується взагалі (§4), тож кнопка просто нічого б не робила.
  const soon = (what: string, title = "Скоро") => {
    void dialog.alert(`${what} — окрема тема, ще не зроблено.`, { title });
  };

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  }

  return (
    <div className="wb-modal-overlay wb-modal-overlay--tight" onClick={onClose}>
      <div
        className="wb-modal wb-modal--full wb-composer"
        role="dialog"
        aria-modal="true"
        aria-label="Створити"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="wb-modal-header wb-composer-head">
          <h2 className="wb-modal-title">Створити</h2>
          <button type="button" className="wb-close-btn" onClick={onClose} aria-label="Закрити">
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Вкладки — вертикальний стовпчик зліва: на телефоні він забирає
            вузьку смугу, а полю вводу лишає всю висоту вікна. Підпис на
            вузькому екрані ховається (лишається іконка), тому ім'я вкладки
            завжди є в `aria-label` — інакше кнопка стала б безіменною. */}
        <div className="wb-composer-main">
          <div className="wb-composer-tabs" role="tablist" aria-label="Що створити">
            {COMPOSER_TABS.map((item) => {
              const active = item.key === tab.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={item.label}
                  title={item.label}
                  className={`wb-composer-tab${active ? " wb-composer-tab--active" : ""}`}
                  onClick={() => selectTab(item.key)}
                >
                  <Icon name={item.icon} size={18} />
                  <span className="wb-composer-tab-label">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="wb-modal-body wb-composer-body">
            {tab.status === "ready" ? (
              <ComposerNoteTab
                note={note}
                onNoteChange={setNote}
                onPaste={() => void paste()}
                onAttach={(kind) => soon(`Додавання: ${ATTACHMENT_TITLES[kind]}`)}
                error={error}
              />
            ) : (
              <ComposerPlaceholderTab tab={tab} />
            )}
          </div>
        </div>

        <div className="wb-modal-footer wb-composer-foot">
          <button type="button" className="wb-btn wb-btn-secondary" onClick={onClose}>
            Закрити
          </button>
          {tab.status === "ready" && (
            <button
              type="button"
              className="wb-btn wb-btn-primary"
              onClick={() => soon("Збереження нотатки", "Нотатка")}
            >
              <Icon name="save" size={16} />
              Зберегти
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
