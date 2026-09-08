# Кришталева система оцінки (Crystal Scorecard)

> **Версія:** 1.0
> **Дата створення:** 08.09.2026
> **Мета:** Об'єктивна, повторювана оцінка якості проєкту wwwuabot за
> міжнародними стандартами, орієнтована на мету — 1 000 000 користувачів за рік.
> **Стандарти:** ISO/IEC 25010:2023, OWASP ASVS 4.0, DORA Metrics, Google SRE.

---

## 1. Філософія

Попередня система оцінки (`SCORECARD.md`) мала 10 критеріїв з інтуїтивними
балами. Вона була корисна як стартовий чек-ліст, але:

- **Завищувала реальність** — бал 7.4/9 при глибокому аналізі виявився ~4.2/9
- **Пропускала цілі сфери** — performance, accessibility, incident response, GDPR
- **Не мала чітких орієнтирів** — що означає "7" для безпеки? Для кого?
- **Не відділяла зовнішню безпеку від внутрішньої** — одна позиція на все

**Кришталева система** базується на:
- **ISO/IEC 25010:2023** — міжнародний стандарт якості ПЗ (9 характеристик, 31 підхарактеристика)
- **OWASP ASVS 4.0** — стандарт перевірки безпеки додатків (рівень L2 для нашого профілю)
- **DORA Metrics** — 4 ключові метрики DevOps-продуктивності (Google/DORA)
- **Google SRE** — SLI/SLO/Error Budgets для надійності

---

## 2. Методика

### Шкала балів (0–9)

Кожен критерій оцінюється від **0 до 9** з чітким описом що означає кожен рівень:

| Бал | Рівень | Опис |
|:---:|---|---|
| **0** | Відсутнє | Критерій взагалі не реалізовано |
| **1** | Критично | Є елементарні спроби, але системно не працює |
| **2** | Мінімум | Базові речі зроблені, але багато прогалин |
| **3** | Базовий | Є основа, але не повністю, є серйозні прогалини |
| **4** | Нижче середнього | Працює частково, потребує суттєвого покращення |
| **5** | Середній | Працює для базових випадків, є слабкі місця |
| **6** | Вище середнього | Добре реалізовано, є окремі недоліки |
| **7** | Хороший | Солідна реалізація, дрібні покращення можливі |
| **8** | Відмінний | Практично повна реалізація, мінорні питання |
| **9** | Кришталевий | Повна відповідність стандарту, кращі практики |

### Правила оцінювання

1. **Один бал = один факт.** Не "на око", а з посиланням на конкретний код/документ.
2. **Завжди оцінювати як "для 1 млн користувачів".** Масштаб змінює вимоги.
3. **Бал не може бути вищим за найслабший підкритерій домену.**
4. **Оцінка переглядається кожні 4 тижні** після завершення задач.

### Підрахунок

- Кожен домен = середній бал підкритеріїв
- Загальний бал = середній бал 5 доменів (без вагових коефіцієнтів)
- **Ціль на рік:** загальний бал ≥ **7.5/9**, жоден критерій < **5**

---

## 3. ДОМЕН 1: ЯКІСТЬ ПРОДУКТУ (ISO 25010)

> *Джерело: ISO/IEC 25010:2023 — Product Quality Model*
> *Відповідні підхарактеристики: Functional Suitability, Performance Efficiency, Reliability, Safety*

### 1.1 Функціональна повнота (Functional Completeness)

> Чи покриті всі заявлені функції платформи?

| Бал | Опис |
|:---:|---|
| 0 | Більшість заявлених функцій не працюють |
| 3 | Є базові функції, але великі прогалини в product vision |
| 6 | Більшість функцій працюють, є MVP для кожного модуля |
| 9 | Всі функції з PRODUCT_VISION.md реалізовані та працюють |

**Оцінка: 5/9**

**Докази (+):**
- Telegram-бот працює: команди, callback queries, scenario routing
- API працює: CRUD користувачів, сценаріїв, MyDates
- Web Platform: TWA auth, Page Builder MVP (5 блоків), catch-all routes
- Web Admin: CRUD користувачів, сценаріїв, JSON-редактор Page Builder
- Дизайн-система: Apple/Material теми, SVG-іконки, conditional rendering

**Докази (−):**
- ❌ Маркетплейс "Купи-Продай" — не реалізовано
- ❌ Обмін/Благодійність "Дарую" — не реалізовано
- ❌ Соціальна мережа — не реалізовано
- ❌ Smart Social Sharing — не реалізовано
- ❌ Page Builder: лише 5 MVP-блоків з планованої бібліотеки
- ❌ Більшість сервісів з PRODUCT_VISION — на етапі ідеї

---

### 1.2 Функціональна коректність (Functional Correctness)

> Чи правильні розрахунки, валідація, бізнес-логіка?

| Бал | Опис |
|:---:|---|
| 0 | Критичні розрахунки помилкові, дані втрачаються |
| 3 | Базова логіка працює, але є edge case баги |
| 6 | Основна логіка коректна, є тести на критичні функції |
| 9 | Повна коректність, підтверджена тестами, edge cases покриті |

**Оцінка: 5/9**

**Докази (+):**
- ✅ Family Box парсинг: `getFamilyBox()` безпечний (повертає `{}` при помилці)
- ✅ `formatSqliteDatetime()` протестований (datetime.test.ts)
- ✅ ConditionEvaluator протестований (condition-evaluator.test.ts)
- ✅ UsersService протестований (users.service.test.ts)
- ✅ D1 parameterized queries — SQL injection захищений на рівні API

**Докази (−):**
- ❌ немає Zod/TypeBox схем для API вхідних даних
- ❌ ручна валідація = прогалини (не всі поля перевіряються)
- ❌ критична бот-логіка (scenario routing, callback handlers) без тестів
- ❌ Page Builder блоки без тестів
- ❌ калькулятори (якщо є) без validation tests

---

### 1.3 Product Performance (час відповіді, ресурси)

> Наскільки швидко працює для користувача?

| Бал | Опис |
|:---:|---|
| 0 | Сторінки не завантажуються, API timeout |
| 3 | Працює повільно, користувачі скаржаться |
| 6 | Прийнятна швидкість, є кешування, p95 < 500ms |
| 9 | Швидко скрізь: p95 < 200ms, mobile TTI < 2s, є моніторинг |

**Оцінка: 3/9**

**Докази (+):**
- ✅ Cloudflare Workers = zero cold start (архітектурна перевага)
- ✅ KV кеш для контенту в api/
- ✅ Service binding web → api (без мережевого оверхеду в prod)

**Докази (−):**
- ❌ **Немає жодного performance metric** — невідомо p95 latency
- ❌ **Немає моніторингу** — невідомо як працює в реальному часі
- ❌ D1 queries можуть бути повільними (CPU-time limit 30ms на Worker)
- ❌ `SELECT *` на users (виправлено частково, але ризик залишається)
- ❌ Немає CDN caching strategy для статичного контенту
- ❌ Немає lazy loading для великих сторінок
- ❌ Mobile TTI не вимірюється

---

### 1.4 Надійність (Reliability)

> Чи працює стабільно? Що відбувається при помилках?

| Бал | Опис |
|:---:|---|
| 0 | Часті збої, дані втрачаються, немає відновлення |
| 3 | Працює в основному, але при помилках — падає без fallback |
| 6 | Graceful degradation, retry logic, error boundaries |
| 9 | SLI/SLO визначені, error budget, автоматичне відновлення |

**Оцінка: 3/9**

**Докази (+):**
- ✅ `getFamilyBox()` повертає `{}` при битому JSON (не падає)
- ✅ Bot dispatcher має try/catch з fallback на admin group
- ✅ Авто-міграція D1 (withAutoMigrate) — не падає при нових колонках

**Докази (−):**
- ❌ **Немає ErrorBoundary** — помилка React-рендеру = білий екран
- ❌ **Немає retry logic** для API calls з TWA
- ❌ **Немає circuit breaker** для зовнішніх сервісів (Cloudinary, Telegram API)
- ❌ **Немає graceful degradation** для Page Builder (SD-4 відкрита)
- ❌ **Немає SLI/SLO** — невідомо скільки downtime допустимо
- ❌ **Немає error budget** — невідомо скільки помилок "нормально"
- ❌ D1 без backup strategy

---

### 1.5 Безпека даних (Safety — data loss prevention)

> Чи захищені дані користувача від втрати?

| Бал | Опис |
|:---:|---|
| 0 | Дані можуть бути втрачені без попередження |
| 3 | Є базовий захист, але critical flows без safeguard |
| 6 | Unsaved changes warning, undo для основних операцій |
| 9 | Повний data protection: undo, versioning, backup, retention policy |

**Оцінка: 3/9**

**Докази (+):**
- ✅ Unsaved changes warning на деяких сторінках (dirty indicator на кнопці)
- ✅ D1 автоматичне бекапування (Cloudflare managed)

**Докази (−):**
- ❌ **Немає undo** для жодної операції
- ❌ Немає versioning даних (сценарії, користувачі)
- ❌ Немає confirmation dialog для деструктивних дій (delete user)
- ❌ Немає data export для користувача (GDPR requirement)
- ❌ Немає data retention policy (скільки зберігати дані)

---

## 4. ДОМЕН 2: БЕЗПЕКА (OWASP ASVS Level 2)

> *Джерело: OWASP Application Security Verification Standard 4.0*
> *Рівень L2: для додатків з чутливими даними (PII, authentication)*
> *Профіль: Telegram Mini App, збирає PII (імена, дати, telegram ID)*

### 2.1 Аутентифікація та сесії (Authentication & Session)

> Як користувач доводить що він це він? Як керуються сесії?

| Бал | Опис |
|:---:|---|
| 0 | Немає auth, все публічне |
| 3 | Auth є, але без expiry, без refresh, без invalidation |
| 6 | Auth з token expiry, refresh, session management |
| 9 | Multi-factor, rate limiting на auth, audit log, anomaly detection |

**Оцінка: 4/9**

**Докази (+):**
- ✅ TWA SDK auth для web-platform (перевірка Telegram initData)
- ✅ Cookie + HMAC для web-admin
- ✅ Admin gate на API router (isAuthenticated, додано 01.09)

**Докази (−):**
- ❌ **Немає token refresh mechanism** — TWA SDK token не оновлюється
- ❌ **Немає session invalidation** — logout не працює повноцінно
- ❌ **Немає rate limiting на auth endpoints** — brute force можливий
- ❌ HMAC secret = один `ADMIN_SECRET` на весь сервіс
- ❌ Немає audit log auth-подій

---

### 2.2 Авторизація та контроль доступу (Authorization & Access Control)

> Що користувач може робити? Чи є role-based access?

| Бал | Опис |
|:---:|---|
| 0 | Немає контролю доступу, будь-хто може все |
| 3 | Є базовий role check, але не скрізь |
| 6 | Role-based access control, permission checks на кожному endpoint |
| 9 | ABAC/RBAC, permission inheritance, audit trail, least privilege |

**Оцінка: 4/9**

**Докази (+):**
- ✅ Role/tariff/status/permissions поля в users таблиці
- ✅ Admin gate для /api/admin/* та /api/portal/* в api/router.ts
- ✅ Conditional rendering в Page Builder (role[], tariff[], permissions[])

**Докази (−):**
- ❌ **Admin gate тільки на рівні router** — окремі controllers можуть бути викликані напряму
- ❌ **Немає permission checks на конкретні дії** — admin може все без розрізнення
- ❌ web-admin worker.ts API routes без перевірки (тимчасовий виняток)
- ❌ Немає audit trail для admin дій (хто, коли, що змінив)

---

### 2.3 Валідація введення та захист від injection (Input Validation)

> Чи перевіряються всі вхідні дані? Чи захищений API від injection?

| Бал | Опис |
|:---:|---|
| 0 | Немає валідації, raw input → DB |
| 3 | Базова валідація на деяких endpoints, D1 parameterized queries |
| 6 | Zod/TypeBox схеми на всіх API, comprehensive validation |
| 9 | Defense in depth: schema + sanitization + rate limiting + WAF |

**Оцінка: 3/9**

**Докази (+):**
- ✅ D1 parameterized queries (API level) — SQL injection захищений
- ✅ `validateButtons()` для клавіатури
- ✅ Валідація типів сценаріїв (VALID_TYPES)

**Докази (−):**
- ❌ **Немає Zod/TypeBox схем** — валідація ручна і фрагментарна
- ❌ **Немає input sanitization** для rich text (XSS можливий)
- ❌ **Немає request body size limits** — великий payload може вбити Worker
- ❌ Немає валідації URL parameters (path traversal)
- ❌ Немає sanitization для Cloudinary upload URLs

---

### 2.4 Захист даних (Data Protection — PII)

> Як захищені персональні дані користувачів?

| Бал | Опис |
|:---:|---|
| 0 | PII зберігається відкрито, без захисту |
| 3 | PII в DB, є access control, але без encryption |
| 6 | Encryption at rest/transit, data classification, retention policy |
| 9 | Full GDPR compliance: consent, deletion, portability, DPO |

**Оцінка: 3/9**

**Докази (+):**
- ✅ HTTPS для всіх комунікацій (Cloudflare)
- ✅ PII не виводиться у логах (buildLogMessage обрізає)

**Докази (−):**
- ❌ **Немає encryption at rest** — D1 SQLite без додаткового шифрування
- ❌ **Немає data classification** — невідомо які дані де зберігаються
- ❌ **Немає data retention policy** — невідомо скільки зберігати
- ❌ **Немає GDPR deletion process** — користувач не може видалити свої дані
- ❌ **Немає cookie consent** — web-platform може порушувати ePrivacy
- ❌ Немає data processing agreement з Cloudflare

---

### 2.5 Інфраструктурна безпека (Infrastructure Security)

> CORS, CSP, rate limiting, secrets management, security headers.

| Бал | Опис |
|:---:|---|
| 0 | Без security headers, без rate limiting, CORS * |
| 3 | Є базові headers, rate limiting на частині endpoints |
| 6 | Повний набір security headers, rate limiting скрізь, CSP |
| 9 | WAF, DDoS protection, security audit, penetration testing |

**Оцінка: 2/9**

**Докази (+):**
- ✅ Secrets у vars (не в коді)
- ✅ Cloudflare DDoS protection (базовий, automatic)
- ✅ `.gitignore` коректний

**Докази (−):**
- ❌ **Немає rate limiting на API endpoints** — будь-хто може ддосити
- ❌ **Немає CORS policy** — невідомо чи API обмежує origins
- ❌ **Немає CSP headers** — XSS атаки можливі
- ❌ **Немає security headers** — X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- ❌ **Немає CSRF protection** для web-admin (cookie auth без CSRF tokens)
- ❌ Немає security audit
- ❌ `no-explicit-any` rule на "warn" — можна додати unsafe code

---

### 2.6 Безпека залежностей (Dependency Security)

> Чи оновлюються залежності? Чи є відомі вразливості?

| Бал | Опис |
|:---:|---|
| 0 | Залежності не оновлюються, є known CVE |
| 3 | Dependabot увімкнений, але alerts не обробляються |
| 6 | Dependabot + npm audit в CI, alerts обробляються |
| 9 | SBOM, automated patching, license audit, supply chain security |

**Оцінка: 5/9**

**Докази (+):**
- ✅ Dependabot увімкнений
- ✅ `npm audit` в CI pipeline
- ✅ npm audit блокує critical vulnerabilities

**Докази (−):**
- ❌ npm audit неблокуючий для high severity
- ❌ Немає SBOM (Software Bill of Materials)
- ❌ Немає license audit (AGPL compliance)
- ❌ Немає automated patching

---

## 5. ДОМЕН 3: ІНЖЕНЕРНА ДОСКОНАЛІСТЬ

> *Джерело: ISO 25010 Maintainability, REFACTORING_ROADMAP.md*

### 3.1 Архітектура та модульність (Architecture & Modularity)

> Чи добре організований код? Чи дотримується SRP?

| Бал | Опис |
|:---:|---|
| 0 | Все в одному файлі, без модулів |
| 3 | Є спроба, але моноліти, непослідовна структура |
| 6 | Чітка модульна структура, є слабкі місця |
| 9 | Фрактальна архітектура, легко передбачити де що знаходиться |

**Оцінка: 7/9**

**Докази (+):**
- ✅ `bot/` — зразкова модульна структура (core/, modules/, repositories/, api/)
- ✅ `api/` — router + controllers + shared (розбито P1-1)
- ✅ `packages/shared/` — спільний код, єдине джерело істини
- ✅ `packages/ui/` — спільний React-пакет для Page Builder
- ✅ Правило "двічі — в спільне" документоване в AGENTS.md

**Докази (−):**
- ❌ `web-platform-dev/src/pages/mydate/MyDatesPage.tsx` — 1167 рядків (моноліт)
- ❌ `web-admin-dev/src/features/page-builder/PageBuilderInline.tsx` — 572 рядки
- ❌ `web-admin-dev/src/pages/scenarios-v2/ScenariosV2Table.tsx` — 533 рядки
- ❌ `web-admin/worker.ts` містить API-маршрути (тимчасовий виняток, не закритий)
- ❌ SD-1..SD-5 (scenario-driven platform) не завершені

---

### 3.2 Типізація (Type Safety)

> Чи строгий TypeScript? Чи є контракти між компонентами?

| Бал | Опис |
|:---:|---|
| 0 | Loose TS, `any` скрізь |
| 3 | Strict mode, але є `any` або weak types |
| 6 | 0 any, strict types, але немає runtime validation |
| 9 | Strict TS + Zod schemas + contract-first API + generated types |

**Оцінка: 6/9**

**Докази (+):**
- ✅ 0 `any` у всьому монорепо (ліквідовано P2-1)
- ✅ Strict TypeScript
- ✅ Суворі типи для доменних сутностей (MyDate, Telegram, BotUser, BlockRegistry)
- ✅ `tsc --noEmit` чистий

**Докази (−):**
- ❌ `@typescript-eslint/no-explicit-any` = **"warn"**, не "error"
- ❌ **Немає runtime validation** (Zod/TypeBox) — типи є тільки на compile-time
- ❌ **Немає API contract** між фронтендом та бекендом (endpoint types визначені окремо)
- ❌ Немає generated types з D1 schema

---

### 3.3 Якість коду (Code Quality — enforceability)

> Чи блокує лінтер коміт? Чи форматується код автоматично?

| Бал | Опис |
|:---:|---|
| 0 | Немає лінтера, стиль хаотичний |
| 3 | Лінтер є, але не скрізь, не в CI |
| 6 | Лінтер + форматер скрізь, в CI, але не блокує коміт |
| 9 | Pre-commit hooks + CI gate + auto-fix + strict rules |

**Оцінка: 5/9**

**Докази (+):**
- ✅ ESLint + Prettier підключені у всіх 4 сервісах
- ✅ `.editorconfig` єдиний
- ✅ Lint в CI pipeline

**Докази (−):**
- ❌ **Немає pre-commit hook** — лінтер не блокує коміт локально
- ❌ **Lint в CI неблокуючий** для warn-level issues
- ❌ `no-explicit-any` на "warn" — не блокує появу new `any`
- ❌ Немає lint-staged / husky

---

### 3.4 Тестове покриття (Test Coverage)

> Чи є тести? Чи блокують CI? Який coverage?

| Бал | Опис |
|:---:|---|
| 0 | Тестів немає взагалі |
| 3 | Є поодинокі тести, без системи, не в CI |
| 6 | Основна бізнес-логіка покрита, тести в CI gate |
| 9 | Unit + integration + e2e, coverage threshold, mutation testing |

**Оцінка: 3/9**

**Докази (+):**
- ✅ Vitest підключений (кореневий config)
- ✅ 34 unit-тести (packages/shared + api-dev/UsersService)
- ✅ Тести швидкі (<900ms)
- ✅ Jest badge в README

**Докази (−):**
- ❌ **34 тести на ~15K+ рядків коду = <2% покриття**
- ❌ **Немає integration тестів** (API → D1)
- ❌ **Немає e2e тестів** (TWA flows)
- ❌ **Немає тестів на бот-логіку** (callback handlers, scenario routing)
- ❌ **Немає тестів на security** (auth bypass, injection)
- ❌ **Немає тестів на Page Builder** блоки
- ❌ **Тests не в CI gate** (S-6 відкрита)
- ❌ Немає coverage threshold

---

### 3.5 Підтримуваність (Maintainability)

> Наскільки легко змінювати код? Чи є дуплікація?

| Бал | Опис |
|:---:|---|
| 0 | Неможливо змінювати, все залежить від усього |
| 3 | Можна змінювати, але легко зламати щось |
| 6 | Модульний, зрозумілий, мінімум дуплікації |
| 9 | Self-documenting code, <150 рядків/файл, <5% duplication |

**Оцінка: 6/9**

**Докази (+):**
- ✅ Дуплікати видалені (auto-migrate, datetime, VALID_TYPES)
- ✅ JSDoc на shared-функціях
- ✅ CONTRIBUTING.md з правилами
- ✅ AGENTS.md з де що шукати

**Докази (−):**
- ❌ Моноліти 300-1167 рядків
- ❌ Змішані стилі CSS + Tailwind
- ❌ Немає CHANGELOG (неможливо відстежити зміни)

---

## 6. ДОМЕН 4: DEVOPS ТА ОПЕРАЦІЇ (DORA + Google SRE)

> *Джерело: DORA Four Key Metrics, Google SRE Book*
> *Метрики: Deployment Frequency, Lead Time, Change Failure Rate, MTTR*

### 4.1 CI/CD Pipeline

> Як часто деплоїться? Що перевіряється перед деплоєм?

| Бал | Опис |
|:---:|---|
| 0 | Деплой вручну |
| 3 | Автодеплой, без перевірок |
| 6 | Автодеплой + path filtering + lint + tests в CI |
| 9 | CI/CD з staging, approval, canary deploys, DORA metrics tracked |

**Оцінка: 6/9**

**Докази (+):**
- ✅ GitHub Actions автоматичний деплой на push до main
- ✅ Path filtering (деплоїться тільки змінений воркер)
- ✅ `npx wrangler deploy --env dev` для кожного воркера
- ✅ Lint в CI

**Докази (−):**
- ❌ **Тести НЕ в CI gate** (S-6 відкрита)
- ❌ Деплой одразу в prod (немає staging)
- ❌ Немає approval step

---

### 4.2 Безпека деплою (Deployment Safety)

> Чи є staging? Чи є rollback? Чи є gradual rollout?

| Бал | Опис |
|:---:|---|
| 0 | Деплой в prod без перевірки, rollback вручну |
| 3 | Є dev/prod розділення, але без staging |
| 6 | Staging env, automated rollback, gradual rollout |
| 9 | Canary deploys, feature flags, automated rollback on metrics |

**Оцінка: 2/9**

**Докази (+):**
- ✅ `[env.dev]` та `[env.production]` в wrangler.toml
- ✅ Відмінні database_id для dev/prod

**Докази (−):**
- ❌ **Немає staging environment** — все одразу в prod
- ❌ **Немає automated rollback** — при збої треба фіксити вручну
- ❌ **Немає gradual rollout** — повний deploй на всіх
- ❌ **Немає deployment approval** — будь-хто з main може задеплоїти
- ❌ Немає feature flags

---

### 4.3 Спостережуваність (Observability)

> Чи можна зрозуміти "що пішло не так" без доступу до сервера?

| Бал | Опис |
|:---:|---|
| 0 | Немає логування, помилки зникають |
| 3 | console.log подекуди, немає структури |
| 6 | Structured logging в key services, basic metrics |
| 9 | Full observability: logs + metrics + traces + alerts + dashboards |

**Оцінка: 2/9**

**Докази (+):**
- ✅ Bot logging через Cloudflare Queue (найкраща частина)
- ✅ `apiLog` з префіксом `[api]` в api/
- ✅ `console.log` прибрано з продакшн-коду

**Докази (−):**
- ❌ **Немає structured logging** — `apiLog` = console.log з кольором
- ❌ **Немає metrics** — latency, error rates, throughput — невідомі
- ❌ **Немає ErrorBoundary** в React-додатках — білий екран при помилці
- ❌ **Немає Sentry/Error tracking** — помилки зникають
- ❌ **Немає alerting** — збої непомітні
- ❌ **Немає correlation ID** — діагностика між TWA → API → D1 неможлива
- ❌ Web-додатки без будь-якого логування помилок

---

### 4.4 Реагування на інциденти (Incident Response)

> Що робити коли все впало?

| Бал | Опис |
|:---:|---|
| 0 | Немає плану, паніка при збої |
| 3 | Є контакти, але немає runbook |
| 6 | Runbook є, є alerting, є process |
| 9 | Full incident management: on-call, runbook, post-mortem, SLA |

**Оцінка: 1/9**

**Докази (+):**
- ✅ Bot dispatcher відправляє помилки в admin group (автоматично)

**Докази (−):**
- ❌ **Немає runbook** — що робити при збої D1?
- ❌ **Немає alerting** — невідомо коли щось впало
- ❌ **Немає on-call process** — хто відповідає за нічний збій?
- ❌ **Немає post-mortem process** — помилки не аналізуються
- ❌ **Немає incident communication plan** — як повідомляти користувачів?

---

### 4.5 Моніторинг продуктивності (Performance Monitoring)

> Чи вимірюється latency, throughput, error rates в реальному часі?

| Бал | Опис |
|:---:|---|
| 0 | Невідомо як працює в проді |
| 3 | Є базові логи, але немає метрик |
| 6 | Метрики latency/throughput, dashboard, alerts |
| 9 | Full APM: distributed tracing, real-user monitoring, auto-scaling alerts |

**Оцінка: 1/9**

**Докази (+):**
- ✅ Cloudflare Workers Analytics (зовнішній сервіс, але не налаштований)

**Докази (−):**
- ❌ **Немає latency metrics** — невідомо p50/p95/p99
- ❌ **Немає error rate metrics** — невідомо % помилок
- ❌ **Немає throughput metrics** — невідомо RPS
- ❌ **Немає D1 query metrics** — невідомо скільки часу займають запити
- ❌ **Немає Real User Monitoring (RUM)** — невідомо mobile TTI
- ❌ **Немає alerting на performance degradation**

---

## 7. ДОМЕН 5: КОРИСТУВАЦЬКИЙ ДОСВІД ТА БІЗНЕС

> *Джерело: ISO 25010 Interaction Capability, Product Vision*

### 5.1 Мобільний UX (Mobile UX)

> Як працює на смартфоні? Це основна платформа (TWA).

| Бал | Опис |
|:---:|---|
| 0 | Не працює на мобільних |
| 3 | Працює, але є проблеми з touch targets, layout |
| 6 | Добре на мобільних, є loading states, offline states |
| 9 | Native-like experience, gestures, haptic, offline-first |

**Оцінка: 5/9**

**Докази (+):**
- ✅ TWA = мобільний додаток у Telegram
- ✅ React 19 + Tailwind 4 = сучасний mobile-first stack
- ✅ Loading skeletons (частково)
- ✅ Theme toggle (Apple/Material)

**Докази (−):**
- ❌ **Немає offline states** — при втраті зв'язку = помилка
- ❌ Немає pull-to-refresh
- ❌ Немає skeleton для всіх сторінок
- ❌ Немає touch gesture support
- ❌ Mobile performance не вимірюється

---

### 5.2 Accessibility (A11y)

> Чи доступний для людей з обмеженими можливостями?

| Бал | Опис |
|:---:|---|
| 0 | 0 aria labels, 0 focus management |
| 3 | Є базові semantic HTML, але без aria |
| 6 | WCAG 2.1 AA compliance, screen reader support |
| 9 | WCAG 2.1 AAA, keyboard navigation, high contrast, screen reader tested |

**Оцінка: 2/9**

**Докази (+):**
- ✅ Semantic HTML (div structure в основному)
- ✅ CSS змінні для тем (dark/light)

**Докази (−):**
- ❌ **0 aria-labels** в коді
- ❌ **0 focus management** — модалки не trap focus
- ❌ **0 keyboard navigation test**
- ❌ **Немає contrast check** — кольори можуть не проходити WCAG AA
- ❌ Немає skip-to-content link
- ❌ Немає screen reader testing

---

### 5.3 Консистентність дизайн-системи (Design System Consistency)

> Чи всі компоненти використовують токени? Чи немає хардкоду?

| Бал | Опис |
|:---:|---|
| 0 | Хаотичні стилі, кожен файл по-своєму |
| 3 | Є дизайн-система, але не скрізь використовується |
| 6 | Більшість на токенах, є хардкод в окремих файлах |
| 9 | 100% токени, 0 хардкоду, automated check |

**Оцінка: 5/9**

**Докази (+):**
- ✅ CSS токени: --bg-1..4, --text-*, --accent, --green/red/yellow
- ✅ Apple/Material теми через CSS змінні
- ✅ `.wb-*` компонентні класи (btn, card, modal, badge)
- ✅ SVG-іконки замість емоджі (~30)

**Докази (−):**
- ❌ **43 хардкоджених hex-кольори** (26 в web-admin + 17 в web-platform)
- ❌ **Border-radius в пікселях** замість `var(--radius-*)`
- ❌ Змішані стилі CSS + Tailwind в web-admin
- ❌ AboutPage та MydateResultPage досі на локальних класах

---

### 5.4 Онбординг (Onboarding Flow)

> Як новий користувач починає користуватись платформою?

| Бал | Опис |
|:---:|---|
| 0 | Немає онбордингу, користувач губиться |
| 3 | Є auth flow, але далі — пуста сторінка |
| 6 | Онбординг-туторіал, empty states, guided first steps |
| 9 | Персоналізований онбординг, onboarding checklist, progress tracking |

**Оцінка: 4/9**

**Докази (+):**
- ✅ TWA auth = миттєвий вхід (один клік)
- ✅ Bot як "вхідні двері" — швидкий старт
- ✅ Є деякі empty states

**Докази (−):**
- ❌ **Немає онбординг-туторіалу** — що робити після входу?
- ❌ **Немає guided first steps** — новий користувач не знає про можливості
- ❌ Немає welcome screen з поясненням платформи
- ❌ Немає progress indicator (що вже налаштував)

---

### 5.5 UX помилок (Error UX)

> Як платформа показує помилки користувачу?

| Бал | Опис |
|:---:|---|
| 0 | Білий екран при помилці |
| 3 | Є toast notifications, але критичні помилки = білий екран |
| 6 | ErrorBoundary з fallback UI, user-friendly errors |
| 9 | Error pages, recovery paths, offline mode, retry buttons |

**Оцінка: 3/9**

**Докази (+):**
- ✅ Toast notifications (wb-toast)
- ✅ Декілька user-friendly error messages в bot

**Докази (−):**
- ❌ **Немає ErrorBoundary** — React crash = білий екран
- ❌ **Немає error pages** (404, 500)
- ❌ Немає retry buttons при мережевих помилках
- ❌ Немає offline mode
- ❌ SD-4 (fallback page при падінні БД) не зроблена

---

### 5.6 Документація (Documentation)

> Чи зрозуміло як користуватись, розробляти, деплоїти?

| Бал | Опис |
|:---:|---|
| 0 | Немає документації |
| 3 | Є README, але без інструкцій |
| 6 | README + CONTRIBUTING + AGENTS.md + service READMEs |
| 9 | Все з 6 + API docs + changelog + architecture diagrams |

**Оцінка: 7/9**

**Докази (+):**
- ✅ README.md з повною візією, архітектурою, quick start
- ✅ CONTRIBUTING.md з регламентом
- ✅ AGENTS.md v1.4 з повним описом конвенцій
- ✅ PRODUCT_VISION.md, REFACTORING_ROADMAP.md, SCORECARD.md, AUDIT.md
- ✅ README в кожному сервісі
- ✅ DESIGN_SYSTEM.md

**Докази (−):**
- ❌ **Немає CHANGELOG** — неможливо відстежити зміни
- ❌ **Немає API documentation** — як використовувати API endpoints
- ❌ **Немає architecture diagrams** — тільки ASCII-арт
- ❌ **Документи суперечать одне одному** (AGENTS.md vs SCORECARD vs PROJECT_PLAN)

---

### 5.7 Приватність та compliance (Privacy & Compliance)

> Чи відповідає GDPR? Чи є cookie consent?

| Бал | Опис |
|:---:|---|
| 0 | Збирає PII без жодного compliance |
| 3 | Є LICENSE + privacy policy, але без GDPR process |
| 6 | GDPR-compliant: consent, deletion, retention, DPA |
| 9 | Full compliance: DPO, audit trail, data portability, breach notification |

**Оцінка: 3/9**

**Докази (+):**
- ✅ LICENSE (AGPL v3)
- ✅ Privacy policy (web/public/privacy.html)
- ✅ Prod/dev бази розділені

**Докази (−):**
- ❌ **Немає GDPR deletion process** — користувач не може видалити дані
- ❌ **Немає cookie consent** — ePrivacy порушення
- ❌ **Немає data retention policy** — невідомо скільки зберігати
- ❌ **Немає data portability** — користувач не може експортувати свої дані
- ❌ Немає DPA (Data Processing Agreement) з Cloudflare

---

### 5.8 Готовність для стейкхолдерів (Stakeholder Readiness)

> Як виглядає для інвестора/партнера за перші 5 хвилин?

| Бал | Опис |
|:---:|---|
| 0 | Виглядає як чернетковий проєкт |
| 3 | Є README, але немає інших сигналів зрілості |
| 6 | README + badges + CONTRIBUTING + roadmap |
| 9 | Все з 6 + demo + public changelog + architecture docs |

**Оцінка: 5/9**

**Докази (+):**
- ✅ README з badges (CI, tests, TypeScript, Cloudflare, license)
- ✅ CONTRIBUTING.md
- ✅ PRODUCT_VISION.md з ребрендингом
- ✅ REFACTORING_ROADMAP.md

**Докази (−):**
- ❌ **Немає demo** — стейкхолдер не може побачити робочий продукт
- ❌ **Немає CHANGELOG** — не видно історію змін
- ❌ **Немає architecture diagram** — складно зрозуміти архітектуру
- ❌ Немає public roadmap (тільки internal)

---

### 5.9 AI-Agent Readiness

> Чи легко AI-агенту зрозуміти та працювати з проєктом?

| Бал | Опис |
|:---:|---|
| 0 | AI-агент змушений вгадувати все |
| 3 | Є базова структура, але немає опису конвенцій |
| 6 | AGENTS.md + CONTRIBUTING + передбачувана структура |
| 9 | Все з 6 + auto-generated docs, consistent patterns, self-documenting |

**Оцінка: 8/9**

**Докази (+):**
- ✅ AGENTS.md v1.4 — найкраща частина проєкту
- ✅ Доменні терміни описані (Scenario, Family Box, Page Builder)
- ✅ "Чого НЕ робити" — реальні прецеденти
- ✅ Структура коду передбачувана
- ✅ CONTRIBUTING.md з правилами для AI

**Докази (−):**
- ❌ AGENTS.md суперечить SCORECARD і PROJECT_PLAN (тести, CONTRIBUTING)
- ❌ Різні AI-агенти пишуть різні версії документів
- ❌ Немає automated doc generation

---

## 8. ПІДСУМКОВА ТАБЛИЦЯ

### Домен 1: Якість продукту

| # | Критерій | Бал |
|---|---|:---:|
| 1.1 | Functional Completeness | **5** |
| 1.2 | Functional Correctness | **5** |
| 1.3 | Product Performance | **3** |
| 1.4 | Reliability | **3** |
| 1.5 | Safety (data loss prevention) | **3** |
| | **Середній домену** | **3.8** |

### Домен 2: Безпека (OWASP ASVS)

| # | Критерій | Бал |
|---|---|:---:|
| 2.1 | Authentication & Session | **4** |
| 2.2 | Authorization & Access Control | **4** |
| 2.3 | Input Validation & Injection | **3** |
| 2.4 | Data Protection (PII) | **3** |
| 2.5 | Infrastructure Security | **2** |
| 2.6 | Dependency Security | **5** |
| | **Середній домену** | **3.5** |

### Домен 3: Інженерна досконалість

| # | Критерій | Бал |
|---|---|:---:|
| 3.1 | Architecture & Modularity | **7** |
| 3.2 | Type Safety | **6** |
| 3.3 | Code Quality (enforceability) | **5** |
| 3.4 | Test Coverage | **3** |
| 3.5 | Maintainability | **6** |
| | **Середній домену** | **5.4** |

### Домен 4: DevOps та операції (DORA)

| # | Критерій | Бал |
|---|---|:---:|
| 4.1 | CI/CD Pipeline | **6** |
| 4.2 | Deployment Safety | **2** |
| 4.3 | Observability | **2** |
| 4.4 | Incident Response | **1** |
| 4.5 | Performance Monitoring | **1** |
| | **Середній домену** | **2.4** |

### Домен 5: UX та бізнес

| # | Критерій | Бал |
|---|---|:---:|
| 5.1 | Mobile UX | **5** |
| 5.2 | Accessibility (A11y) | **2** |
| 5.3 | Design System Consistency | **5** |
| 5.4 | Onboarding Flow | **4** |
| 5.5 | Error UX | **3** |
| 5.6 | Documentation | **7** |
| 5.7 | Privacy & Compliance | **3** |
| 5.8 | Stakeholder Readiness | **5** |
| 5.9 | AI-Agent Readiness | **8** |
| | **Середній домену** | **4.7** |

---

## 📊 ЗАГАЛЬНИЙ БАЛ: **4.0 / 9 (≈ 44%)**

| Домен | Бал |
|---|:---:|
| 1. Якість продукту | **3.8** |
| 2. Безпека | **3.5** |
| 3. Інженерна досконалість | **5.4** |
| 4. DevOps та операції | **2.4** |
| 5. UX та бізнес | **4.7** |
| **ЗАГАЛОМ** | **4.0** |

---

## 9. ПОРІВНЯННЯ З ПОПЕРЕДНЬОЮ СИСТЕМОЮ

| Критерій (стара) | Стара оцінка | Нова оцінка | Зміна |
|---|:---:|:---:|:---:|
| Архітектура | 8 | 7 (3.1) | ↓1 |
| Консистентність | 9 | 5 (5.3) | ↓4 |
| Безпека | 7 | 3.5 (avg) | ↓3.5 |
| CI/CD | 8 | 6 (4.1) | ↓2 |
| Тести | 7* | 3 (3.4) | ↓4 |
| Документація | 8 | 7 (5.6) | ↓1 |
| AI-friendliness | 9 | 8 (5.9) | ↓1 |
| Спостережуваність | 4 | 2 (4.3) | ↓2 |
| Приватність | 7 | 3 (5.7) | ↓4 |
| Готовність | 6 | 5 (5.8) | ↓1 |

*\*Стара SCORECARD мала внутрішню суперечність: таблиця = 7, аналіз = 0*

---

## 10. ДОРОЖНЯ КАРТА ДО 1МЛН (Action Plan)

### 🔴 Фаза A: Негайно (1–2 тижні)

| # | Задача | Критерії | Effort |
|---|---|---|---|
| A1 | **Синхронізувати документи** — AGENTS.md, SCORECARD, PROJECT_PLAN мають казати одне й те саме | 5.6, 5.9 | 2h |
| A2 | **Rate limiting на API** — Cloudflare Rate Limiting або в коді | 2.5 | 4h |
| A3 | **Security headers** — CSP, CORS, X-Frame-Options, X-Content-Type-Options | 2.5 | 4h |
| A4 | **ErrorBoundary** в обох React-додатках | 1.4, 5.5 | 4h |
| A5 | **Виправити internal contradictions** в SCORECARD.md (рядки 172, 180, 184) | — | 1h |

### 🟠 Фаза B: Найближчий місяць

| # | Задача | Критерії | Effort |
|---|---|---|---|
| B1 | **Zod валідація** для API вхідних даних | 1.2, 2.3 | 2–3d |
| B2 | **Тести в CI gate** — закрити S-6 | 3.4, 4.1 | 4h |
| B3 | **Sentry** для error tracking (bot + api) | 4.3 | 1d |
| B4 | **Performance metrics** — хоча б basic latency logging | 1.3, 4.5 | 1d |
| B5 | **GDPR deletion endpoint** | 5.7, 2.4 | 1d |
| B6 | **Staging environment** через wrangler --env staging | 4.2 | 1d |
| B7 | **Pre-commit hooks** (husky + lint-staged) | 3.3 | 4h |
| B8 | **no-explicit-any → "error"** в eslint.config.js | 3.2 | 1h |

### 🟡 Фаза C: Наступні 3 місяці

| # | Задача | Критерії | Effort |
|---|---|---|---|
| C1 | **Integration тести** для API → D1 flows | 3.4, 1.2 | 1 тиждень |
| C2 | **A11y audit** — WCAG 2.1 AA compliance | 5.2 | 1 тиждень |
| C3 | **SLI/SLO** для кожного сервісу | 1.4, 4.5 | 3d |
| C4 | **Incident response plan** + runbook | 4.4 | 2d |
| C5 | **CHANGELOG.md** + automated generation | 5.6, 5.8 | 1d |
| C6 | **Performance monitoring dashboard** | 4.5, 1.3 | 2d |
| C7 | **MyDatesPage decomposition** (P2-2) | 3.1, 3.5 | 2d |
| C8 | **Cookie consent** для web-platform | 5.7 | 1d |
| C9 | **Data retention policy** документ | 5.7 | 1d |
| C10 | **Unsaved changes + undo** для Page Builder | 1.5 | 2d |

### 🟢 Фаза D: 6–12 місяців

| # | Задача | Критерії |
|---|---|---|
| D1 | **E2E тести** (Playwright/Cypress) | 3.4, 1.2 |
| D2 | **API documentation** (OpenAPI/Swagger) | 5.6, 3.2 |
| D3 | **Architecture diagrams** | 5.6, 5.8 |
| D4 | **Feature flags** | 4.2 |
| D5 | **Canary deploys** | 4.2 |
| D6 | **Real User Monitoring (RUM)** | 4.5, 1.3 |
| D7 | **Offline mode** для TWA | 1.4, 5.1 |
| D8 | **Full GDPR compliance** (DPO, audit trail, breach notification) | 5.7 |
| D9 | **Penetration testing** | 2.5, 2.1 |
| D10 | **Public demo + architecture docs** | 5.8 |

---

## 11. МЕТРИКИ УСПІХУ (DORA + SLI)

### DORA Metrics (ціль на рік — Elite level)

| Метрика | Зараз (оцінка) | Ціль через рік |
|---|---|---|
| **Deployment Frequency** | На кожен коміт | На кожен коміт (Elite) |
| **Lead Time for Changes** | ~30 хвилин (CI time) | <15 хвилин |
| **Change Failure Rate** | Невідомий | <5% |
| **Mean Time to Recovery** | Невідомий | <1 година |

### SLI/SLO (ціль — визначити та вимірювати)

| Сервіс | SLI | SLO |
|---|---|---|
| **api/** | Availability (successful responses / total) | 99.9% |
| **api/** | Latency (p95 response time) | <300ms |
| **bot/** | Message delivery success rate | 99.5% |
| **web-platform/** | Page load time (TTI) | <3s on 3G |
| **web-admin/** | Availability | 99.5% |

---

## 12. ПРАВИЛА ПОДАЛЬШОГО ОНОВЛЕННЯ

1. **Оцінка переглядається кожні 4 тижні** активної розробки
2. **Кожна зміна балу вимагає доказ** (посилання на коміт/код/тест)
3. **Бал не може зрости без закритих задач** з дорожньої карти
4. **Внутрішні суперечності між документами = блокер** для оцінки
5. **Один AI-агент = одне оновлення** — не перезаписувати оцінку іншого агента

---

*Цей документ є **єдиним джерелом правди** для оцінки якості проєкту wwwuabot.*
*Попередня система в `SCORECARD.md` залишається для історичного порівняння.*

*Створено: Buffy (Codebuff), 08.09.2026*
*Стандарти: ISO/IEC 25010:2023, OWASP ASVS 4.0, DORA Metrics, Google SRE*
