/**
 * Типи самооцінки: тест, питання, шкала, смуга результату.
 *
 * **Тест — це дані, а не код.** Питання, варіантелі й межі смуг лежать
 * літералом у модулі тесту (`who5.ts`), а рахуванням займається одна чиста
 * функція (`score.ts`). Новий тест додається **файлом із даними**, а не
 * гілкою в розрахунку: інакше правило рахування розмножиться на два.
 *
 * **Бали рахує сервер.** Клієнт надсилає лише номери обраних варіантів, а
 * `scoreAssessment` живе в `@wwwuabot/shared` і викликається з `api-dev`.
 * Рахунок, який прийшов від клієнта, не приймається ніколи — тоді правило
 * рахування живе в одному місці, і людина не може підробити собі «нормальний»
 * результат.
 *
 * @module @wwwuabot/shared/assessments/types
 */

/** Один варіант відповіді: `value` — це бал у шкалі, `label` — що бачить людина. */
export interface ScaleOption {
  readonly value: number;
  readonly label: string;
}

/** Питання тесту. Текст без номера: порядок визначає масив `items`. */
export interface AssessmentItem {
  readonly id: string;
  readonly text: string;
  /**
   * Коротка назва сфери («Відпочинок»). Саме вона, а не текст питання,
   * потрібна людині, щоб зрозуміти, **де** її слабке місце: «20 з 25» нічого
   * не каже, а «відпочинок — 2 з 5» каже все.
   */
  readonly label: string;
  /**
   * Питання для роздумів, коли ця сфера найнижча. **Питання, а не порада й
   * не твердження про причину**: у нас немає жодного клінічного підґрунтя
   * стверджувати, чому в кого саме просів сон, і вигадана причина гірша за
   * чесне питання.
   */
  readonly weakNote?: string;
}

/**
 * Смуга результату — це **підпис до бала, а не діагноз**.
 *
 * Межі верхніх смуг (`min`/`max`) — наше рішення про те, як розмовляти з
 * людиною, а не опублікована шкала ВОЗ: у джерелах вони розходяться. Єдине,
 * що керує виводом, — перевірений `attentionBelow`.
 */
export interface AssessmentBand {
  readonly key: string;
  readonly min: number;
  readonly max: number;
  readonly label: string;
  /** Пояснення для людини: що означає ця смуга, без медичних обіцянок. */
  readonly note: string;
}

/** Джерело інструменту: обов'язкове, бо вакцинація не анонімна і має авторів. */
export interface AssessmentSource {
  readonly name: string;
  readonly citation: string;
  readonly url: string;
  readonly license: string;
}

/** Тест самооцінки: одне проходження, одне число на виході. */
export interface AssessmentTest {
  readonly key: string;
  readonly title: string;
  /** Що міряє — одне речення, без «діагнозує депресію». */
  readonly lead: string;
  /** За який період відповідає людина («за останні два тижні»). */
  readonly periodLabel: string;
  readonly items: readonly AssessmentItem[];
  /**
   * Шкала, яку показують людині. Порядок — від найбільшого бала до найменшого,
   * але це **дані для показу**: рахунок спирається на `value`, тож перестановка
   * рядків нічого не змінює в підсумку.
   */
  readonly options: readonly ScaleOption[];
  readonly bands: readonly AssessmentBand[];
  /**
   * Поріг, нижче якого результат варто обговорити з фахівцем.
   *
   * **Це єдина підтверджена межа** (Topp et al., 2015): 50 і менше — варто
   * перевірити депресію. Вона керує виводом на екрані, тож змінюється тільки
   * разом із джерелом, а не «на око».
   */
  readonly attentionBelow: number;
  /** Різниця у відсотках, яку вважають значущою зміною (документ ВОЗ Європа). */
  readonly significantChangePercent: number;
  readonly source: AssessmentSource;
  /** Показується на екрані результату. Це не формальність, а частина виводу. */
  readonly disclaimer: string;
}

/**
 * Результат, як він лежить у базі й приходить клієнту.
 *
 * **Це знімок на момент проходження, а не формула.** `percent` і `bandKey`
 * не перераховуються заднім числом: якщо зміниться шкала, минулий результат
 * мусить лишитися таким, яким його тоді показали людині.
 *
 * `answers` зберігається разом із балом, щоб результат можна було
 * перерахувати й пояснити — і щоб людина бачила свої відповіді, а не лише
 * число.
 */
export interface AssessmentRecord {
  readonly id: number;
  readonly testKey: string;
  readonly answers: readonly number[];
  readonly raw: number;
  readonly percent: number;
  readonly bandKey: string;
  readonly needsAttention: boolean;
  readonly createdAt: string;
}
