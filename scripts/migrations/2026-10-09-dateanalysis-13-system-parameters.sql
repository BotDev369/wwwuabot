-- Аналіз дат: параметри решти систем у реєстрі (09.10.2026)
--
-- Було: у `analysis_systems` лежали всі 13 систем, але `parameters = '[]'` у
-- дванадцяти з них: у рядку реєстру були назва й опис, а чого система міряє —
-- ні. Стало: у кожної системи — той перелік параметрів, який справді можна
-- визначити з дати `рррр-мм-дд` та її частин.
--
-- Чому це `UPDATE`, а не `INSERT OR IGNORE`, як у міграції 12: рядки вже є,
-- тож `INSERT` за первинним ключем був би **порожньою дією** й нічого не
-- змінив. Скрипт лишається безпечним: кожен рядок має умову
-- `parameters = '[]'`, тож уже заповнений перелік він не чіпає, а повторний
-- запуск не робить нічого. `DELETE`/`DROP` тут немає взагалі.
--
-- Чому перелік саме такий: у системи без формули розрахунку параметр — це
-- **обіцянка**, тому в ньому лише те, що рахується з дати: знак, стихія, число,
-- день циклу. Усе, що потребує часу народження (накшатра Джйотіш, година
-- Ба-Цзи, тип і профіль Дизайну людини), не заведено жодним рядком: параметр,
-- який нічим не рахується, гірший за його відсутність.
--
-- Звіт про пропущене:
--   * `human-design` не має жодного параметра — його розрахунок потребує дати,
--     часу й місця народження, тож у рядку лишається тільки опис.
--   * системи, чиї `id` не збігаються з переліком нижче, лишаються як є.
--
-- Перевірка після запуску:
--   SELECT id, json_array_length(parameters) AS параметрів
--     FROM analysis_systems ORDER BY position, id;

-- ── Західна астрологія ──────────────────────────────────────────────────────
-- Уже заповнена міграцією 01; цей рядок лишається для повноти картини й
-- стосується тільки випадку, коли її перелік виявився порожнім.
UPDATE analysis_systems
   SET parameters = '[{"key":"sunSign","label":"Знак Сонця"},{"key":"element","label":"Стихія"},{"key":"modality","label":"Якість (хрест)"},{"key":"ruler","label":"Управитель (сучасний)"},{"key":"traditionalRuler","label":"Традиційний управитель"},{"key":"decan","label":"Декан"},{"key":"degree","label":"Наближений градус Сонця"},{"key":"cusp","label":"Прикордонний знак"}]',
       updated_at = datetime('now')
 WHERE id = 'western' AND parameters = '[]';

-- ── Ведична астрологія (Джйотіш) ────────────────────────────────────────────
-- Місячні знаки, накшатра й періоди даші потребують часу народження, тож у
-- переліку лишається сонячний знак за сидеричним колом і вара — день тижня.
UPDATE analysis_systems
   SET parameters = '[{"key":"siderealSign","label":"Сидеричний знак Сонця"},{"key":"vara","label":"Вара (день тижня)"}]',
       updated_at = datetime('now')
 WHERE id = 'vedic' AND parameters = '[]';

-- ── Китайська астрологія (Ба-Цзи) ───────────────────────────────────────────
-- Три стовпи з чотирьох: година потребує часу народження.
UPDATE analysis_systems
   SET parameters = '[{"key":"yearAnimal","label":"Тварина року"},{"key":"yearElement","label":"Стихія року"},{"key":"monthPillar","label":"Стовп місяця"},{"key":"dayPillar","label":"Стовп дня"},{"key":"dayMaster","label":"День-господар"}]',
       updated_at = datetime('now')
 WHERE id = 'chinese' AND parameters = '[]';

-- ── Нумерологія ─────────────────────────────────────────────────────────────
-- Числа вираження, душі й особистості потребують імені — їх тут немає.
UPDATE analysis_systems
   SET parameters = '[{"key":"lifePath","label":"Число життєвого шляху"},{"key":"birthdayNumber","label":"Число дня народження"},{"key":"birthMonth","label":"Число місяця"},{"key":"birthYear","label":"Число року"},{"key":"karmicDebt","label":"Кармічний борг"}]',
       updated_at = datetime('now')
 WHERE id = 'numerology' AND parameters = '[]';

-- ── Маянський календар (Цолькін) ────────────────────────────────────────────
UPDATE analysis_systems
   SET parameters = '[{"key":"seal","label":"Печать дня"},{"key":"tone","label":"Тональність"},{"key":"kin","label":"Кін"},{"key":"trecena","label":"Трецена"},{"key":"haab","label":"Хааб"}]',
       updated_at = datetime('now')
 WHERE id = 'mayan' AND parameters = '[]';

-- ── Таро ────────────────────────────────────────────────────────────────────
UPDATE analysis_systems
   SET parameters = '[{"key":"birthCard","label":"Карта народження"},{"key":"cardNumber","label":"Число карти"},{"key":"cardElement","label":"Стихія карти"}]',
       updated_at = datetime('now')
 WHERE id = 'tarot' AND parameters = '[]';

-- ── Каббала ─────────────────────────────────────────────────────────────────
UPDATE analysis_systems
   SET parameters = '[{"key":"sefirah","label":"Сефіра"},{"key":"letter","label":"Літера шляху"},{"key":"gematria","label":"Гематрія дати"}]',
       updated_at = datetime('now')
 WHERE id = 'kabbalah' AND parameters = '[]';

-- ── Слов'янський календар (Коло Сварога) ────────────────────────────────────
UPDATE analysis_systems
   SET parameters = '[{"key":"chortog","label":"Чортог (палац)"},{"key":"patron","label":"Покровитель"},{"key":"element","label":"Стихія"}]',
       updated_at = datetime('now')
 WHERE id = 'slavic' AND parameters = '[]';

-- ── Книга змін (І-Цзін) ─────────────────────────────────────────────────────
UPDATE analysis_systems
   SET parameters = '[{"key":"hexagram","label":"Гексаграма дня"},{"key":"upperTrigram","label":"Верхня триграма"},{"key":"lowerTrigram","label":"Нижня триграма"},{"key":"rulingLine","label":"Провідна лінія"}]',
       updated_at = datetime('now')
 WHERE id = 'iching' AND parameters = '[]';

-- ── Руни ────────────────────────────────────────────────────────────────────
UPDATE analysis_systems
   SET parameters = '[{"key":"rune","label":"Руна дня"},{"key":"aett","label":"Атт"},{"key":"element","label":"Стихія"},{"key":"position","label":"Положення у футарку"}]',
       updated_at = datetime('now')
 WHERE id = 'runes' AND parameters = '[]';

-- ── Єгипетські декани ───────────────────────────────────────────────────────
UPDATE analysis_systems
   SET parameters = '[{"key":"decan","label":"Декан"},{"key":"god","label":"Бог-покровитель"},{"key":"quality","label":"Якість періоду"}]',
       updated_at = datetime('now')
 WHERE id = 'egyptian' AND parameters = '[]';

-- ── Кельтський календар дерев ───────────────────────────────────────────────
UPDATE analysis_systems
   SET parameters = '[{"key":"tree","label":"Дерево"},{"key":"ogham","label":"Огам-літера"},{"key":"period","label":"Період"}]',
       updated_at = datetime('now')
 WHERE id = 'druid' AND parameters = '[]';

-- Звіт: скільки систем має перелік параметрів після запуску.
SELECT id, json_array_length(parameters) AS параметрів
  FROM analysis_systems
 WHERE COALESCE(is_active, 1) = 1
 ORDER BY position, id;
