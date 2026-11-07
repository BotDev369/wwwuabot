-- Тексти екрана «Контакти» переїхали з компонента в його рядок `scenarios`:
-- ключ тексту — `id` блока `text`, значення — `props.content`.
-- Читає `@wwwuabot/shared/screens`, правило — `docs/SCREEN_TEXTS.md`.
-- Ідемпотентно: повторний прогін перезаписує той самий рядок.

INSERT INTO scenarios (slug, title, photo_url, page_data, template_key, is_active, is_public, updated_at)
VALUES (
  'contacts',
  'Контакти',
  NULL,
  '{"version":1,"zones":{"sidebar":[],"header":[],"main":[
    {"id":"contacts.title","type":"text","order":0,"props":{"content":"Контакти"}},
    {"id":"contacts.add","type":"text","order":1,"props":{"content":"Додати контакт"}},
    {"id":"contacts.add.prompt","type":"text","order":2,"props":{"content":"Як звати людину, якій ви надсилаєте посилання?"}},
    {"id":"contacts.add.promptTitle","type":"text","order":3,"props":{"content":"Додати контакт"}},
    {"id":"contacts.add.placeholder","type":"text","order":4,"props":{"content":"Ім''я контакту"}},
    {"id":"contacts.add.emptyName","type":"text","order":5,"props":{"content":"Ім''я не може бути порожнім"}},
    {"id":"contacts.add.failed","type":"text","order":6,"props":{"content":"Не вдалося додати контакт"}},
    {"id":"contacts.save.failed","type":"text","order":7,"props":{"content":"Не вдалося зберегти контакт"}},
    {"id":"contacts.link.failed","type":"text","order":8,"props":{"content":"Не вдалося скласти лінк"}},
    {"id":"contacts.delete.failed","type":"text","order":9,"props":{"content":"Не вдалося прибрати контакт"}},
    {"id":"contacts.delete.confirm","type":"text","order":10,"props":{"content":"Прибрати контакт «{name}»?"}},
    {"id":"contacts.delete.title","type":"text","order":11,"props":{"content":"Видалення"}},
    {"id":"contacts.delete.confirmText","type":"text","order":12,"props":{"content":"Прибрати"}},
    {"id":"contacts.copy.action","type":"text","order":13,"props":{"content":"Скопіювати"}},
    {"id":"contacts.copy.failed","type":"text","order":14,"props":{"content":"{what} не вдалося — візьміть посилання з розкритого контакту."}},
    {"id":"contacts.copy.noLink","type":"text","order":15,"props":{"content":"Бот ще не знає свого імені — посилання не склалося. Оновіть екран і спробуйте ще раз."}},
    {"id":"contacts.copy.title","type":"text","order":16,"props":{"content":"Скопіюйте вручну"}},
    {"id":"contacts.error.title","type":"text","order":17,"props":{"content":"Помилка"}},
    {"id":"contacts.loading","type":"text","order":18,"props":{"content":"Завантаження контактів…"}},
    {"id":"contacts.empty.title","type":"text","order":19,"props":{"content":"Ще немає жодного контакту."}},
    {"id":"contacts.empty.hint","type":"text","order":20,"props":{"content":"Натисніть «+» угорі — посилання скопіюється саме. Надішліть його людині в Telegram: коли вона приєднається, контакт закріпиться за вами й з''явиться тут."}},
    {"id":"contacts.search.empty","type":"text","order":21,"props":{"content":"Нічого не знайдено за цим запитом."}},
    {"id":"contacts.search.reset","type":"text","order":22,"props":{"content":"Скинути пошук і фільтри"}}
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

SELECT slug, template_key, json_array_length(json_extract(page_data, '$.zones.main')) AS keys
FROM scenarios
WHERE slug = 'contacts';
