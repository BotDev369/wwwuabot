# Contributing to wwwuabot

Правила для розробників і AI-агентів. **Єдиний власник правил, архітектури й заборон —
[`AGENTS.md`](AGENTS.md)**; тут лишається рівно те, що потрібне перед пушем.

---

## Перед кожним пушем

```bash
npm test             # Vitest
npm run typecheck    # TypeScript strict — 0 any
npm run lint         # ESLint — 0 errors, 0 warnings
npm run format:check # Prettier
```

Пуш у `main` **заблоковано**, поки не пройдуть **усі** гейти CI: вони виконуються в одній джобі
`checks` перед будь-яким деплоєм, як і на кожен pull request. Що саме ловить кожен гейт, його
пороги й леджер боргу — [`docs/QUALITY_GATE.md`](docs/QUALITY_GATE.md).

---

## Конвенція комітів

```
<type>(<scope>): <опис>
```

Типи: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
Скоупи: `shared`, `ui`, `bot`, `api`, `web`, `admin`, `ci`, `docs`

Приклади:

- `feat(builder): add link-button block`
- `fix(api): validate user dates in UsersService`
- `refactor(admin): decompose PageBuilderPage into hooks`
- `test(bot): add screen routing tests`

---

## Де що читати

| Що потрібно | Документ |
|---|---|
| Правила, архітектура, доменні терміни, заборони | [`AGENTS.md`](AGENTS.md) |
| Типова задача крок за кроком: ендпоїнт, колонка D1, кирпичик, екран, тест | [`docs/RECIPES.md`](docs/RECIPES.md) |
| Пороги гейтів, леджер боргу | [`docs/QUALITY_GATE.md`](docs/QUALITY_GATE.md) |
| Покажчик усієї документації | [`docs/README.md`](docs/README.md) |
