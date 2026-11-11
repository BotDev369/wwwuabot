-- Повернути головний екран бота (`/start` без діплінка).
--
-- Що відбулося. Головна сторінка має порожній `slug` — це `HOME_SLUG`
-- (`packages/shared/src/content/resolve.ts`), і саме її шукає `/start` без
-- параметра. Рядка в базі не лишилось: бот отримував оновлення, писав подію в
-- журнал і мовчав, бо резолвер не знаходив головну.
--
-- Що тут. Той самий екран, що був у `2026-09-14-scenarios-03-home-page.sql`:
-- банер, підпис і (на рендері) рядок екранів платформи 👤 👍 📈 🌱 🧰 —
-- `buildPlatformRow` будує його з адрес, а не з бази, тож кнопок у рядку немає.
--
-- Ідемпотентна: `WHERE NOT EXISTS` не чіпає наявну головну, якщо її вже
-- створили в адмінці.

INSERT INTO scenarios (
  slug, title, photo_url,
  caption_top, caption_mid, caption_bot,
  keyboard_type, buttons, page_data, is_active, updated_at
)
SELECT
  '',
  'WWWUABot',
  'https://res.cloudinary.com/ddoumoe5n/image/upload/w_1200,h_630,c_fill,b_rgb:1a56db/l_text:Arial_72_bold:WWWUABot,co_white,c_fit,w_1000/fl_layer_apply,g_center/placeholder.png',
  '<b>WWWUABot</b> — платформа Telegram-ботів.

Один рядок у базі: сторінка у вебі + екран у боті. Обери напрямок нижче.',
  NULL,
  'Кнопка «Відкрити сторінку» відкриває вебверсію всередині Telegram.',
  'static',
  '[]',
  '{"blocks":[]}',
  1,
  datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM scenarios WHERE trim(slug) = '');
