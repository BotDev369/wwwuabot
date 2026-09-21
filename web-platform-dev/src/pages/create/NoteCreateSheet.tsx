/**
 * Створення нотатки — та сама поверхня, що на екрані «Нотатки».
 *
 * Живе **одним** компонентом на два входи: «+» у самому екрані нотаток і «+» у
 * хабі «Створити». Другої форми нотатки немає — інакше хештеги, стеля довжини
 * й ріст поля розійшлися б із першою першою ж правкою (AGENTS.md §7).
 *
 * Куди саме лягає збережене, знає оболонка: `notesApi` додає до запиту
 * підписаний `initData`. Компонент лишається між двома: віддає збережений рядок
 * нагору (`onSaved`) і не тримає жодного списку.
 *
 * @module web-platform-dev/src/pages/create
 */

import type { ReactElement } from "react";
import type { NoteDraft, NoteRow } from "@wwwuabot/shared/notes";
import { ComposerModal } from "@wwwuabot/ui/composer";
import { notesApi } from "@/shared/api/notes.api";

export function NoteCreateSheet({
  initial,
  onSaved,
  onClose,
}: {
  /** Чернетка з `id` — тоді композер редагує наявну нотатку. */
  initial?: NoteDraft;
  /** Збережений рядок — його список оновлює собою, а не перезапитом. */
  onSaved?: (note: NoteRow) => void;
  onClose: () => void;
}): ReactElement {
  return (
    <ComposerModal
      initial={initial}
      onClose={onClose}
      onSaveNote={async (draft) => {
        const saved = await notesApi.save(draft);
        if (!saved) throw new Error("Сервер не підтвердив збереження — спробуйте ще раз.");
        onSaved?.(saved);
      }}
    />
  );
}
