/**
 * Кому можна писати — правило зв'язку, а не стан розмови.
 *
 * **Зв'язок — це вже наявний у продукті факт.** Двоє людей зв'язані, якщо один
 * із них прийшов за **особистим лінком** іншого: саме тоді в `contacts`
 * з'являється `joined_user_id` (його ставить `bot-dev`, коли людина відкрила
 * `?start=<код>`). Тож окремого «запиту в друзі» немає — і другого сховища тих
 * самих стосунків теж (AGENTS.md §7).
 *
 * **Перевірка йде в обидва боки навмисно.** Лінк складає один, а пише потім
 * кожен: якби зв'язок читався лише як «мій контакт — це він», людина, яка
 * прийшла за чужим лінком, не могла б відповісти тому, хто її запросив.
 *
 * **Замовлення — теж зв'язок** (`docs/SHOPS.md` §8). Покупець не приходив за
 * лінком продавця й не є його контактом, але замовлення він уже зробив — і
 * саме тому мусить мати змогу спитати про нього. Другого правила для цього не
 * заводимо: тут, у тій самій перевірці, замовлення читається як ще одне
 * джерело зв'язку, тож і `sendMessage`, і читання розмови працюють без
 * особливого випадку.
 *
 * **Це перевірка ДО будь-яких підказок про існування розмови** (AGENTS.md §7):
 * спершу «чи можна взагалі», і лише потім «чи є що читати». Інакше код
 * відповіді (404 проти 400) сам казав би, чи існує чужа переписка.
 *
 * @module api-dev/src/services/messages/links
 */

/**
 * Чи зв'язані двоє людей через контакти.
 *
 * `false` для тієї самої людини: переписки із собою в продукті немає, і
 * «розмова» з одним і тим самим id на обох кінцях була б рядком, у якому
 * неможливо відрізнити своє від чужого.
 */
export async function areLinked(db: D1Database, a: number, b: number): Promise<boolean> {
  if (a === b) return false;

  const row = await db
    .prepare(
      `SELECT id FROM contacts
         WHERE (owner_id = ? AND joined_user_id = ?)
            OR (owner_id = ? AND joined_user_id = ?)
         LIMIT 1`,
    )
    .bind(a, b, b, a)
    .first<{ id: number }>();
  if (row !== null) return true;

  return await hasShopOrder(db, a, b);
}

/**
 * Чи замовляв один в одного — те саме, що лінк, але для магазину.
 *
 * `scenarios` тут тому, що продавця знає **вона**: магазин — це її рядок
 * (`owner_id`), і другий стовпець «хто продавець» у замовленні був би другим
 * поданням того самого факту (`AGENTS.md` §7). Питаємо в **обидва** боки: у
 * розмові замовлення мають право обидві сторони, а напрямок замовлення
 * нічого не змінює.
 */
async function hasShopOrder(db: D1Database, a: number, b: number): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT o.id FROM shop_orders o
         JOIN scenarios s ON s.id = o.shop_id
        WHERE (o.buyer_id = ? AND s.owner_id = ?)
           OR (o.buyer_id = ? AND s.owner_id = ?)
        LIMIT 1`,
    )
    .bind(a, b, b, a)
    .first<{ id: number }>();

  return row !== null;
}

/**
 * Чи прийшов `me` саме за лінком `peer` — тоді `peer` і є той, хто запросив.
 *
 * Це не те саме, що `areLinked`: зв'язок симетричний (писати можуть обидва), а
 * запрошення має **напрямок**. Вітаємо лише того, хто прийшов за лінком, і саме
 * тому ця функція дивиться тільки в один бік — на `joined_user_id = me`.
 * Другий бік (`owner_id = me`) тут означав би, що людина вітає саму себе за
 * власне запрошення.
 */
export async function isInvitedBy(db: D1Database, me: number, peer: number): Promise<boolean> {
  if (me === peer) return false;

  const row = await db
    .prepare("SELECT id FROM contacts WHERE owner_id = ? AND joined_user_id = ? LIMIT 1")
    .bind(peer, me)
    .first<{ id: number }>();

  return row !== null;
}
