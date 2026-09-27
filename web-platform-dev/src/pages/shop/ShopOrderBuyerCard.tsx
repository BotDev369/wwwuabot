/**
 * Покупець і коментарі — картка, у якій видно, кому й про що це замовлення.
 *
 * **Поля контакту залежать від позицій, а не від форми.** Прибравши останній
 * фізичний товар, продавець перестає питати адресу — те саме правило, що в
 * оформленні покупця (`orderContactFields`); пари «підпис — поле» приходять
 * сюди готовими, бо друге правило того самого тут було б зайвим.
 *
 * **Примітка покупця не правиться — вона тут, щоб її прочитали.** Це слова
 * покупця, і найпотрібніші вони тому, хто вирішує, як замовлення виконати.
 *
 * **Коментар продавця — внутрішній, і про це сказано до того, як його напишуть.**
 * Інакше його сприймуть як повідомлення покупцеві: покупцеві пише розмова, а не
 * картка (`docs/SHOPS.md` §6, §8).
 *
 * @module web-platform-dev/src/pages/shop
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import {
  ORDER_SELLER_NOTE_MAX,
  type OrderContact,
  type OrderContactField,
} from "@wwwuabot/shared/shop";

export interface ShopOrderBuyerCardProps {
  /** Поля контакту для **цього** складу замовлення (`orderContactFields`). */
  fields: readonly OrderContactField[];
  contact: OrderContact;
  /** Примітка покупця: показується, а не правиться. */
  note: string;
  sellerNote: string;
  onContact: (key: string, value: string) => void;
  onSellerNote: (value: string) => void;
}

export function ShopOrderBuyerCard({
  fields,
  contact,
  note,
  sellerNote,
  onContact,
  onSellerNote,
}: ShopOrderBuyerCardProps): ReactElement {
  return (
    <>
      <div className="wb-card">
        <div className="wb-card-header">
          <span className="wb-card-title">
            <Icon name="contact" size={16} />
            Покупець
          </span>
        </div>
        <div className="wb-card-body">
          {fields.map((field) => (
            <div className="wb-field" key={field.key}>
              <label className="wb-label" htmlFor={`shop-order-${field.key}`}>
                {field.label}
              </label>
              <input
                id={`shop-order-${field.key}`}
                className="wb-input"
                maxLength={field.max}
                value={contact[field.key] ?? ""}
                onChange={(event) => onContact(field.key, event.target.value)}
              />
            </div>
          ))}

          {note && (
            <div className="wb-field">
              <span className="wb-label">Примітка покупця</span>
              <p className="shop-order-contact">{note}</p>
            </div>
          )}
        </div>
      </div>

      <div className="wb-card">
        <div className="wb-card-header">
          <span className="wb-card-title">
            <Icon name="edit" size={16} />
            Коментар продавця
          </span>
        </div>
        <div className="wb-card-body">
          <textarea
            className="wb-textarea"
            rows={3}
            maxLength={ORDER_SELLER_NOTE_MAX}
            placeholder="Про що домовились: оплата, час, доставка"
            aria-label="Коментар продавця"
            value={sellerNote}
            onChange={(event) => onSellerNote(event.target.value)}
          />
          <p className="wb-text-muted shop-note">
            Коментар бачать лише ті, хто веде магазин. Покупцеві пише розмова.
          </p>
        </div>
      </div>
    </>
  );
}
