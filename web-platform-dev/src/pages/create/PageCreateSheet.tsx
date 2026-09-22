/**
 * Створення сторінки — композер на вкладці «Сторінка».
 *
 * Той самий `ComposerModal`, що й нотатка з оголошенням: список сторінок
 * відкриває його своїм «+», хаб «Створити» — кнопкою «+» у пункті «Сторінки».
 * Другого вікна для сторінки немає (`AGENTS.md` §7), а шаблон, поля й адреса
 * живуть у спільній вкладці (`@wwwuabot/ui/composer`) — оболонка лише зберігає
 * зроблене.
 *
 * Вкладка «Нотатка» тут лишається робочою (`ComposerModal` її не ховає) — щоб
 * перемикання вкладок не вело в порожнечу: людина, яка вже відкрила композер,
 * не мусить дізнаватись, що половина його раптом не зберігає.
 *
 * @module web-platform-dev/src/pages/create
 */

import type { ReactElement } from "react";
import type { PageDraft, UserPage } from "@wwwuabot/shared/pages";
import { ComposerModal } from "@wwwuabot/ui/composer";
import { notesApi } from "@/shared/api/notes.api";
import { pagesApi } from "@/shared/api/pages.api";

export function PageCreateSheet({
  initial,
  onSaved,
  onClose,
}: {
  /** Чернетка з `id` — тоді композер редагує наявну сторінку. */
  initial?: PageDraft;
  /** Збережений рядок — список оновлює його собою, а не перезапитом. */
  onSaved?: (page: UserPage) => void;
  onClose: () => void;
}): ReactElement {
  return (
    <ComposerModal
      initialTab="page"
      initialPage={initial}
      onClose={onClose}
      onSaveNote={async (draft) => {
        await notesApi.save(draft);
      }}
      onSavePage={async (draft) => {
        const saved = await pagesApi.save(draft);
        if (!saved) throw new Error("Сервер не підтвердив збереження — спробуйте ще раз.");
        onSaved?.(saved);
      }}
    />
  );
}
