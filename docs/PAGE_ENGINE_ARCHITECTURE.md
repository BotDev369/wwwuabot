# Архітектурне рішення: Єдиний Page Engine ("Серце та Скелет") для WWWUABOT

**Дата:** 09.09.2026  
**Проєкт:** `BotDev369/wwwuabot`  
**Питання:** Чи варто створити новий єдиний код "двигун, серце, скелет" будь-яких сторінок, залишивши воркери окремими задля безпеки?  
**Рішення:** **ТАК (Схвалено). Патерн: Thin Shells + Shared Page Engine Core (`@wwwuabot/ui` + `@wwwuabot/shared`).**

---

## 1. Контекст та Проблема
У поточному репозиторії `wwwuabot`:
- `web-platform-dev` (Telegram Mini App) та `web-admin-dev` (Панель керування) мають власні дубльовані версії сторінок, редакторів і компонентів.
- Монолітні компоненти розрослися до сотень рядків:
  - `web-admin-dev/src/features/page-builder/PageBuilderInline.tsx` — 572 рядки
  - `web-admin-dev/src/pages/scenarios-v2/ScenariosV2Table.tsx` — 533 рядки
  - `web-platform-dev/src/pages/mydate/MyDatesPage.tsx` — 413 рядків
  - `web-admin-dev/src/features/page-builder/ZoneEditor.tsx` — 360 рядків
- Будь-яка зміна верстки вимагає синхронного редагування двох різних застосунків.

---

## 2. Чому воркери МУСЯТЬ залишатися окремими (Залізна безпека)

Злиття двох воркерів в один призвело б до критичних загроз безпеки:

1. **Витік коду в бандл (Zero Bundle Leakage):**
   Публічні користувачі завантажують один JS-файл. Навіть приховані адмінські роути, назви системних D1-таблиць і логіка модерації потрапляють у браузер користувача. При окремих воркерах адмінський JS фізично відсутній у публічному додатку.
2. **Same-Origin Policy & витік токенів:**
   Окремі домени (`admin.wwwuabot.com` та `app.wwwuabot.com`) гарантують, що сесійні адмінські cookie та JWT ніколи не будуть прочитані з публічного сайту, усуваючи загрозу XSS-крадіжки сесії.
3. **Cloudflare Zero-Trust Edge Wall:**
   Воркер `web-admin` закривається політикою **Cloudflare Access** (Google Workspace, One-Time PIN, білий список IP). Сторонній запит блокується ще на серверах Cloudflare і навіть не досягає воркера.
4. **Least Privilege (Принцип найменших привілеїв):**
   `web-admin` має спеціальні Service Bindings до D1 з правами на системні таблиці, тоді як `web-platform` має суворо обмежені публічні роути.

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
│ • Нуль адмінського коду в JS      │   │ • Прямі Service Bindings до D1/KV │
└───────────────────────────────────┘   └───────────────────────────────────┘
```

---

## 4. Схема сторінки (PageSchema / PageConfig)

Сторінка більше не верстається вручну монолітом. Вона описується JSON-схемою та рендериться ядром:

```typescript
export interface PageSchema {
  id: string;
  slug: string;
  title: string;
  ownerId: string;
  status: 'active' | 'pending' | 'restricted';
  layout?: 'feed' | 'dashboard' | 'compact';
  blocks: BlockConfig[];
}

export interface BlockConfig {
  id: string;
  type: 'header' | 'stats' | 'content' | 'actions' | 'custom_form' | 'moderation';
  title?: string;
  data: Record<string, unknown>;
  requiredCapability?: 'can_edit' | 'can_delete' | 'can_moderate';
  adminOnly?: boolean;
  ownerOnly?: boolean;
}
```

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

1. **Скорочення коду на 70-75%:**
   - `PageBuilderInline.tsx` (572 рядки) скорочується до ~120 рядків конфігурацій.
   - `MyDatesPage.tsx` (413 рядків) скорочується до <100 рядків виклику `PageRenderer`.
2. **Відповідність "Crystal Clarity Rule":**
   - Усі компоненти та сторінки вкладаються в ліміт **< 200 рядків**.
3. **Швидкість розробки:**
   - Створення нового екрану або сценарію займає 5 хвилин без дублювання верстки.
4. **Залізна безпека:**
   - Повний захист адмінки на рівні Cloudflare Edge без ризику витоку внутрішніх API у публічний клієнт.
