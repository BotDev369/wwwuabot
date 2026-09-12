/**
 * Відомий борг, який перевірка `scripts/check-quality.mjs` поки що терпить.
 *
 * Той самий принцип, що й у `css-baseline.mjs`: сюди потрапляє **тільки** те, що
 * вже описано в документації як відкрита робота. Усе інше — нова помилка.
 *
 * Леджер «живий»: якщо файл із нього зник або більше не порушує — перевірка
 * впаде. Так борг не можна забути в списку після того, як його закрили.
 */

export const QUALITY_BASELINE = {
  /**
   * Логіка понад `CRITICAL_LINES` (400) — «критично» за `AGENTS.md` §3.
   * Кожен рядок — відкритий пункт плану; після поділу файл прибирається звідси.
   */ oversizedFiles: {
    // `api-dev/src/services/sites.service.ts` (777) — ЗАКРИТО 12.09.2026: поділено на
    // `services/sites/{schema,crud,pages,templates,moderation,catalog}.ts` (усі < 180).
    "web-admin-dev/src/pages/scenarios/ScenarioCardModal.tsx":
      "план §3.5 — поділ на хук + підкомпоненти",
    "packages/shared/src/components/UserProfileCard.tsx":
      "план §3.5 — поділ на хук + підкомпоненти",
    "web-admin-dev/src/pages/users/UserEditModal.tsx": "план §3.5 — поділ на хук + підкомпоненти",
  },

  /**
   * Дані, а не логіка: довгі таблиці констант. Ліміт рядків про них не
   * (дробити `icons.tsx` навпіл — шкодити, а не рефакторити).
   */
  dataOnlyFiles: [
    "packages/shared/src/constants/site-templates.ts",
    "packages/shared/src/components/icons.tsx",
    "packages/shared/src/types/site.types.ts",
  ],

  /**
   * Емодзі в UI (`AGENTS.md` §4). Список порожній: усі знайдені випадки
   * замінено на `<Icon />`. Сюди додається лише те, що справді неможливо
   * замінити (напр. символ як контент, а не як іконка інтерфейсу).
   */
  emojiInUi: [],
};
