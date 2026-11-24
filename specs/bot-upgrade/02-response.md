# 02. Відповідь-річ: прев'ю, кнопки, дані товару

**Одне rich-повідомлення** на запит — [`sendRichMessage`](../../bot-dev/src/shared/telegram/widgets.ts),
рендер — [`searchScreenHtml`](../../bot-dev/src/modules/search/search-screen.ts).

| Елемент | Стан | Рішення |
|---|---|---|
| Картка на кожен збіг | ✅ | кожен збіг — окремий `<details>`: назва **тільки в заголовку** акордеона, перший відкритий, решта згорнуті |
| Прев'ю | ✅ | `<img src>` — фото сторінки або перше фото товару; немає чи чуже → заглушка з R2 (`shop/defaults/page.webp`, `shop/defaults/product.webp`), ніколи не зовнішній URL ([`search/index.ts:19`](../../api-dev/src/services/search/index.ts)) |
| Опис і ціна | ✅ | опис ≤240 символів (для сторінки — `h3`, далі перший текст `page_data`), ціна — тільки товар |
| Кнопка «Відкрити» на весь рядок | ✅ | `<tg-button-row>` без `align`; тип `web_app` у приваті, `url` у групах — `button()` у [`search-screen.ts:31`](../../bot-dev/src/modules/search/search-screen.ts) |
| Адреса сторінки у кнопці | ✅ | `${WEB_PLATFORM_URL}${href}`; `WEB_PLATFORM_URL` — [`bot-dev/wrangler.toml`](../../bot-dev/wrangler.toml), `href` — `toWebPath(slug)` або `toWebPath(shop, ["p", slug])` |
| Дії товару | ✅ | порожній кошик → «Додати в кошик» (`callback_data cart:add:<id>`); у кошику → ряд «− \| N шт \| +» (`cart:dec/inc:<id>`) і «Замовити відразу» (`web_app` на `?order=1&qty=N`) |
| Кількість у картці | ✅ | читається з D1 ([`cart.repository.ts`](../../bot-dev/src/modules/search/cart.repository.ts)), а не з `callback_data`: у 64 байти кнопки номер і кількість не влізуть разом із рештою |
| Перемальовування після тапу | 🟡 | тап редагує **те саме** повідомлення ([`cart.handler.ts`](../../bot-dev/src/modules/search/cart.handler.ts)) — див. ❗ [питання 3](./07-questions.md) |
| Групи | ✅ | пошук у групах вимкнено (`ctx.chat?.type !== "private"` → `false`), а рендер уміє `url`-кнопки як запасний шлях |

## Як дані товару потрапляють у webapp — без стану на клієнті

Все в адресі:

```
https://web-platform-dev.diskomate.workers.dev/galyashop/p/astrahal-sherstystok?order=1&qty=2
                                           └─ магазин ─┘ └ p ┘ └── товар ──┘ └ намір ┘ └ кількість ┘
```

Платформа розбирає `href` як звичайну сторінку (`resolveContentRoute`,
[`packages/shared/src/content/resolve.ts:100`](../../packages/shared/src/content/resolve.ts)), а хвіст
`?add=1` / `?order=1` перетворює на намір у вітрині:
[`ShopStore.tsx:68`](../../web-platform-dev/src/pages/shop/store/ShopStore.tsx) (`intent?: "add" | "order"`),
покрито тестом [`ShopStoreEntry.dom.test.tsx:75`](../../web-platform-dev/src/pages/shop/store/ShopStoreEntry.dom.test.tsx).

Тобто бот не передає ціну, назву чи id — він передає **адресу**, а платформа сама бере актуальні
дані товару. Ціну, назву й вид у замовленні все одно фіксує база (розділ
[03-quick-order.md](./03-quick-order.md)), тож підмінити їх адресою неможливо.

Кількість у кошику — **спільна з платформою** (таблиця кошика в D1), а не окрема «корзинка в чаті».
