/**
 * Завести контакт — діалогом, без переходу на екран «Контакти».
 *
 * **Контакт — це запис із полями, а лінк — одне з них.** Ім'я питаємо діалогом
 * (без нього список стає стовпчиком безіменних карток), далі **одразу
 * складаємо лінк і кладемо його в буфер**, бо саме за цим сюди приходять, а
 * решту полів людина допише вже на екрані контактів.
 *
 * **Діалоги не закривають людину на хабі.** Хаб «Створити» користується цим
 * хуком, тож «+» у пункті «Контакти» не веде на `/contacts` — інша сторінка це
 * інша кнопка, і форма тут поверхня, а не маршрут.
 *
 * Лінк саме **пробуємо** скласти, а не вважаємо обов'язковим: якщо ім'я бота
 * ще невідоме, контакт лишається без лінка, і людина дізнається причину
 * словами, а не порожньою кнопкою.
 *
 * @module web-platform-dev/src/pages/create
 */

import { useCallback } from "react";
import { sanitizeContactName, type Contact, type ContactInput } from "@wwwuabot/shared/contacts";
import { useDialog } from "@wwwuabot/ui/dialog";
import { contactsApi } from "@/shared/api/contacts.api";

/** Контакт, якого тільки завели: лінка немає, поля порожні, крім імені. */
function newContact(name: string): ContactInput {
  return { name, tags: [], notes: "" };
}

type Dialog = ReturnType<typeof useDialog>;

/** Покласти лінк у буфер; невдача буфера — не помилка дії, а привід показати текст. */
async function copyLink(contact: Contact, dialog: Dialog): Promise<void> {
  if (!contact.deepLink) {
    await dialog.alert(
      "Бот ще не знає свого імені — посилання не склалося. Оновіть екран і спробуйте ще раз.",
      { title: "Скопіюйте вручну" },
    );
    return;
  }

  try {
    await navigator.clipboard.writeText(contact.deepLink);
  } catch {
    await dialog.alert(contact.deepLink, { title: "Скопіюйте вручну" });
  }
}

export interface ContactAddState {
  /** Спитати ім'я, завести контакт і скласти лінк. `null` — людина відмовилась. */
  add: () => Promise<Contact | null>;
}

export function useContactAdd(): ContactAddState {
  const dialog = useDialog();

  const add = useCallback(async (): Promise<Contact | null> => {
    const answer = await dialog.prompt("Як звати людину, якій ви надсилаєте посилання?", {
      title: "Додати контакт",
      placeholder: "Ім'я контакту",
      validate: (value) =>
        sanitizeContactName(value) === "" ? "Ім'я не може бути порожнім" : null,
    });
    if (answer === null) return null;

    try {
      const created = await contactsApi.create(newContact(sanitizeContactName(answer)));
      if (!created) throw new Error("Сервер не підтвердив створення — спробуйте ще раз.");

      const linked = await contactsApi.makeLink(created.id);
      const contact = linked ?? created;
      await copyLink(contact, dialog);
      return contact;
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося додати контакт", {
        title: "Помилка",
      });
      return null;
    }
  }, [dialog]);

  return { add };
}
