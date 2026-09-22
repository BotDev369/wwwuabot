/**
 * ComposerModal — модалка швидкого створення на майже весь екран.
 *
 * Відкриває її той, хто вміє зберігати: у панелі — центральний «+» у
 * нижньому футері (`withPrimaryAction` у `@wwwuabot/ui/nav`), у платформи —
 * **сам екран**, який створення стосується (нотатки відкривають його своїм
 * «+» і за `?new=1`, дошка — вкладкою «Оголошення»). Слот футера платформи
 * веде на хаб «Створити», тож композера там більше ніхто не тримає.
 *
 * Це не діалог: усередині вкладки, а кожна вкладка
 * відповідає за своє. Розмітка — кирпичики `.wb-modal*` (як у `useDialog`),
 * тому вигляд однаковий в обох оболонках; своє тут лише те, чого в модалки
 * не було: смуга вкладок і майже повноекранний розмір (`.wb-composer`).
 *
 * **Кнопки дії — останній рядок тіла вкладки** (`.wb-sheet-actions`), а не
 * прибитий футер: фіксована смуга забирає місце в полів.
 *
 * **Стан у кожної вкладки свій.** Нотатка (`useComposer`) і оголошення
 * (`useAdDraft`) майже не перетинаються — спільні лише смуга вкладок і кнопки,
 * а що саме зберігається, вирішує активна вкладка. Тому композер збирає їх
 * разом, а не звалює в один хук з десятком полів (AGENTS.md §3).
 *
 * **Вкладки без обробника немає.** У панелі дошки оголошень не існує, тож
 * `onSaveAd` туди не передають — і вкладка не показується: обіцяти форму, яка
 * не вміє зберігати, було б тим самим порожнім пунктом, від якого ми тікаємо
 * (AGENTS.md §7). Так само поводиться «Сторінка»: її дають ті екрани
 * платформи, що вміють її зберегти (хаб «Створити» й список сторінок).
 *
 * **Той самий композер і редагує**: коли оболонка передає `initial` / `initialAd`
 * із `id` (це роблять екран «Нотатки» й дошка оголошень). Окремий редактор
 * мусив би повторити поля й стелі довжини — і розійшовся б із першою формою.
 *
 * @module @wwwuabot/ui/composer
 */

import type { KeyboardEvent, ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { useDialog } from "../dialog";
import { ComposerActions } from "./ComposerActions";
import { ComposerAdTab } from "./ComposerAdTab";
import { ComposerNoteTab } from "./ComposerNoteTab";
import { ComposerPageTab } from "./ComposerPageTab";
import { ComposerPlaceholderTab } from "./ComposerPlaceholderTab";
import { COMPOSER_TABS, findComposerTab } from "./tabs";
import { useAdDraft } from "./useAdDraft";
import { useComposer } from "./useComposer";
import { usePageDraft } from "./usePageDraft";
import type { AttachmentKind, ComposerModalProps } from "./types";

const ATTACHMENT_TITLES: Record<AttachmentKind, string> = {
  photo: "Фото",
  video: "Відео",
  file: "Файли",
};

export function ComposerModal({
  onClose,
  onSaveNote,
  onSaveAd,
  onSavePage,
  initial,
  initialAd,
  initialPage,
  initialTab,
}: ComposerModalProps): ReactElement {
  const dialog = useDialog();
  const composer = useComposer({ onSaveNote, initial, initialTab });
  const ad = useAdDraft({ onSaveAd, initial: initialAd });
  const page = usePageDraft({ onSavePage, initial: initialPage });

  // Вкладка без обробника не показується й не відкривається: якщо її попросили
  // ключем (`initialTab`), показуємо типову, а не форму без дії.
  const adAvailable = Boolean(onSaveAd);
  const pageAvailable = Boolean(onSavePage);
  const unavailable =
    (composer.tab.key === "ad" && !adAvailable) || (composer.tab.key === "page" && !pageAvailable);
  const tab = unavailable ? findComposerTab("note") : composer.tab;
  const isAd = tab.key === "ad";
  const isPage = tab.key === "page";

  // Той самий композер і створює, і редагує: різниця лише в заголовку й у
  // тому, чи поїде `id` зі збереженням (це вирішують хуки).
  const editingId = isAd ? initialAd?.id : isPage ? initialPage?.id : initial?.id;
  const title = editingId ? "Редагувати" : "Створити";

  // Порожній запис зберігати нема чого: рядок без тексту — це не чернетка, а
  // випадковий дотик. Тому кнопка вимкнена, а не «падає» 400-ю.
  const empty = isAd
    ? ad.empty
    : isPage
      ? page.empty
      : composer.note.trim() === "" && composer.tags.length === 0;

  const saving = isAd ? ad.saving : isPage ? page.saving : composer.saving;
  const error = isAd ? ad.error : isPage ? page.error : composer.error;

  // Заглушка — це діалог, а не нативне вікно: у Telegram на iOS `alert`
  // не показується взагалі (§4), тож кнопка просто нічого б не робила.
  const soon = (what: string, title = "Скоро") => {
    void dialog.alert(`${what} — окрема тема, ще не зроблено.`, { title });
  };

  const actions = tab.status === "ready" && (
    <ComposerActions
      saving={saving}
      disabled={empty}
      editing={Boolean(editingId)}
      onClose={onClose}
      onSave={() => {
        // Закриваємо лише тоді, коли справді збереглось: інакше людина
        // втратила б написане, навіть не побачивши причини.
        void (isAd ? ad.save() : isPage ? page.save() : composer.save()).then((saved) => {
          if (saved) onClose();
        });
      }}
    />
  );

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  }

  return (
    <div className="wb-modal-overlay wb-modal-overlay--tight" onClick={onClose}>
      <div
        className="wb-modal wb-modal--full wb-sheet wb-composer"
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

        {/* Вкладки — вертикальний стовпчик зліва: на телефоні він забирає
            вузьку смугу, а полю вводу лишає всю висоту вікна. Підпис на
            вузькому екрані ховається (лишається іконка), тому ім'я вкладки
            завжди є в `aria-label` — інакше кнопка стала б безіменною. */}
        <div className="wb-composer-main">
          <div className="wb-composer-tabs" role="tablist" aria-label="Що створити">
            {COMPOSER_TABS.filter(
              (item) =>
                (item.key !== "ad" || adAvailable) && (item.key !== "page" || pageAvailable),
            ).map((item) => {
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
                  onClick={() => composer.selectTab(item.key)}
                >
                  <Icon name={item.icon} size={18} />
                  <span className="wb-composer-tab-label">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="wb-modal-body wb-composer-body">
            {isAd ? (
              <ComposerAdTab
                draft={ad.draft}
                onChange={ad.update}
                error={error}
                actions={actions}
              />
            ) : isPage ? (
              <ComposerPageTab page={page} error={error} actions={actions} />
            ) : tab.status === "ready" ? (
              <ComposerNoteTab
                note={composer.note}
                onNoteChange={composer.setNote}
                tags={composer.tags}
                onAddTag={composer.addTags}
                onRemoveTag={composer.removeTag}
                onPaste={() => void composer.paste()}
                onAttach={(kind) => soon(`Додавання: ${ATTACHMENT_TITLES[kind]}`)}
                error={error}
                actions={actions}
              />
            ) : (
              <ComposerPlaceholderTab tab={tab} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
