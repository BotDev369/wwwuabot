/**
 * Поверхні створення **поверх хабу** — одна точка на всі «+».
 *
 * Хаб «Створити» не переходить на іншу сторінку: натиснутий «+» має відкрити
 * форму там, де людина стоїть, а перехід робить окрема кнопка («подивитись»).
 * Тому цей компонент зводить ключ пункту (`CreateFormKey`) із поверхнею, яку
 * вже вміє малювати продукт, і **нічого не вигадує**: жодної нової форми тут
 * немає, усі вони — спільні кирпичики (`@wwwuabot/ui/composer`,
 * `@wwwuabot/ui/messages`) плюс одна оболонка збереження.
 *
 * **«Контакт» поверхні не має** — його заводять діалогом (`useContactAdd`), і це
 * теж вірно: форма з полями контакту лишається на його екрані, а хаб дає
 * завести запис і скласти лінк.
 *
 * @module web-platform-dev/src/pages/create
 */

import type { ReactElement } from "react";
import { AdCreateSheet } from "./AdCreateSheet";
import { MessageCreateSheet } from "./MessageCreateSheet";
import { NoteCreateSheet } from "./NoteCreateSheet";
import type { CreateFormKey } from "../create-hub";

/** Ключі, за якими справді є поверхня; «контакт» сюди не входить навмисно. */
export type CreateSheetKey = Exclude<CreateFormKey, "contact">;

export function CreateSheetHost({
  form,
  onClose,
}: {
  form: CreateSheetKey;
  onClose: () => void;
}): ReactElement {
  if (form === "ad") return <AdCreateSheet onClose={onClose} />;
  if (form === "message") return <MessageCreateSheet onClose={onClose} />;
  return <NoteCreateSheet onClose={onClose} />;
}
