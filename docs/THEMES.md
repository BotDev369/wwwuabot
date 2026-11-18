# Тема: дві — світла й темна

Тема — це **повний набір токенів**, а не три кольори людини. Тем рівно дві, і людина
перемикає світло, а не обирає характер продукту. Токени й наскрізні правила вигляду —
[`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md), словник значень — [`TOKENS.md`](./TOKENS.md).

## Що є

| `data-theme` | Назва | Де живе |
|---|---|---|
| `light` | Світла | `styles/tokens.css` (`:root, [data-theme="light"]`) |
| `dark` | Темна | `styles/themes.css` (`[data-theme="dark"]`) |

Темна — не інверсія світлої: своє тло (індиго → графіт → морська зелень) і світліші
акценти. Ролі в обох темах ті самі, значення різні: `--text-primary` усюди текст,
`--accent` усюди дія. Тому тема не ламає жодного екрана.

**Шрифт не в темі.** Типографіку задає `tokens.css` одна на обидві теми.

Чого більше немає: шести авторських наборів, галереї карток, редактора кольорів,
бібліотеки спільних тем, серверних `/api/user/themes` і `/api/public/themes`, таблиці
`theme_schemes` у коді.

## Вибір

**Перемикач, а не меню й не сторінка.** Кнопка теми стоїть у хедері платформи й у
сайдбарі адмінки (`ThemeButton` з `@wwwuabot/shared`); у розгорнутому вигляді це
`SwitchRow` з підписом «Тема» і станом «Світла» / «Темна», у згорнутому — одна кнопка
зі знаком сонця або місяця. Модалки вибору теми немає: вибирати нічого, є стан.

`useStyleTheme().setScheme()` ставить `data-theme` і пише вибір у `localStorage`
(`wwwuabot-theme`) однією дією (`applyTheme()`). Без вибору й без підказки системи
продукт відкривається в темній.

## Контраст

Обидві теми читає `styles/contrast.test.ts` (WCAG AA на всіх поверхнях), повноту
набору — `styles/one-style.test.ts`. Тема, що не тримає AA, на екран не потрапляє.

## Файли

| Що | Де |
|---|---|
| Метадані тем і ключ вибору | `packages/shared/src/styles/registry.ts` |
| Застосування теми (DOM, памʼять) | `packages/shared/src/styles/theme-dom.ts` |
| Палітри | `packages/shared/src/styles/tokens.css`, `themes.css` |
| Перемикач | `packages/shared/src/components/StyleToggle.tsx` |
| Хук стану | `packages/shared/src/components/theme/useStyleTheme.ts` |
| Старт і хром Telegram | `packages/shared/src/app/initTheme.ts`, `telegram-chrome.ts` |
