/**
 * Новий лист — форма «кому + тіло» поверх того, хто її відкрив.
 *
 * Той самий `NewMessageSheet`, що й на екрані «Повідомлення»: кнопка «+» у хабі
 * «Створити» відкриває його **тут**, не ведучи в переписку, — перехід на іншу
 * сторінку робить інша кнопка. Другої форми листа немає (AGENTS.md §7).
 *
 * **Чернетки й адресати приходять із `useCompose`**, а не з окремого запиту:
 * отримувач — це зв'язаний контакт, і правило «кому можна писати» мусить
 * читатись одним місцем. Надсилання й збереження веде той самий хук
 * (`compose.send` / `compose.saveDraft`), тож екран переписки й хаб роблять це
 * однаково.
 *
 * @module web-platform-dev/src/pages/create
 */

import type { ReactElement } from "react";
import { useDialog } from "@wwwuabot/ui/dialog";
import { NewMessageSheet } from "@wwwuabot/ui/messages";
import { useCompose } from "../useCompose";

export function MessageCreateSheet({
  onSent,
  onClose,
}: {
  /** Кому пішов лист — екран переписки відкриває розмову, хаб цим не займається. */
  onSent?: (peerId: number) => void;
  onClose: () => void;
}): ReactElement | null {
  const compose = useCompose();
  const dialog = useDialog();

  // Отримувачі — зв'язані контакти, і поки вони їдуть, поле «Кому» показало б
  // «без отримувача» — а це неправда, у якої немає виправдання.
  if (compose.loading) return null;

  return (
    <NewMessageSheet
      recipients={compose.recipients}
      // «+» — це завжди **чистий** лист: чернетки чекають своїм блоком у
      // переписці, і жодна з них не має підставитись у новий лист.
      draft={null}
      onSend={async (input) => {
        const message = await compose.send(input);
        if (!message) {
          await dialog.alert(compose.error ?? "Не вдалося надіслати повідомлення", {
            tone: "danger",
          });
          return false;
        }
        if (input.peerId !== null) onSent?.(input.peerId);
        return true;
      }}
      onSaveDraft={async (input) => {
        const ok = await compose.saveDraft(input);
        if (!ok) {
          await dialog.alert(compose.error ?? "Не вдалося зберегти чернетку", { tone: "danger" });
        }
        return ok;
      }}
      // «Видалити» показується лише в наявної чернетки; у нового листа її немає,
      // але обробник мусить бути — і він робить рівно те, що й сервер: порожнє
      // тіло прибирає чернетку за номером.
      onDeleteDraft={async (id) => compose.saveDraft({ id, peerId: null, body: "" })}
      onClose={onClose}
    />
  );
}
