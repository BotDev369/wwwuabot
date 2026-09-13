# SPEC: Sites — Конструктор сайтів (покажчик)

Специфікація була одним файлом на 765 рядків. Її розділено на частини за темами — щоб
правити один розділ, не читаючи решту. Старі номери § збережені в назвах і в таблиці.

**Стан:** реалізовано й задеплоєно на дев-воркери; не покрито тестами (`sites/*` — пункт 1
плану в [`CONSOLIDATION_PLAN.md`](./CONSOLIDATION_PLAN.md) §3).

| Старий § | Про що | Файл |
|---|---|---|
| §0–§2 | Стан, мета, межі відповідальності, збереження даних | [`sites/01-overview.md`](./sites/01-overview.md) |
| §3 | Схема D1: `sites`, `site_pages`, `templates` | [`sites/02-d1-schema.md`](./sites/02-d1-schema.md) |
| §4 | Типи в `packages/shared` (експорт, структура) | [`sites/03-types.md`](./sites/03-types.md) |
| §5–§6 | REST-ендпоїнти в `api-dev`, статуси публікації | [`sites/04-api.md`](./sites/04-api.md) |
| §7–§8 | Маршрути обох оболонок, структура файлів | [`sites/05-routing-files.md`](./sites/05-routing-files.md) |
| §9–§10 | Вбудовані шаблони, UI-компоненти (`SiteRenderer`, `SiteBuilder`) | [`sites/06-ui.md`](./sites/06-ui.md) |
| §11–§12 | Workflow (створення → публікація → відхилення), правила | [`sites/07-workflow-rules.md`](./sites/07-workflow-rules.md) |
| §13–§14 | Тести (що покрито, чого немає), чек-ліст фаз | [`sites/08-tests-checklist.md`](./sites/08-tests-checklist.md) |
