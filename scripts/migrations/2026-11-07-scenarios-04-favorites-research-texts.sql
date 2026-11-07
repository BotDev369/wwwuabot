-- Тексти екранів «Обране» й «Дослідження» переїхали з компонентів у їхні рядки
-- `scenarios`: ключ тексту — `id` блока `text`, значення — `props.content`.
-- Читає `@wwwuabot/shared/screens`, правило — `docs/SCREEN_TEXTS.md`.
-- Ідемпотентно: повторний прогін перезаписує той самий рядок.

INSERT INTO scenarios (slug, title, photo_url, page_data, template_key, is_active, is_public, updated_at)
VALUES (
  'favorites',
  'Обране',
  NULL,
  '{"version":1,"zones":{"sidebar":[],"header":[],"main":[
    {"id":"favorites.title","type":"text","order":0,"props":{"content":"Обране"}},
    {"id":"favorites.sort.date","type":"text","order":1,"props":{"content":"Спочатку нові"}},
    {"id":"favorites.sort.name","type":"text","order":2,"props":{"content":"За назвою"}},
    {"id":"favorites.sort.bar","type":"text","order":3,"props":{"content":"Дії обраного"}},
    {"id":"favorites.kind.page","type":"text","order":4,"props":{"content":"Сторінка"}},
    {"id":"favorites.kind.user","type":"text","order":5,"props":{"content":"Людина"}},
    {"id":"favorites.meta.added","type":"text","order":6,"props":{"content":"додано {date}"}},
    {"id":"favorites.loading","type":"text","order":7,"props":{"content":"Завантаження…"}},
    {"id":"favorites.retry","type":"text","order":8,"props":{"content":"Повторити"}},
    {"id":"favorites.empty.title","type":"text","order":9,"props":{"content":"Тут буде все, що ви вподобали."}},
    {"id":"favorites.empty.hint","type":"text","order":10,"props":{"content":"Натисніть «Лайк» на сторінці."}},
    {"id":"favorites.count","type":"text","order":11,"props":{"content":"{n} у обраному"}},
    {"id":"favorites.gone","type":"text","order":12,"props":{"content":"Контент видалено або доступ закрито."}},
    {"id":"favorites.remove","type":"text","order":13,"props":{"content":"Прибрати з обраного"}},
    {"id":"favorites.remove.named","type":"text","order":14,"props":{"content":"Прибрати з обраного: {title}"}},
    {"id":"favorites.error.load","type":"text","order":15,"props":{"content":"Не вдалося завантажити обране."}},
    {"id":"favorites.error.remove","type":"text","order":16,"props":{"content":"Не вдалося прибрати лайк."}}
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

INSERT INTO scenarios (slug, title, photo_url, page_data, template_key, is_active, is_public, updated_at)
VALUES (
  'research',
  'Дослідження',
  NULL,
  '{"version":1,"zones":{"sidebar":[],"header":[],"main":[
    {"id":"research.title","type":"text","order":0,"props":{"content":"Дослідження"}},
    {"id":"research.kicker","type":"text","order":1,"props":{"content":"Дослідження"}},
    {"id":"research.lead","type":"text","order":2,"props":{"content":"Скільки людей у світі вірять, у що саме і як це змінюється. Кожен блок — окрема контентна сторінка з датами, джерелами й цифрами, які можна перевірити."}},
    {"id":"research.fact.blocks","type":"text","order":3,"props":{"content":"блоків"}},
    {"id":"research.fact.chapters","type":"text","order":4,"props":{"content":"розділів"}},
    {"id":"research.fact.minutes","type":"text","order":5,"props":{"content":"хвилин читання"}},
    {"id":"research.readingMinutes","type":"text","order":6,"props":{"content":"{n} хв читання"}},
    {"id":"research.meta.data","type":"text","order":7,"props":{"content":"дані {date}"}},
    {"id":"research.empty","type":"text","order":8,"props":{"content":"Дослідження ще не опубліковане."}},
    {"id":"research.footer.text","type":"text","order":9,"props":{"content":"Методологія, повний список джерел і кодекс нейтральності — на сторінці дослідження. Кожен блок посилається на першоджерело, а не на переказ."}},
    {"id":"research.footer.cta","type":"text","order":10,"props":{"content":"Методологія й джерела"}},
    {"id":"research.article.back","type":"text","order":11,"props":{"content":"Дослідження"}},
    {"id":"research.article.aria","type":"text","order":12,"props":{"content":"Далі в дослідженні"}},
    {"id":"research.article.prev","type":"text","order":13,"props":{"content":"Назад"}},
    {"id":"research.article.next","type":"text","order":14,"props":{"content":"Далі"}}
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
WHERE slug IN ('favorites', 'research')
ORDER BY slug;
