-- Тексти екрана «Сервіси» переїхали з `services-list.ts` у його рядок
-- `scenarios`: ключ тексту — `id` блока `text`, значення — `props.content`.
-- Читає `@wwwuabot/shared/screens`, правило — `docs/SCREEN_TEXTS.md`.
-- Ідемпотентно: повторний прогін перезаписує той самий рядок.

INSERT INTO scenarios (slug, title, photo_url, page_data, template_key, is_active, is_public, updated_at)
VALUES (
  'services',
  'Сервіси',
  NULL,
  '{"version":1,"zones":{"sidebar":[],"header":[],"main":[
    {"id":"services.title","type":"text","order":0,"props":{"content":"Сервіси"}},
    {"id":"services.group.community","type":"text","order":1,"props":{"content":"Спільнота"}},
    {"id":"services.group.content","type":"text","order":2,"props":{"content":"Контент"}},
    {"id":"services.group.personal","type":"text","order":3,"props":{"content":"Особисте"}},
    {"id":"services.item.users","type":"text","order":4,"props":{"content":"Користувачі"}},
    {"id":"services.item.contacts","type":"text","order":5,"props":{"content":"Контакти"}},
    {"id":"services.item.messages","type":"text","order":6,"props":{"content":"Повідомлення"}},
    {"id":"services.item.pages","type":"text","order":7,"props":{"content":"Сторінки"}},
    {"id":"services.item.ads","type":"text","order":8,"props":{"content":"Оголошення"}},
    {"id":"services.item.research","type":"text","order":9,"props":{"content":"Дослідження"}},
    {"id":"services.item.notes","type":"text","order":10,"props":{"content":"Нотатки"}},
    {"id":"services.item.orders","type":"text","order":11,"props":{"content":"Замовлення"}},
    {"id":"services.item.games","type":"text","order":12,"props":{"content":"Ігри"}}
  ],"footer":[]},"visibleZones":[]}',
  'screen',
  1,
  0,
  datetime('now')
)
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  page_data = excluded.page_data,
  template_key = excluded.template_key,
  is_active = excluded.is_active,
  is_public = excluded.is_public,
  updated_at = excluded.updated_at;

SELECT slug, template_key, length(page_data) AS bytes
FROM scenarios
WHERE slug = 'services';
