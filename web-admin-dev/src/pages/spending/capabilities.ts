/**
 * Картки можливостей Є-data: один список на хаб і на меню.
 *
 * `soon` — не прикраса, а чесний стан: картка без сторінки не веде нікуди, тож
 * і посилання не має. Щойно в можливості з'являється адреса, `soon` зникає, а
 * `to` вказує на маршрут із `app/router.tsx`.
 * @module web-admin-dev/src/pages/spending/capabilities
 */

import type { IconName } from "@wwwuabot/shared";

export interface SpendingCapability {
  readonly key: string;
  readonly title: string;
  readonly summary: string;
  readonly icon: IconName;
  /** Маршрут сторінки; у карток `soon` його немає навмисно. */
  readonly to?: string;
  readonly soon?: boolean;
}

export const SPENDING_CAPABILITIES: readonly SpendingCapability[] = [
  {
    key: "orgs",
    title: "Розпорядники",
    summary: "Хто витрачає кошти громади: договори, сплати й надходження за місяць.",
    icon: "table",
    to: "/spending/orgs",
  },
  {
    key: "payments",
    title: "Платежі",
    summary: "Усі сплати громади за період: дата, платник, отримувач, призначення й код.",
    icon: "hryvnia",
    to: "/spending/payments",
  },
  {
    key: "codes",
    title: "Коди платежів",
    summary: "КЕКВ, КПК і бюджетна програма: на що саме пішли гроші.",
    icon: "layers",
    to: "/spending/codes",
  },
  {
    key: "recipients",
    title: "Отримувачі",
    summary: "Кому громада платить найбільше — за день, місяць, рік або весь час.",
    icon: "bar-chart",
    to: "/spending/recipients",
  },
  {
    key: "sync",
    title: "Стан збору",
    summary: "Коли джерело віддало дані, які кроки впали й скільки рядків прийшло.",
    icon: "pulse",
    to: "/spending/sync",
  },
  {
    key: "budget",
    title: "Бюджет і факт",
    summary: "План видатків проти каси: де перебір, а де недовикористання.",
    icon: "percent",
    soon: true,
  },
  {
    key: "procurement",
    title: "Закупівлі",
    summary: "Тендери Prozorro та їхній зв'язок із договорами й платежами Є-data.",
    icon: "search",
    soon: true,
  },
  {
    key: "trend",
    title: "Динаміка",
    summary: "Як змінюються видатки місяць за місяцем і рік до року.",
    icon: "growth",
    soon: true,
  },
  {
    key: "risks",
    title: "Ризики",
    summary: "Дроблення закупівель, пікові дні та платежі без договору.",
    icon: "warning",
    soon: true,
  },
  {
    key: "ukraine",
    title: "Вся Україна",
    summary: "Порівняння громад і рейтинги — після того, як Буча пройде перевірку.",
    icon: "compare",
    soon: true,
  },
  {
    key: "alerts",
    title: "Сповіщення",
    summary: "Повідомлення, коли з'явився новий місяць або в даних сталася аномалія.",
    icon: "announce",
    soon: true,
  },
];
