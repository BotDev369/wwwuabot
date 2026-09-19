/**
 * «Нове повідомлення» — вибір людини, якій писати.
 *
 * **Чому вибір, а не порожній аркуш.** Писати можна лише тому, з ким людина
 * зв'язана через контакти, і це правило знає **сервер** (`links.ts`). Порожній
 * аркуш без адресата обіцяв би лист будь-кому, а потім відмовляв би 404; тут
 * видно рівно тих, кому лист дійде.
 *
 * Список — **ті самі рядки, що у списку розмов**, і брати їх звідти, а не з
 * другого запиту, принципово: список розмов уже означає «кому я можу писати»
 * (початі розмови плюс зв'язані контакти), і другий перелік тих самих людей
 * розійшовся б із першим на першій же правці. Порядок — за абеткою (спільне
 * правило `sortConversations`): у списку розмов він часовий, а тут його
 * відкривають, щоб знайти **людину**, а не останнє повідомлення.
 *
 * Поверхня — та сама, що в решти списків вибору (`MenuModal`, правило 4):
 * варіанти не випадають дропдауном, а відкривають повноекранний список.
 *
 * **Порожній поверхні тут бути не може.** Кнопка «+» стоїть на екрані завжди
 * (смуга керування — це хром, а не вміст), тож її можуть натиснути й тоді,
 * коли писати нікому: тоді поверхня каже, чому людей немає й де їх узяти, — той
 * самий текст, що в порожньому списку (`empty.ts`).
 *
 * @module @wwwuabot/ui/messages
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { peerLabel } from "@wwwuabot/shared/messages";
import { MenuModal, type MenuItem } from "../menu";
import { NO_PEERS_HINT, NO_PEERS_TITLE } from "./empty";
import type { NewMessagePickerProps } from "./types";
import { sortConversations } from "./view";

export function NewMessagePicker({
  conversations,
  onOpen,
  onClose,
}: NewMessagePickerProps): ReactElement {
  const items: MenuItem[] = sortConversations(conversations, "name").map((conversation) => ({
    key: String(conversation.peer.id),
    label: peerLabel(conversation.peer),
    icon: "user",
    onSelect: () => onOpen(conversation.peer.id),
  }));

  if (items.length === 0) {
    return (
      <MenuModal
        title="Нове повідомлення"
        onClose={onClose}
        content={
          <div className="wb-empty">
            <span className="wb-empty-icon">
              <Icon name="mail" size={32} />
            </span>
            <p className="wb-empty-text">{NO_PEERS_TITLE}</p>
            <p className="wb-empty-text">{NO_PEERS_HINT}</p>
          </div>
        }
      />
    );
  }

  return <MenuModal title="Нове повідомлення" items={items} onClose={onClose} />;
}
