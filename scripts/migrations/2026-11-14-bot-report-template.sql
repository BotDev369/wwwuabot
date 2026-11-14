-- 14.11.2026 — шаблон звіту агента про деплой.
--
-- Слова, які читає власник, живуть у рядку `bot_scenarios` з ключем `/report`,
-- а не в коді: `POST /reports` лише підставляє дані CI у `{{…}}`. Через це
-- шаблон можна переписати без деплою воркера, і `npm run check:texts` не
-- рахує жодного нового літерала.
--
-- `widget_data` тримає тільки слово статусу: решта — у самому HTML. Порожне
-- значення (немає рядка) — це «звіт не надіслати», а не «надіслати без слів»:
-- типовий текст у коді приховав би помилку.

INSERT INTO bot_scenarios (lookup, kind, rich_html, widget_data, is_active)
VALUES (
  '/report',
  'rich',
  '<h1>Звіт від Buffy</h1>
<p><i>Codebuff · агент у репозиторії {{repo}}</i></p>
<hr/>
<p>{{statusIcon}} <b>{{statusWord}}</b> · {{branch}} · <code>{{shaShort}}</code> · {{date}}</p>
<table bordered striped compact>
<tr><th>Джоба</th><th>Стан</th></tr>
{{jobs}}
</table>
<details><summary>Перевірки · {{gateCount}}</summary>
<table bordered striped compact>
<tr><th>Крок</th><th>Стан</th></tr>
{{gates}}
</table>
</details>
<details><summary>Коміт</summary>
<p>{{commitSubject}}</p>
<p><code>{{shaShort}}</code> · +{{added}} / −{{removed}} · {{files}} файлів · {{author}}</p>
</details>
<details><summary>Що змінилось</summary>
{{notes}}
</details>
<details><summary>Що не перевірено</summary>
{{limitations}}
</details>
<details><summary>Середовище за добу</summary>
{{env}}
</details>
<hr/>
<tg-button-row align="center">
<tg-button type="url" style="primary" url="{{runUrl}}">Deploy run</tg-button>
<tg-button type="url" style="success" url="{{commitUrl}}">Коміт</tg-button>
</tg-button-row>
<tg-button-row align="center">
<tg-button type="web_app" style="primary" url="{{platformUrl}}">Платформа</tg-button>
<tg-button type="callback_data" style="link" data="reports">Історія</tg-button>
</tg-button-row>
<footer>Автоматичний звіт агента Buffy · написаний не людиною</footer>',
  '{"success":"успішно","failure":"збій","cancelled":"скасовано"}',
  1
)
ON CONFLICT(lookup) DO UPDATE SET
  kind = 'rich',
  rich_html = excluded.rich_html,
  widget_data = excluded.widget_data,
  is_active = 1,
  updated_at = datetime('now');
