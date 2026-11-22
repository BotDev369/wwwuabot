-- Пошукові слова для сторінок і товарів (аркуш: specs/bot-upgrade/keywords.md).
-- Колонки `search_terms` додає ensureTables (реєстр таблиць) на першому запиті
-- воркера; цей файл лише заповнює дані і його можна запускати повторно.

UPDATE platform_pages SET search_terms = '["pageslay", "page slay", "пейджслей", "пейдж слай", "розмальовки", "кольорові сторінки", "магазин pageslay"]' WHERE slug = 'pageslay';
UPDATE platform_pages SET search_terms = '["galyashop", "galya shop", "галяшоп", "галя шоп", "галя", "крамниця галі", "трави", "лікарські рослини", "зелена аптека", "ромашка", "chamomile"]' WHERE slug = 'galyashop';
UPDATE platform_pages SET search_terms = '["вірування", "релігії", "дослідження вірувань", "релігійність", "світові релігії"]' WHERE slug = 'viruvannia';
UPDATE platform_pages SET search_terms = '["сто відсотків", "розподіл людства", "скільки віруючих"]' WHERE slug = 'viruvannia/sto-vidsotkiv';
UPDATE platform_pages SET search_terms = '["дві правди", "pew", "world religion database", "різні цифри"]' WHERE slug = 'viruvannia/dvi-pravdy';
UPDATE platform_pages SET search_terms = '["хто росте", "хто зменшується", "десять років", "карта релігій"]' WHERE slug = 'viruvannia/khto-roste-khto-zmenshuietsia';
UPDATE platform_pages SET search_terms = '["християнство", "християни", "2", "3 мільярда"]' WHERE slug = 'viruvannia/khrystyianstvo';
UPDATE platform_pages SET search_terms = '["іслам", "мусульмани", "2 мільярди"]' WHERE slug = 'viruvannia/islam';
UPDATE platform_pages SET search_terms = '["індуїзм", "індуїсти", "парасолька"]' WHERE slug = 'viruvannia/induizm';
UPDATE platform_pages SET search_terms = '["буддизм", "буддисти", "324 мільйони"]' WHERE slug = 'viruvannia/buddyzm';
UPDATE platform_pages SET search_terms = '["народні релігії", "народні культи"]' WHERE slug = 'viruvannia/narodni-relihii';
UPDATE platform_pages SET search_terms = '["nones", "нонс", "без релігії", "нерелігійні"]' WHERE slug = 'viruvannia/nones';
UPDATE platform_pages SET search_terms = '["атеїсти", "агностики", "нічого конкретного"]' WHERE slug = 'viruvannia/ateisty-ahnostyky';
UPDATE platform_pages SET search_terms = '["китай", "релігія в китаї", "народні культури"]' WHERE slug = 'viruvannia/kytai';
UPDATE platform_pages SET search_terms = '["матриця вірувань", "десять питань", "порівняння релігій"]' WHERE slug = 'viruvannia/matrytsia-viruvan';
UPDATE platform_pages SET search_terms = '["сервіси", "послуги", "сервіси платформи"]' WHERE slug = 'services';
UPDATE platform_pages SET search_terms = '["обране", "збережене", "закладки"]' WHERE slug = 'favorites';
UPDATE platform_pages SET search_terms = '["дослідження", "дослідження платформи", "статті"]' WHERE slug = 'research';
UPDATE platform_pages SET search_terms = '["контакти", "зв''язок", "адмін", "підтримка"]' WHERE slug = 'contacts';
UPDATE platform_pages SET search_terms = '["головна", "платформа", "паляниця", "palyanytsia", "wwwuabot"]' WHERE slug = ' (головна)';

UPDATE shop_products SET search_terms = '["деревій", "деревій звичайний", "кровоспинна трава"]' WHERE slug = 'dereviy-zvychaynyy' AND shop_id = (SELECT id FROM platform_pages WHERE slug = 'galyashop');
UPDATE shop_products SET search_terms = '["гісоп", "гісоп лікарський", "hyssop"]' WHERE slug = 'hisop-likarskyy' AND shop_id = (SELECT id FROM platform_pages WHERE slug = 'galyashop');
UPDATE shop_products SET search_terms = '["береза", "листя берези", "березовий лист"]' WHERE slug = 'bereza-povysla-lystya' AND shop_id = (SELECT id FROM platform_pages WHERE slug = 'galyashop');
UPDATE shop_products SET search_terms = '["безсмертник", "цмин", "безсмертник піщаний"]' WHERE slug = 'bezsmertnyk' AND shop_id = (SELECT id FROM platform_pages WHERE slug = 'galyashop');
UPDATE shop_products SET search_terms = '["астрагал", "астрагал шерстистоквітковий", "трава астрагал"]' WHERE slug = 'astrahal-sherstystok' AND shop_id = (SELECT id FROM platform_pages WHERE slug = 'galyashop');
UPDATE shop_products SET search_terms = '["мʼята", "м''ята", "м''ята перцева", "mint"]' WHERE slug = 'myata-pertseva' AND shop_id = (SELECT id FROM platform_pages WHERE slug = 'galyashop');
UPDATE shop_products SET search_terms = '["календула", "нагідки", "календула лікарська"]' WHERE slug = 'kalendula-likarska' AND shop_id = (SELECT id FROM platform_pages WHERE slug = 'galyashop');
UPDATE shop_products SET search_terms = '["пижмо", "пижмо звичайне", "дика горобина"]' WHERE slug = 'pyzhmo-zvychayne' AND shop_id = (SELECT id FROM platform_pages WHERE slug = 'galyashop');
UPDATE shop_products SET search_terms = '["троянда", "троянда чайна", "пелюстки троянди"]' WHERE slug = 'troyanda-chayna' AND shop_id = (SELECT id FROM platform_pages WHERE slug = 'galyashop');
UPDATE shop_products SET search_terms = '["хвощ", "хвощ польовий", "польовий хвощ"]' WHERE slug = 'khvoshch-polovyy' AND shop_id = (SELECT id FROM platform_pages WHERE slug = 'galyashop');
UPDATE shop_products SET search_terms = '["хміль", "хміль звичайний", "шишки хмелю"]' WHERE slug = 'khmil-zvychaynyy' AND shop_id = (SELECT id FROM platform_pages WHERE slug = 'galyashop');
UPDATE shop_products SET search_terms = '["чорнобривці", "чорнобривці розлогі", "tagetes"]' WHERE slug = 'chornobryvtsi-rozlohi' AND shop_id = (SELECT id FROM platform_pages WHERE slug = 'galyashop');
UPDATE shop_products SET search_terms = '["подорожник", "подорожник великий", "лист подорожника"]' WHERE slug = 'podorozhnyk-velykyy' AND shop_id = (SELECT id FROM platform_pages WHERE slug = 'galyashop');
UPDATE shop_products SET search_terms = '["іван-чай", "іван чай", "ферментований чай", "копорський чай"]' WHERE slug = 'ivan-chay-fermentovanyy' AND shop_id = (SELECT id FROM platform_pages WHERE slug = 'galyashop');
UPDATE shop_products SET search_terms = '["звіробій", "звіробій звичайний", "st johns wort"]' WHERE slug = 'zvirobiy-zvychaynyy' AND shop_id = (SELECT id FROM platform_pages WHERE slug = 'galyashop');
UPDATE shop_products SET search_terms = '["neko girls", "неко", "дівчата-коти", "аніме розмальовки"]' WHERE slug = 'neko-girls' AND shop_id = (SELECT id FROM platform_pages WHERE slug = 'pageslay');
UPDATE shop_products SET search_terms = '["русалка", "mermaid", "підводний світ", "розмальовка русалка"]' WHERE slug = 'mermaid' AND shop_id = (SELECT id FROM platform_pages WHERE slug = 'pageslay');
UPDATE shop_products SET search_terms = '["повсякденні моменти", "everyday moments", "розмальовки побут"]' WHERE slug = 'everyday-moments' AND shop_id = (SELECT id FROM platform_pages WHERE slug = 'pageslay');
UPDATE shop_products SET search_terms = '["загін дивних створінь", "weird creature squad", "дивні створіння"]' WHERE slug = 'weird-creature-squad' AND shop_id = (SELECT id FROM platform_pages WHERE slug = 'pageslay');
UPDATE shop_products SET search_terms = '["сердиті коти", "angry cats", "коти", "20 розмальовок"]' WHERE slug = 'angry-cats' AND shop_id = (SELECT id FROM platform_pages WHERE slug = 'pageslay');
UPDATE shop_products SET search_terms = '["соларпанк", "solarpunk", "фантастика розмальовки"]' WHERE slug = 'solarpunk' AND shop_id = (SELECT id FROM platform_pages WHERE slug = 'pageslay');
