Закріплена «шапка» спрацювала. Плитка-кріплення тепер не містить обмеження знизу — таблиця виводиться на сторінку, зі загальним боковим скролом.

Що змінилось:
- `packages/shared/src/styles/date-analysis.css` — прибрано обмеження max-height/overflow у таблиці, замінивши принцип «вертикальний скрол у контейнері» на «бічний скрол сторінки».
- `packages/ui/src/blocks/date-analysis/usePinnedHead.ts` — нова логіка закріплення шапки під хедером (перемикачі + заголовки).
- `packages/ui/src/blocks/date-analysis/AnalysisTable.tsx` — оновлений: нині таблиця не містить ані скролів у дуже вертикальному напрямку.
- `packages/shared/src/styles/date-analysis.test.ts` — оновлено блок тестів.
- `packages/ui/src/blocks/date-analysis-screen.dom.test.tsx` — виправлені тести під нові блоки.
- `packages/ui/src/blocks/date-analysis/usePinnedHead.dom.test.tsx` — нова тест-файл для usePinnedHead.

Гейти пройшли: typecheck, lint, check:css, check:comments, check:docs, check:quality, test.
