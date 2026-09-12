# Архітектурне рішення: Єдиний Page Engine ("Серце та Скелет") для WWWUABOT

**Дата:** 09.09.2026 · **звірено з кодом:** 12.09.2026  
**Проєкт:** `BotDev369/wwwuabot`  
**Питання:** Чи варто створити новий єдиний код "двигун, серце, скелет" будь-яких сторінок, залишивши воркери окремими задля безпеки?  
**Рішення:** **ТАК (Схвалено). Патерн: Thin Shells + Shared Page Engine Core (`@wwwuabot/ui` + `@wwwuabot/shared`).**

---

## 0. Стан на 12.09.2026 — що з цього вже правда

Рішення виконується поетапно, тому документ ділиться на «зроблено» і «задум».
Цей розділ — про реальність, нижче — про задум.

| Пункт рішення | Стан |
|---|---|
| Тонкі оболонки: `web-platform-dev` і `web-admin-dev` без прямого доступу до D1 | ✅ зроблено (обидва ходять через service binding → `api-dev`) |
| Спільне ядро `@wwwuabot/ui` + `@wwwuabot/shared` | ✅ зроблено (`PageRenderer`, `ZoneRenderer`, `PermissionGate`, 40 блоків у реєстрі, токени) |
| Декларативний доступ через `<PermissionGate />` | ✅ зроблено |
| CSS спільного рендерера в shared | ✅ зроблено 12.09.2026 (`page-layout.css`, `drawer.css`) |
| **Cloudflare Access** на адмінці | ❌ **немає**. Воркери живуть на `*.workers.dev`, політики Zero Trust не налаштовано. Захист адмінки зараз — тільки cookie `admin_session` + адмін-гейт в `api-dev` |
| **Окремі домени** `admin.wwwuabot.com` / `app.wwwuabot.com` | ❌ **немає**. Є `*.workers.dev`; Same-Origin розділення реальне (різні хости), але доменів немає |
| «Нуль адмінського коду в публічному бандлі» | ✅ зроблено (окремі воркери й окремі бандли) |
| Прод | ❌ не деплоївся; усі 4 воркери — дев (`docs/CONSOLIDATION_LOG.md` §1) |

Два пункти з розділу 2 (Access і домени) досі **задум**, а не факт. Тримати їх у тексті
як наявне означає планувати роботу, виходячи з неіснуючого захисту.

---

## 1. Контекст та Проблема

Той стан, з якого рішення починалось (цифри — на 09.09.2026), щоб було видно прогрес:

- `web-platform-dev` (Telegram Mini App) та `web-admin-dev` (Панель керування) мали власні
  дубльовані версії сторінок, редакторів і компонентів, а верстку доводилось правити двічі.
- Монолітні компоненти (09.09.2026 → 12.09.2026):
  - `PageBuilderInline.tsx` — 572 → **319**
  - `ScenariosV2Table.tsx` — 533 → **292**
  - `MyDatesPage.tsx` — 413 → **437** (зросла: додано можливості)
  - `ZoneEditor.tsx` — 360 → **225**
  - CSS мобільної навігації було описано двічі — тепер один `drawer.css`
- Лідер за розміром сьогодні — `api-dev/src/services/sites.service.ts` (777 рядків) та
  `packages/shared/src/constants/site-templates.ts` (623): це наступні кандидати.
- Лишається справжнє дублювання верстки поміж оболонок — див. §4.3 крок 3 у
  `docs/CONSOLIDATION_LOG.md` і пункт 3 плану в `docs/CONSOLIDATION_PLAN.md`.

---

## 2. Чому воркери МУСЯТЬ залишатися окремими (Залізна безпека)

Злиття двох воркерів в один призвело б до критичних загроз безпеки:

1. **Витік коду в бандл (Zero Bundle Leakage):**
   Публічні користувачі завантажують один JS-файл. Навіть приховані адмінські роути, назви системних D1-таблиць і логіка модерації потрапляють у браузер користувача. При окремих воркерах адмінський JS фізично відсутній у публічному додатку.
2. **Same-Origin Policy & витік токенів:** _(⚠️ **задум**, не факт — власних доменів немає, див. §0)_
   Окремі домени (`admin.wwwuabot.com` та `app.wwwuabot.com`) гарантують, що сесійні адмінські cookie та JWT ніколи не будуть прочитані з публічного сайту, усуваючи загрозу XSS-крадіжки сесії.
   Фактично зараз розділення Same-Origin є (різні `*.workers.dev`), але це хости за замовчуванням, а не політика.
3. **Cloudflare Zero-Trust Edge Wall:** _(⚠️ **задум**, не факт — Access не налаштований, див. §0)_
   Воркер `web-admin` закривається політикою **Cloudflare Access** (Google Workspace, One-Time PIN, білий список IP). Сторонній запит блокується ще на серверах Cloudflare і навіть не досягає воркера.
4. **Least Privilege (Принцип найменших привілеїв):**
   `web-admin` має доступ лише до адмінських роутів `api-dev`, тоді як `web-platform` бачить тільки публічні роути.

> **УТОЧНЕНО 11.09.2026.** Раніше цей пункт казав, що `web-admin` має «спеціальні Service Bindings
> до D1». Це було неточно: адмінка проксює **всі** запити через Service Binding на `api-dev`
> (`/api/*`), а прямий D1-біндинг у `wrangler.toml` існував, але не використовувався й був
> прибраний. Обидві оболонки тонкі: різниця не в доступі до БД, а в тому, які роути `api-dev`
> за ними закріплені. Деталі — [CONSOLIDATION_LOG.md](./CONSOLIDATION_LOG.md) §5.2.

---

## 3. Цільова Архітектура: Спільне ядро + Тонкі оболонки

```
                      ┌────────────────────────────────────────┐
                      │    packages/ui + packages/shared       │
                      │  • PageRenderer (Головний рендерер)    │
                      │  • PermissionGate (Контроль прав)      │
                      │  • Реєстр блоків (Header, Form, Cards) │
                      │  • Дизайн-токени та стилі .wb-*        │
                      └───────────────────┬────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
┌───────────────────────────────────┐   ┌───────────────────────────────────┐
│     Worker: web-platform-dev      │   │      Worker: web-admin-dev        │
│   (Публічний / Telegram WebApp)   │   │     (Захищена панель модерації)   │
├───────────────────────────────────┤   ├───────────────────────────────────┤
│ • ~25 рядків коду в DynamicPage   │   │ • ~35 рядків коду в Inspector     │
│ • Авторизація через Telegram HMAC │   │ • Cloudflare Access Zero Trust    │
│ • Ролі: guest, user, owner        │   │ • Ролі: admin, superadmin         │
│ • Нуль адмінського коду в JS      │   │ • Service Binding → api-dev       │
└───────────────────────────────────┘   └───────────────────────────────────┘
```

---

## 4. Схема сторінки (PageConfig / PageBlock)

Сторінка не верстається вручну монолітом. Вона описується JSON-конфігом і рендериться ядром.

> **Уточнено 12.09.2026.** У цьому розділі раніше був `PageSchema` з `blocks: BlockConfig[]`.
> У коді таких типів немає: реальна форма — `PageConfig` з чотирма зонами
> (`packages/shared/src/types/page-config.ts`). Найближчий до «PageSchema» носій —
> `SitePage` (`page_data` у D1), а до «BlockConfig» — `PageBlock`.

```typescript
// packages/shared/src/types/page-config.types.ts — справжнє джерело правди
// (page-config.ts поруч лише ре-експортує)
type BlockZone = "sidebar" | "header" | "main" | "footer";

interface PageBlock {
  id: string;
  type: string; // ключ у BLOCK_DEFINITIONS
  name?: string; // заголовок акордеона в редакторі
  order: number;
  props: Record<string, unknown>;
  children?: PageBlock[]; // блоки рекурсивні
  conditions?: BlockConditions; // role / tariff / status / permissions
}

interface PageConfig {
  version: number; // для майбутніх міграцій формату
  zones: Record<BlockZone, PageBlock[]>;
  visibleZones?: BlockZone[];
  sidebarSettings?: SidebarSettings; // closeButtonPosition, fontSize, itemSpacing
}
```

У реєстрі `BLOCK_DEFINITIONS` — **40 блоків** (11 файлів у
`packages/shared/src/constants/block-definitions/`), компоненти —
`packages/ui/src/blocks/`.

---

## 5. Декларативний контроль доступу (`<PermissionGate />`)

Для усунення каскадних `if (isAdmin)` та витоку секретних інтерфейсів використовується спільний компонент:

```tsx
<PermissionGate 
  adminOnly={block.adminOnly}
  ownerOnly={block.ownerOnly}
  requiredCapability={block.requiredCapability}
  userContext={userContext}
>
  <BlockRenderer block={block} />
</PermissionGate>
```

Якщо користувач не має прав — блок навіть не монтується у DOM.

---

## 6. Очікуваний ефект та відповідність правилам проєкту

1. **Скорочення окремих файлів** (перевірено 12.09.2026 — оцінка «70–75%» стосується
   файлів, не репозиторію):
   - `PageBuilderInline.tsx` — 572 → **319** рядків (було обіцяно ~120; реалістично
     без втрати функцій не вийшло — редактор складається з 14 підкомпонентів);
   - `ScenariosV2Table.tsx` — 533 → **292**;
   - `ZoneEditor.tsx` — 360 → **225**;
   - `MyDatesPage.tsx` — **437** (зросла: додано фільтри й вибір рядків; `<100` рядків
     тут не мета — сторінка тримає власний UI поверх спільного хука `useMyDates`);
   - `SiteEditorPage.tsx` (Sites) — 686 → **48** рядків + 11 файлів `pages/site-editor/`.
2. **Відповідність "Crystal Clarity Rule":**
   - Ліміт **< 200 рядків** тримають лише нові файли. Мета — не поточний факт: на 12.09.2026
     у `src/` шістьох воркспейсів **49 файлів** понад 200 рядків, з них **8** — понад 400
     (`sites.service.ts` 777, `site-templates.ts` 623, `ScenarioCardModal.tsx` 443,
     `MyDatesPage.tsx` 437, `icons.tsx` 423, `UserProfileCard.tsx` 414, `site.types.ts` 402,
     `UserEditModal.tsx` 401; двоє останніх — дані, а не логіка). Перелік робіт —
     `docs/CONSOLIDATION_PLAN.md` §3.
3. **Швидкість розробки:**
   - Створення нового екрану або сценарію займає 5 хвилин без дублювання верстки.
4. **Залізна безпека:**
   - Повний захист адмінки на рівні Cloudflare Edge без ризику витоку внутрішніх API у публічний клієнт.
