/**
 * Агрегат «скільки людей у кожній смузі» — **те, що потрібно, щоб не бути
 * єдиним у своєму стані.**
 *
 * **Одна людина — один голос.** Рахується **останній** результат кожної
 * людини в кожному тесті, а не кожен рядок: хто проходив PHQ-9 п'ять разів,
 * має рахуватися один раз, бо інакше розподіл показує не людей, а
 * кількість тестів тих, хто зайвий час повторює.
 *
 * **Звідси не видно нікого.** Запит повертає лише `test_key`, `band_key` і
 * число. `owner_id`, дати й відповіді не залишають сервер: розподіл
 * настільки спільний, наскільки й сам по собі безпечний, — у ньому
 * немає жодної пари «хто і скільки», яку можна було б розкласти на
 * конкретну людину. Тому він і не має жодного фільтра на власника: фільтр
 * тут був бидириною (GroupBy, але все одно), а не захистом.
 *
 * **Рахуємо завжди, без винятків і без згоди.** Відмовитися не можна: щоб
 * «сховати» свій результат, треба було б зберігати його окремо від
 * результату, а це означало б другу таблицю під той самий контент
 * (`AGENTS.md` §7) і логіку, яка вирішує, чи писати в масову статистику.
 * Натомість агрегат настільки безособовий, що в ньому просто немає чого
 * ховати.
 *
 * @module api-dev/src/services/assessments-peers.service
 */

import type { PeerTallies } from "@wwwuabot/shared/assessments";

/** Рядок агрегату — звірка з `assessment_results` у `database/tables.ts`. */
interface TallyRow {
  test_key: string | null;
  band_key: string | null;
  people: number | null;
}

/**
 * `MAX(id)` — це останній **записаний** результат: `id` автоінкрементний, тож
 * він упорядковує ті самі рядки, що й `created_at`, але без неоднозначності
 * секунд (два проходження в ту ж секунду мають різні `id`, а `created_at` —
 * ні). Історію, до якої ставимось сервер, він сортує так само.
 */
const SQL_TALLIES =
  "SELECT latest.test_key AS test_key, latest.band_key AS band_key, COUNT(*) AS people" +
  " FROM assessment_results latest" +
  " JOIN (" +
  "   SELECT owner_id, test_key, MAX(id) AS last_id" +
  "   FROM assessment_results" +
  "   GROUP BY owner_id, test_key" +
  " ) picked ON picked.last_id = latest.id" +
  " GROUP BY latest.test_key, latest.band_key";

/**
 * Рахунки за всіма тестами одним запитом.
 *
 * **Лічильники, а не рядки.** `people` — це `COUNT(*)`, тобто число людей;
 * воно не може виявитися відсутнім, якщо є хоч один рядок у групі, тому
 * нульова гілка потрібна лише для рядків, зібраних не тим запитом.
 */
export async function peerTallies(db: D1Database): Promise<PeerTallies> {
  const result = await db.prepare(SQL_TALLIES).all<TallyRow>();
  const tallies: Record<string, Record<string, number>> = {};

  for (const row of result.results ?? []) {
    const testKey = row.test_key;
    const bandKey = row.band_key;
    const people = row.people ?? 0;
    if (!testKey || !bandKey || people < 1) continue;
    tallies[testKey] = { ...tallies[testKey], [bandKey]: people };
  }

  return tallies;
}
