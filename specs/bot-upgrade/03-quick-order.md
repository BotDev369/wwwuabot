# 03. Швидке замовлення: дані з Telegram, фото покупця

**Ідея:** на сторінці товару (і в кошику) кнопка «Швидке замовлення» — підтвердження без жодного
поля. Сервер бере дані зі свого рядка `users` і створює замовлення. Телефон та адресу продавець і
покупець узгоджують у розмові — **їх Telegram не дає**, і ми їх не питаємо.

| Що | Стан | Факт |
|---|---|---|
| Сервіс замовлення | ✅ | [`quick-order.service.ts`](../../api-dev/src/services/shop/quick-order.service.ts): `contact = '{}'`, `buyer_profile` — знімок, позиції — знімок назви/ціни/виду |
| Ліміти | ✅ | 5 замовлень на добу і **одне активне** в межах магазину; «активне» — за **стадією** статусу, а не за ключем (`limitRefusal`) |
| Фото покупця | ✅ | `getUserProfilePhotos` → `getFile` → байти в R2 під ключем `shop/avatars/<user_id>-<random>.jpg`, назовні — адреса шлюзу: [`buyer-avatar.ts`](../../api-dev/src/services/shop/buyer-avatar.ts) |
| Дефолтне фото | 🟡 код є, файлу немає | код віддає `shop/defaults/buyer.jpg` ([`buyer-avatar.ts:15`](../../api-dev/src/services/shop/buyer-avatar.ts)), платформа теж має фолбек ([`ShopOrderBuyerCard.tsx:65`](../../web-platform-dev/src/pages/shop/ShopOrderBuyerCard.tsx)); **самого файлу в репо немає** — його треба завантажити в бакет (нижче) |
| Кеш фото 7 днів | ⬜ треба додати | зараз **кешу немає**: кожне замовлення тягне фото з Telegram заново й пише **новий** об'єкт із випадковим хвостом. Дешеве виправлення: ключ `shop/avatars/<user_id>.jpg` (без хвоста) + перевірка `head()` перед `getUserProfilePhotos` |
| Картка продавця | ✅ | [`ShopOrderBuyerCard.tsx`](../../web-platform-dev/src/pages/shop/ShopOrderBuyerCard.tsx) — фото, ім'я, `@username`, мова, позначка «швидке»; дані — зі знімка `buyer_profile` ([`buyer-profiles.ts`](../../api-dev/src/services/shop/buyer-profiles.ts)) |
| Розмова з продавцем | ✅ | [`orders-notice.ts`](../../api-dev/src/services/shop/orders-notice.ts): перше повідомлення — системна позначка платформи, далі звичайна переписка |

## Що реально дає Telegram — і що ми з цього беремо

З апдейта бота (`Update.message.from` / `callback_query.from`, тип `User`) доступні: `id`, `is_bot`,
`first_name`, `last_name`, `username`, `language_code`, `is_premium`, `added_to_attachment_menu`,
`allows_write_to_pm`, `can_join_groups`… Останні три — не про покупця, ми їх лише зберігаємо в
`telegram_json`.

З `initData` Mini App (`WebApp.initDataUnsafe.user`) доступні ті самі поля **плюс** `photo_url` — і
саме тому фото не можна брати з `initData`: у чаті його немає, а посилання старіє. Тому фото — через
`getUserProfilePhotos` + `getFile`, а байти — у R2.

**Телефон і адресу Telegram не віддає** (потрібен `requestContact`, тобто запит у людини). Місія каже
«без запитування даних», тож ми їх не питаємо: продавець бачить ім'я, `@нік`, мову й фото — достатньо,
щоб почати розмову.

**Що лежить у знімку `buyer_profile`** ([`buyer-profiles.ts:12`](../../api-dev/src/services/shop/buyer-profiles.ts)):
`name` (ім'я + прізвище), `username`, `language`, `photo` (адреса шлюзу), `quick: true`. Знімок
навмисно не читає `users` наживо: картка показує те, що було на момент замовлення.

## Як завантажити заглушки в R2

Бакет `wwwuabot-shop-dev` — той самий, що в [`api-dev/wrangler.toml:27`](../../api-dev/wrangler.toml).
У репозиторії цих файлів немає, тож їх треба покласти один раз:

```bash
npx wrangler r2 object put wwwuabot-shop-dev/shop/defaults/page.webp    --file=page.webp
npx wrangler r2 object put wwwuabot-shop-dev/shop/defaults/product.webp --file=product.webp
npx wrangler r2 object put wwwuabot-shop-dev/shop/defaults/buyer.jpg    --file=buyer.jpg
```

Файл віддає шлюз `GET /api/shop/media/<ключ>` **без авторизації** — навмисно: Telegram тягне фото без
`initData` ([`routes/shop.ts:77`](../../api-dev/src/routes/shop.ts),
[`shop-media.controller.ts`](../../api-dev/src/controllers/shop-media.controller.ts)). Тому й `/start`
може брати картинку тим самим шляхом, без R2-біндингу в боті.

**Звідки взяти сам файл.** Готових картинок у репозиторії немає (і не треба: це дані, а не код).
Підходить або наявний логотип платформи, або проста брендована заглушка: квадрат 640×640, фон у
кольорі теми, літера «П» або логотип по центру, без дрібного тексту — у чаті вона показується
розміром із сірникова коробка.
