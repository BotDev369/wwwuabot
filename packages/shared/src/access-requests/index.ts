/**
 * Повідомлення, написане людині зі сторінки відмови, — **спільне правило** для
 * тих, хто його приймає, і тих, хто згодом читає та редагує.
 *
 * **Чому воно в shared, а не в контролері.** Текст пишуть двома сторонами: людина
 * надсилає з Mini App, адмін — з панелі, і обидві сторони мають знати межу та
 * правило обрізання. Друга копія цього правила розійшлася б із першою мовчки:
 * панель показала б «можна» там, де сервер уже відрізав би хвост (AGENTS.md §7).
 *
 * Межа — це довжина, а не валідатор змісту: одне повідомлення — це одне-два
 * речення, а не лист. Порожній текст не значить нічого, тож він лишається
 * порожнім, і сервер відкидає такий рядок.
 *
> **Межа одна й для веба, і для чату.** Людина пише адміну з Mini App або з
 * бота — це два шляхи до того самого рядка `access_requests`, тож різні числа в
 * них означали б, що «можна ввести» в одному місці не означає «можна
 * зберегти» в іншому.
 *
 * @module @wwwuabot/shared/access-requests
 */

/** Скільки символів приймає одне повідомлення. */
export const ACCESS_REQUEST_MAX = 6000;

/**
 * Текст повідомлення з тіла запиту: лише рядок, обрізаний по межі.
 *
 * Обрізання тут, а не на екрані: правило межі мусить бути одне, інакше пряме
 * звернення до API прийме довше, ніж форма.
 */
export function sanitizeAccessRequestText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, ACCESS_REQUEST_MAX);
}

/** Повідомлення адміну в тому вигляді, в якому його читає панель. */
export interface AccessRequestItem {
  id: number;
  /** Telegram-id автора (`users.user_id`). */
  user_id: number;
  text: string;
  /** `YYYY-MM-DD HH:MM:SS` — формат SQLite, а не ISO. */
  created_at: string;
  /** Людина могла бути видалена з бази, тож усі її поля — `null`. */
  first_name: string | null;
  last_name: string | null;
  /** Telegram-логін (`@…`). */
  username: string | null;
  /** Ім'я на платформі: `#…`, те саме, що бачить інша людина. */
  platform_username: string | null;
}

/** Як звати людину в панелі: спершу платформа, потім Telegram, потім `—`. */
export function accessRequestAuthor(
  item: Pick<AccessRequestItem, "first_name" | "last_name" | "username" | "platform_username">,
): string {
  const name = [item.first_name, item.last_name].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (item.platform_username) return `#${item.platform_username}`;
  if (item.username) return `@${item.username}`;
  return "—";
}
