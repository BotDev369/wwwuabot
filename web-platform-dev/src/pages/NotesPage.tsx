/**
 * «Нотатки» — робочий екран нотаток: створити, знайти, переглянути,
 * відредагувати, прибрати.
 *
 * Екран лише **зводить** те, що вже є: список-акордеон і смугу керування дає
 * спільний `@wwwuabot/ui/notes`, редактор — спільний композер (той самий, що
 * редагує нотатку), а адреса й власник — ця оболонка. Тому тут немає
 * ні розмітки картки, ні правил пошуку: усе це перевіряється тестами в
 * спільному модулі, незалежно від платформи.
 *
 * Підтвердження й редагування лишаються тут, бо вони не про вигляд, а про
 * дані: композер один на створення й редагування, а видалення мусить спитати —
 * і саме тому картка віддає дії нагору, а не робить їх сама.
 *
 * Шлях власний (`/notes`), а не `slug` рядка `scenarios`: список складається з
 * даних людини (таблиця `notes`), а не з `page_data` (AGENTS.md §7).
 *
 * **Композер можна відкрити адресою** (`/notes?new=1`): так «+» у хабі
 * «Створити» веде саме сюди, а не заводить другу форму нотатки. Намір
 * читається **один раз**, при появі екрана: далі композером керує стан, тож
 * закриття форми не відкриває її знову з того самого посилання.
 *
 * @module web-platform-dev/src/pages/NotesPage
 */

import { useState, type ReactElement } from "react";
import { useSearchParams } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import type { NoteDraft, NoteRow } from "@wwwuabot/shared/notes";
import { ComposerModal } from "@wwwuabot/ui/composer";
import { useDialog } from "@wwwuabot/ui/dialog";
import { readCreateIntent } from "@/app/routes";
import {
  DEFAULT_NOTES_VIEW,
  NotesList,
  NotesToolbar,
  buildGroups,
  collectTags,
  filterNotes,
  foundTags,
  type NotesView,
} from "@wwwuabot/ui/notes";
import { notesApi } from "@/shared/api/notes.api";
import { useNotes } from "./useNotes";

/** Чернетка, з якою відкривають композер: без `initial` — нова нотатка. */
interface EditorState {
  open: boolean;
  initial?: NoteDraft;
}

/** Перші слова нотатки — щоб у діалозі видалення було видно, ЩО видаляють. */
function preview(note: NoteRow): string {
  const text = note.text.trim().replace(/\s+/g, " ");
  if (text) return text.length > 40 ? `${text.slice(0, 40)}…` : text;
  return note.tags.map((tag) => `#${tag}`).join(" ") || "без тексту";
}

export function NotesPage(): ReactElement {
  const { notes, loading, error, upsert, remove } = useNotes();
  const dialog = useDialog();
  const [view, setView] = useState<NotesView>(DEFAULT_NOTES_VIEW);
  const [searchParams] = useSearchParams();
  // Намір із адреси береться тільки як **початковий** стан: композер — це
  // чернетка, і повторне підставляння затерло б написане.
  const [editor, setEditor] = useState<EditorState>(() => ({
    open: readCreateIntent(searchParams),
  }));
  // Розгорнуті картки — стан екрана, а не картки: «розгорнути всі» приходить
  // зі смуги керування, і стан мусить бути один (див. `NotesList`).
  const [openIds, setOpenIds] = useState<ReadonlySet<number>>(() => new Set());

  const visible = filterNotes(notes, view);
  const groups = buildGroups(notes, view);
  // Які теги знайшов поточний пошук чи фільтр — їх картка виділяє акцентом.
  // Рахує оболонка, а не картка: правило пошуку одне на екран (`view.ts`).
  const found = foundTags(collectTags(notes), view);
  // «Усі розгорнуті» — про те, що ВИДНО: шукати очима те, що відсіяли
  // фільтром, немає де, а перемикач мусить казати про поточний список.
  const allOpen = visible.length > 0 && visible.every((note) => openIds.has(note.id));
  const hasNotes = !loading && !error && notes.length > 0;

  function toggleAll(): void {
    setOpenIds(allOpen ? new Set() : new Set(visible.map((note) => note.id)));
  }

  function toggleNote(id: number): void {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  /**
   * Збереження нотатки — і нової, і відредагованої (це вирішує `draft.id`).
   * Сервер віддає збережений рядок, тож список оновлюємо ним, а не перезапитом.
   */
  async function saveDraft(draft: NoteDraft): Promise<void> {
    const saved = await notesApi.save(draft);
    if (!saved) throw new Error("Сервер не підтвердив збереження — спробуйте ще раз.");
    upsert(saved);
  }

  async function deleteNote(note: NoteRow): Promise<void> {
    const confirmed = await dialog.confirm(`Видалити нотатку «${preview(note)}»?`, {
      title: "Видалення",
      tone: "danger",
      confirmText: "Видалити",
    });
    if (!confirmed) return;

    try {
      await notesApi.remove(note.id);
      remove(note.id);
    } catch (e: unknown) {
      // Причина як є: «не вдалося» без нічого — та сама тиша, від якої ми
      // тікали, коли відмовлялись від нативних діалогів (§4).
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося видалити нотатку", {
        title: "Помилка",
      });
    }
  }

  function edit(note: NoteRow): void {
    setEditor({ open: true, initial: { id: note.id, text: note.text, tags: [...note.tags] } });
  }

  return (
    <div className="wb-page">
      {/* Шапка й смуга керування їдуть разом і лишаються на видноті
          (`.wb-page-sticky`): список нотаток довгий, і без цього пошук зникав
          рівно тоді, коли знайшлось те, що шукали. */}
      <div className="wb-page-sticky">
        <div className="wb-page-head">
          <h1 className="wb-page-title">Нотатки</h1>
          <div className="wb-page-actions">
            {/* Створення є й у футері («+»), але на екрані нотаток кнопка мусить
              бути тут: людина вже стоїть у списку, і вертати її до футера —
              зайвий крок. Обробник той самий — композер, а сам знак — та сама
              спільна мірка, що в «Контактів»: у шапці стоїть дія, а не підпис,
              і слово «Створити» забирало б рядок у назви. Слово лишається в
              `aria-label` — без нього кнопка не має назви для того, хто не
              бачить знака. */}
            <button
              type="button"
              className="wb-btn wb-btn-primary wb-page-add"
              onClick={() => setEditor({ open: true })}
              aria-label="Створити нотатку"
            >
              <Icon name="plus" size={20} />
            </button>
          </div>
        </div>

        {hasNotes && (
          <NotesToolbar
            view={view}
            onChange={(patch) => setView((prev) => ({ ...prev, ...patch }))}
            tags={collectTags(notes)}
            shown={visible.length}
            total={notes.length}
            allOpen={allOpen}
            onToggleAll={toggleAll}
          />
        )}
      </div>

      {loading && (
        <div className="wb-empty">
          <div className="wb-skeleton" style={{ width: 160, height: 20 }} />
          <p className="wb-text-muted">Завантаження нотаток…</p>
        </div>
      )}

      {!loading && error && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="warning" size={32} />
          </span>
          <p className="wb-text-red">{error}</p>
        </div>
      )}

      {!loading && !error && notes.length === 0 && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="text" size={32} />
          </span>
          <p className="wb-empty-text">Ще немає жодної нотатки.</p>
          {/* Кажемо, як створити: без цього порожній екран — це глухий кут. */}
          <p className="wb-empty-text">Натисніть «+» угорі — нотатка з хештегами з'явиться тут.</p>
        </div>
      )}

      {hasNotes && (
        <>
          {groups.length > 0 ? (
            <NotesList
              groups={groups}
              found={found}
              openIds={[...openIds]}
              onToggle={toggleNote}
              onEdit={edit}
              onDelete={(note) => void deleteNote(note)}
              // Вигляд — стан екрана, як і пошук: список лише малює вибране.
              collection={{ layout: view.layout, columns: view.columns }}
            />
          ) : (
            <div className="wb-empty">
              <span className="wb-empty-icon">
                <Icon name="search" size={32} />
              </span>
              <p className="wb-empty-text">Нічого не знайдено за цим запитом.</p>
              <button
                type="button"
                className="wb-btn wb-btn-secondary"
                onClick={() => setView(DEFAULT_NOTES_VIEW)}
              >
                <Icon name="close" size={16} />
                Скинути пошук і фільтри
              </button>
            </div>
          )}
        </>
      )}

      {editor.open && (
        <ComposerModal
          // Композер або закритий, або відкритий для однієї конкретної
          // нотатки — тож `initial` він читає рівно один раз, при появі.
          initial={editor.initial}
          onClose={() => setEditor({ open: false })}
          onSaveNote={saveDraft}
        />
      )}
    </div>
  );
}
