/**
 * Створення оголошення — композер на вкладці «Оголошення».
 *
 * Той самий `ComposerModal`, що й на дошці Простору: дошка відкриває його своїм
 * «+», хаб «Створити» — кнопкою «+» у пункті. Другого вікна для оголошення
 * немає (AGENTS.md §7).
 *
 * Вкладка «Нотатка» тут лишається робочою (`ComposerModal` її не ховає) — щоб
 * перемикання вкладок не вело в порожнечу: людина, яка вже відкрила композер,
 * не мусить дізнаватись, що половина його раптом не зберігає.
 *
 * @module web-platform-dev/src/pages/create
 */

import type { ReactElement } from "react";
import type { AdDraft } from "@wwwuabot/shared/ads";
import { ComposerModal } from "@wwwuabot/ui/composer";
import { adsApi } from "@/shared/api/ads.api";
import { notesApi } from "@/shared/api/notes.api";

export function AdCreateSheet({
  initial,
  onSaved,
  onClose,
}: {
  /** Чернетка з `id` — правка свого оголошення. */
  initial?: AdDraft;
  /** Список (дошка) перечитується після запису: він джерело правди. */
  onSaved?: () => void;
  onClose: () => void;
}): ReactElement {
  return (
    <ComposerModal
      initialTab="ad"
      initialAd={initial}
      onClose={onClose}
      onSaveNote={async (draft) => {
        await notesApi.save(draft);
      }}
      onSaveAd={async (draft) => {
        await adsApi.save(draft);
        onSaved?.();
      }}
    />
  );
}
