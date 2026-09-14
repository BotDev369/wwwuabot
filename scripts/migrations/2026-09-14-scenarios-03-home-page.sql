-- Головна сторінка платформи: контент вебу + подання в боті.
--
-- Один рядок = сторінка вебу (`page_data`) + екран бота (`caption_*`, `buttons`).
-- Адреса головної — порожній `slug` (див. `shared/content/resolve.ts`), тож
-- рядок один і він же відповідає на `/` у вебі та на `/start` без параметра.
--
-- **Це запис контенту, а не міграція схеми.** До нього в цьому рядку лежав
-- порожній макет («Хедер» / «Футер» / зображення без `src`), тому гілка
-- `DO UPDATE` нічого не втрачає — вона перезаписує макет, який нічого не
-- показував. Повторний запуск ідемпотентний.
--
-- Текст банера винесено в `photo_url` навмисно: `slug` головної порожній, і
-- згенерований банер узяв би порожній підпис (див. `bot-dev/.../photo.ts`).

INSERT INTO scenarios (
  slug, title, photo_url,
  caption_top, caption_mid, caption_bot,
  keyboard_type, buttons, page_data, is_active, updated_at
) VALUES (
  '',
  'WWWUABot',
  'https://res.cloudinary.com/ddoumoe5n/image/upload/w_1200,h_630,c_fill,b_rgb:1a56db/l_text:Arial_72_bold:WWWUABot,co_white,c_fit,w_1000/fl_layer_apply,g_center/placeholder.png',
  '<b>WWWUABot</b> — платформа Telegram-ботів.

Один рядок у базі: сторінка у вебі + екран у боті. Обери напрямок нижче.',
  NULL,
  'Кнопка «Відкрити сторінку» відкриває вебверсію всередині Telegram.',
  'static',
  '[[{"text":"МоїДати","callback_data":"mydate"}],[{"text":"GalyaShop","callback_data":"galyashop"}]]',
  '{
  "version": 1,
  "visibleZones": ["header", "main", "footer"],
  "zones": {
    "sidebar": [],
    "header": [
      {
        "id": "home-nav",
        "type": "nav",
        "order": 0,
        "props": {
          "items": [
            { "text": "Головна", "url": "/", "icon": "home" },
            { "text": "МоїДати", "url": "/mydate", "icon": "calendar" },
            { "text": "GalyaShop", "url": "/galyashop", "icon": "star" },
            { "text": "Про портал", "url": "/platform", "icon": "globe" }
          ],
          "direction": "horizontal",
          "align": "space-between",
          "style": "pills",
          "fontSize": "sm",
          "itemSpacing": "sm"
        }
      }
    ],
    "main": [
      {
        "id": "home-hero",
        "type": "hero",
        "order": 0,
        "props": {
          "title": "WWWUABot",
          "subtitle": "Платформа Telegram-ботів: один рядок у базі — і сторінка у вебі, і екран у боті.",
          "buttons": [
            { "text": "МоїДати", "url": "/mydate", "variant": "primary" },
            { "text": "GalyaShop", "url": "/galyashop", "variant": "secondary" }
          ],
          "align": "center"
        }
      },
      {
        "id": "home-badges",
        "type": "badge",
        "order": 1,
        "props": {
          "items": [
            { "text": "Telegram Mini App", "variant": "accent" },
            { "text": "Page Builder", "variant": "green" },
            { "text": "середовище: dev", "variant": "yellow" }
          ],
          "layout": "wrap"
        }
      },
      {
        "id": "home-card-works",
        "type": "card",
        "order": 2,
        "props": {
          "title": "Що вже працює",
          "description": "Контент береться з однієї таблиці — без копій і без другого сховища.",
          "padding": "md",
          "bordered": true,
          "elevated": true
        },
        "children": [
          {
            "id": "home-list-works",
            "type": "list",
            "order": 0,
            "props": {
              "ordered": false,
              "items": [
                {
                  "text": "Одна адреса на сторінку",
                  "description": "slug — і шлях вебу, і основа діплінка"
                },
                {
                  "text": "Чотири зони",
                  "description": "sidebar, header, main, footer"
                },
                {
                  "text": "Той самий рядок у боті",
                  "description": "підпис, кнопки, фото"
                }
              ]
            }
          }
        ]
      },
      {
        "id": "home-divider",
        "type": "divider",
        "order": 3,
        "props": { "style": "gradient", "spacing": "lg" }
      },
      {
        "id": "home-card-next",
        "type": "card",
        "order": 4,
        "props": {
          "title": "Перейти до сторінок",
          "description": "Кожне посилання веде на свій рядок у тій самій таблиці.",
          "padding": "md",
          "bordered": true,
          "elevated": false
        },
        "children": [
          {
            "id": "home-buttons-next",
            "type": "buttons",
            "order": 0,
            "props": {
              "layout": "row",
              "items": [
                { "text": "МоїДати", "url": "/mydate", "variant": "primary" },
                { "text": "GalyaShop", "url": "/galyashop", "variant": "secondary" },
                { "text": "Про портал", "url": "/platform", "variant": "outline" }
              ]
            }
          }
        ]
      }
    ],
    "footer": [
      {
        "id": "home-footer",
        "type": "text",
        "order": 0,
        "props": {
          "title": "",
          "content": "Дев-середовище платформи. Сторінка редагується в адмінці — цей текст лише перевіряє, що рендер живий.",
          "level": "body",
          "align": "center"
        }
      }
    ]
  }
}',
  1,
  datetime('now')
)
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  photo_url = excluded.photo_url,
  caption_top = excluded.caption_top,
  caption_mid = excluded.caption_mid,
  caption_bot = excluded.caption_bot,
  keyboard_type = excluded.keyboard_type,
  buttons = excluded.buttons,
  page_data = excluded.page_data,
  is_active = excluded.is_active,
  updated_at = excluded.updated_at;
