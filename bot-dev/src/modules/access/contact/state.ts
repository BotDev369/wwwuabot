/**
 * Стан діалогу з адміном — **чисті функції**, без бази й Telegram.
 *
 * Людина без допуску пише адміну прямо в чаті, тож бот мусить пам'ятати три
 * речі: чи діалог відкрито, що вона вже написала і де лежить панель із
 * кнопками. Усе це — у рядку `users` (`admin_dialog_open`,
 * `admin_dialog_text`, `admin_panel_id`), а логіка «що з цим робити» тут,
 * щоб її можна було перевірити тестом без Telegram.
 *
 * **Кнопки дублюються навмисно: реплай-клавіатурою й inline.** Клавіатура під
 * чатом зручна, але клієнт показує її не завжди (буває, не показує ніколи — ми
 * на це наступили), а кнопка на повідомленні малюється скрізь. Тому дія одна,
 * а два способи її натиснути: під чатом і на самому екрані.
 *
 * **Накопичуємо, а не відправляємо.** Кожне повідомлення додається до
 * чернетки одразу: надіслати раніше ми не можемо, тоді в людини не було б
 * кнопки «Закрити без відправки» — тобто «я передумав».
 *
 * **Межа — спільна** (`@wwwuabot/shared/access-requests`): стільки символів
 * приймає і форма на платформі, тож звернення з чату й з Mini App мають однакову
 * довжину.
 *
 * @module bot-dev/src/modules/access/contact/state
 */

import { ACCESS_REQUEST_MAX, sanitizeAccessRequestText } from "@wwwuabot/shared/access-requests";
import type { InlineKeyboardMarkup, ReplyKeyboardMarkup } from "grammy/types";
import { CONTACT } from "../../../shared/config/texts";
import type { BotUser } from "../../../shared/types/env";

/** Скільки символів вміщує одне повідомлення Telegram — межа самого API. */
const TELEGRAM_MAX = 4096;

/** Передня частина `callback_data` всіх кнопок діалогу. */
export const CONTACT_CALLBACK_PREFIX = "contact:";

/** Що в(open)ому діалозі: відкритий він, що написано і де панель із кнопками. */
export interface ContactState {
  open: boolean;
  draft: string;
  /** Номер повідомлення з inline-кнопками, щоб не плодити їх щодразу. */
  panelId?: number | null;
}

/** Яка саме дія: підпис кнопки реплай-клавіатури або `callback_data`. */
export type ContactAction = "write" | "close" | "send" | "send-close" | "close-without-send";

/** Стан із рядка користувача; відсутні колонки = діалогу не було. */
export function readContactState(
  user: Pick<BotUser, "admin_dialog_open" | "admin_dialog_text" | "admin_panel_id"> | undefined,
): ContactState {
  return {
    open: user?.admin_dialog_open === 1,
    draft: user?.admin_dialog_text ?? "",
    panelId: user?.admin_panel_id ?? null,
  };
}

/**
 * Яка кнопка натиснута, або `null`, якщо це звичайний текст.
 *
 * Порівняння точне: кнопка реплай-клавіатури приходить текстом, тож «Так» —
 * це «Так», а не перші три літери підпису.
 */
export function readContactAction(text: string): ContactAction | null {
  const buttons: [string, ContactAction][] = [
    [CONTACT.write, "write"],
    [CONTACT.close, "close"],
    [CONTACT.send, "send"],
    [CONTACT.sendAndClose, "send-close"],
    [CONTACT.closeWithoutSend, "close-without-send"],
  ];
  return buttons.find(([label]) => label === text)?.[1] ?? null;
}

/** Те саме, але для inline-кнопки: `callback_data`. */
export function readContactCallback(data: string): ContactAction | null {
  if (!data.startsWith(CONTACT_CALLBACK_PREFIX)) return null;
  const action = data.slice(CONTACT_CALLBACK_PREFIX.length);
  const known: ContactAction[] = ["write", "close", "send", "send-close", "close-without-send"];
  return known.includes(action as ContactAction) ? (action as ContactAction) : null;
}

/**
 * Дописати повідомлення до чернетки.
 *
 * `truncated` — текст не вмістився: тоді треба сказати людині, що далі лише
 * відправляти або закривати, бо її наступне повідомлення вже не зміниться.
 */
export function appendDraft(draft: string, message: string): { text: string; truncated: boolean } {
  const parts = [draft, message.trim()].filter(Boolean);
  const joined = parts.join("\n\n");
  const text = sanitizeAccessRequestText(joined);
  return { text, truncated: joined.length > ACCESS_REQUEST_MAX };
}

/**
 * Клавіатура під чатом: доти, поки немає нічого відправляти, і три кнопки
 * після першого написаного повідомлення.
 *
 * **`is_persistent` — не дрібниця, а те, чи побачить кнопка людина.** Без нього
 * клієнт має право не показувати клавіатуру знову: після `remove_keyboard`
 * у минулих версіях («закрита» звичайна клавіатура в пам'яті клієнта) нова
 * клавіатура так і не з'явилася б. Те саме стосується клавіатури платформи
 * (`modules/access/keyboard`).
 */
export function buildContactKeyboard(state: ContactState): ReplyKeyboardMarkup {
  const labels = state.draft
    ? [CONTACT.send, CONTACT.sendAndClose, CONTACT.closeWithoutSend]
    : [CONTACT.close];

  return {
    keyboard: [labels.map((text) => ({ text }))],
    is_persistent: true,
    resize_keyboard: true,
  };
}

/**
 * Клавіатура екрана відмови: поки діалог закритий — єдна кнопка «Написати
 * адміну», а відкритий діалог лишає те, що вже було (щоб `/start` посеред
 * написаного не збив людину з клавіатури, на якій вона стояла).
 */
export function buildAccessKeyboard(state: ContactState): ReplyKeyboardMarkup {
  if (state.open) return buildContactKeyboard(state);
  return { keyboard: [[{ text: CONTACT.write }]], is_persistent: true, resize_keyboard: true };
}

/** Рядок inline-кнопок панелі: підпис і що вона робить — в одному словнику. */
function panelButton(label: string, action: ContactAction) {
  return { text: label, callback_data: `${CONTACT_CALLBACK_PREFIX}${action}` };
}

/**
 * Панель діалогу — повідомлення з inline-кнопками.
 *
 * Вона малюється **завжди**, на відміну від реплай-клавіатури, тож це
 * основний спосіб натиснути кнопку; під чатом лишається дубль для зручності.
 */
export function buildPanel(state: ContactState): {
  text: string;
  reply_markup: InlineKeyboardMarkup;
} {
  if (!state.open) {
    return {
      text: CONTACT.closed(false),
      reply_markup: { inline_keyboard: [[panelButton(CONTACT.write, "write")]] },
    };
  }

  if (!state.draft) {
    return {
      text: CONTACT.started,
      reply_markup: { inline_keyboard: [[panelButton(CONTACT.close, "close")]] },
    };
  }

  return {
    text: CONTACT.appended(state.draft.length),
    reply_markup: {
      inline_keyboard: [
        [panelButton(CONTACT.send, "send"), panelButton(CONTACT.sendAndClose, "send-close")],
        [panelButton(CONTACT.closeWithoutSend, "close-without-send")],
      ],
    },
  };
}

/**
 * Лист адміну: хто написав і що. Текст зверчення йде в окремі повідомлення
 * (`splitForTelegram`), тож у шапці — лише дані про людину.
 */
export function buildAdminNotice(
  user: Pick<BotUser, "user_id" | "first_name" | "last_name" | "username">,
): string {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  const handle = user.username ? `@${user.username}` : "";
  return `Звернення від людини без допуску\n${[name, handle, `id ${user.user_id}`].filter(Boolean).join(", ")}`;
}

/**
 * Розрізати текст на те, що Telegram прийме: одне повідомлення — до 4096
 * символів, а межа звернення втричі більша. Ріжемо по рядку, щоб не розривати
 * речення, а якщо рядок сам довший — примусово.
 */
export function splitForTelegram(text: string): string[] {
  if (text.length <= TELEGRAM_MAX) return [text];

  const parts: string[] = [];
  let rest = text;
  while (rest.length > TELEGRAM_MAX) {
    const cut = rest.lastIndexOf("\n", TELEGRAM_MAX);
    const end = cut > 0 ? cut : TELEGRAM_MAX;
    parts.push(rest.slice(0, end));
    rest = rest.slice(end).replace(/^\n/, "");
  }
  if (rest) parts.push(rest);
  return parts;
}
