/**
 * «Нове повідомлення» — вибір людини, якій писати.
 *
 * **Чому вибір, а не порожній аркуш.** Писати можна лише тому, з ким людина
 * зв'язана через контакти, і це правило знає **сервер** (`links.ts`). Тут видно
 * рівно тих, кому лист дійде, — а тіло листа набирають уже у формі
 * (`NewMessageSheet`), яка цей вибір і відкриває.
 *
 * Порядок не переставляємо: він приходить готовий (за іменем — спільне правило
 * `peerLabel` на сервері), і другий порядок у клієнті означав би, що один
 * список виглядає по-різному залежно від того, хто його намалював.
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

export function NewMessagePicker({
  recipients,
  onSelect,
  onClose,
}: NewMessagePickerProps): ReactElement {
  const items: MenuItem[] = recipients.map((peer) => ({
    key: String(peer.id),
    label: peerLabel(peer),
    icon: "user",
    onSelect: () => onSelect(peer.id),
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
