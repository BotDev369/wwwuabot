# 08. Індекс фактів: пункт місії → стан → файл

| Пункт місії | Стан | Де |
|---|---|---|
| Слова для сторінки зберігаються в базі | ✅ | `platform_pages.search_terms` — [`tables.ts:225`](../../packages/shared/src/database/tables.ts) |
| Слова для товару | ✅ | `shop_products.search_terms` — [`tables.ts:268`](../../packages/shared/src/database/tables.ts) |
| Нормалізація варіантів | ✅ | [`normalize.ts`](../../packages/shared/src/search/normalize.ts) |
| Швидкий пошук у KV | ✅ | `search:v2` у `CONTENT_KV` — [`search/index.ts:19`](../../api-dev/src/services/search/index.ts) |
| Одруківки без «нічого не знайдено» | ✅ | [`match.ts:65`](../../packages/shared/src/search/match.ts) |
| Кілька сторінок з тими самими словами | ✅ | до 5 карток — [`SEARCH_RESULT_LIMIT`](../../packages/shared/src/search/match.ts) |
| Нуль збігів — текст-підказка | ✅ | [`search-screen.ts:112`](../../bot-dev/src/modules/search/search-screen.ts) |
| Прев'ю кожної сторінки | ✅ | [`search-screen.ts`](../../bot-dev/src/modules/search/search-screen.ts) |
| Webapp-кнопка «Відкрити» на весь рядок | ✅ | там само, `<tg-button-row>` |
| Дані товару вже підставлені в адресі | ✅ | [`ShopStore.tsx:68`](../../web-platform-dev/src/pages/shop/store/ShopStore.tsx) |
| Дії товару (кошик / замовити) | ✅ | [`search-screen.ts:44`](../../bot-dev/src/modules/search/search-screen.ts) |
| Швидке замовлення без анкети | ✅ | [`quick-order.service.ts`](../../api-dev/src/services/shop/quick-order.service.ts) |
| Дані покупця з Telegram | ✅ | `buyer_profile` — [`buyer-profiles.ts`](../../api-dev/src/services/shop/buyer-profiles.ts) |
| Фото покупця з Telegram | ✅ | [`buyer-avatar.ts`](../../api-dev/src/services/shop/buyer-avatar.ts) |
| Дефолтне фото покупця в R2 | 🟡 код є, файлу немає | `shop/defaults/buyer.jpg` — [`buyer-avatar.ts:15`](../../api-dev/src/services/shop/buyer-avatar.ts), завантаження — [03-quick-order.md](./03-quick-order.md) |
| Картка замовлення для продавця | ✅ | [`ShopOrderBuyerCard.tsx`](../../web-platform-dev/src/pages/shop/ShopOrderBuyerCard.tsx) |
| `/start` rich + вітання + акордеони | ✅ | [`start/screen.ts`](../../bot-dev/src/modules/start/screen.ts) |
| Фото в `/start` згори | ⬜ | ключ `bot/start.jpg`, [04-start.md](./04-start.md); ❗ питання 2 |
| Нічого не редагуємо й не видаляємо в чаті | ✅ 🟡 | append-only, крім тапу кошика; ❗ питання 3 |
| Усі `message_id` в одному місці, розділено | ✅ | `bot_messages.direction` — [`bot-messages.ts`](../../packages/shared/src/database/bot-messages.ts) |
| «Очистити історію» в меню-кнопці | ⬜ | MenuButton і `/menu` — [05-history.md](./05-history.md) |
| Правка й видалення з адмінки | ✅ | [`admin-actions.ts`](../../bot-dev/src/modules/history/admin-actions.ts) |
| Редагування слів з інтерфейсу | ⬜ | ❗ питання 1 |
| Перебудова індексу на зміну сторінки | ⬜ | зараз лише кнопка й товари — [01-search.md](./01-search.md) |
| Відкритий вхід без запрошення | ⬜ | `hasAccess` у [`bot-router.ts:40`](../../bot-dev/src/core/router/bot-router.ts); політика — [`access.ts`](../../packages/shared/src/security/access.ts). Це **не** пункт цієї місії, але стара версія документа його обіцяла — стан «не зроблено» |
| Віджети видалені з коду | ⬜ | `sendWidget`, `bot_widget_messages`, `widget-query` ще в коді; на роботу пошуку не впливають |
