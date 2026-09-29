/**
 * Тексти блоку «Ти не один» — **те, що людина прочитає про себе, а не про
 * шкалу.**
 *
 * **Розподіл без слів нічого не каже.** Смуги з відсотками — це числа без
 * голосу: «Помірні симптоми — 18%» легко прочитати як «менше третини хворі»,
 * хоча це лише те, хто вже відповів. Тому поруч стоїть речення: скільки
 * людей, у скількох такий самий рівень і що це означає.
 *
 * **Головна думка — «ти не один», а не «ти в гіршій групі».** Розподіл
 * існує не для оцінки, а для масштабу: «це не тільки в тебе» знімає
 * відчуття винятковості, а «в тебе гірше, ніж у більшості» його, навпаки,
 * посилює. Тому перше речення блоку завжди про те, що таких людей
 * багато, а не про те, що твоє місце в списку.
 *
 * **Число людей називається завжди.** Навіть коли воно одне («1 людина»), і
 * навіть коли вибірка мала — тоді додається окрема чесна фраза. «Більшість
 * людей…» при трьох відповідях було б твердженням про тих, кого тут немає.
 *
 * @module web-platform-dev/src/pages/assessments/peer-view
 */

import { plural, type PluralForms } from "@wwwuabot/shared/utils/plural";
import type { PeerSnapshot } from "@wwwuabot/shared/assessments";

/** «1 людина», «2 людини», «5 людей». */
const PEOPLE: PluralForms = ["людина", "людини", "людей"];

/** Скільки людей загалом: «1 людина», «34 людини». */
export function peopleCount(total: number): string {
  return `${total} ${plural(total, PEOPLE)}`;
}

/** Головний рядок блоку: скільки людей і що це означає. */
export function peerHeadline(snapshot: PeerSnapshot): string {
  if (snapshot.total === 0) {
    return "Поки що немає чужих результатів для порівняння.";
  }
  if (snapshot.total === 1) {
    return "Це поки що єдиний результат у базі — ти перший.";
  }
  return `${peopleCount(snapshot.total)} ${plural(snapshot.total, [
    "пройшла",
    "пройшли",
    "пройшли",
  ])} цей тест.`;
}

/** Скільки людей мають такий самий рівень, скільки з них — ти. */
export function peerPlace(snapshot: PeerSnapshot): string {
  if (!snapshot.mine || snapshot.total === 0) return "";
  const { people, percent } = snapshot.mine;
  const others = people - 1;
  const tail = ` — ${percent}% від тих, хто проходив.`;
  if (others <= 0) return `Ти тут один${tail}`;
  return `Такий самий рівень у ${peopleCount(others)} — крім тебе${tail}.`;
}

/**
 * **Скільки людей краще за тебе — і головне, що це не вирок.**
 *
 * Формула «кращих за тебе N» без продовження читається як оцінка. Тому далі
 * завжди йде те, що з цим можна зробити: стан рухається, а не визначений.
 */
export function peerBetter(snapshot: PeerSnapshot): string {
  const { betterPeople, total, mine } = snapshot;
  if (!mine || total === 0) return "";
  if (betterPeople === 0) {
    return "Кращих результатів тут немає — ти в найкращій групі.";
  }
  const share = Math.round((betterPeople / total) * 100);
  return `Кращих за тебе — ${peopleCount(betterPeople)} (${share}%). Стан рухається: повтори тест через два тижні й порівняй.`;
}

/**
 * Чесна фраза про малу вибірку.
 *
 * Вона **не ховає** дані й не забороняє показ: розподіл уже на екрані, і
 * людина має право його бачити. Вона лише каже, що з трьох відповідей
 * робити висновок рано — інакше розподіл із трьома людьми читається як
 * статистика про тисячі.
 */
export function peerSmallNote(snapshot: PeerSnapshot): string {
  if (!snapshot.small || snapshot.total === 0) return "";
  return "Відповідей поки мало, тож це радше орієнтир, ніж точні дані.";
}

/** Усе, що блок говорить, зібране в одному місці: екран лише малює. */
export interface PeerReading {
  readonly headline: string;
  readonly place: string;
  readonly better: string;
  readonly smallNote: string;
}

export function peerReading(snapshot: PeerSnapshot): PeerReading {
  return {
    headline: peerHeadline(snapshot),
    place: peerPlace(snapshot),
    better: peerBetter(snapshot),
    smallNote: peerSmallNote(snapshot),
  };
}
