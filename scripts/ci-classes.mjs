/**
 * Реєстр класів падінь: крок → причина → лікування.
 *
 * Це дані, а не логіка: `ci-triage.mjs` лише зіставляє з ними невдалий крок.
 * Опис класів для людей — `docs/CI_TRIAGE.md`; назви й регекси живуть тільки
 * тут, щоб таблиця не стала другою правдою.
 *
 * `step` звіряється з назвою кроку. `job` — якщо заданий: у деплой-джобах кроки
 * звуться однаково, і без джоби «збірка» не відрізнялась би від «деплою».
 * `transient` — падіння не про код: такі має сенс перезапустити.
 *
 * @module scripts/ci-classes
 */

export const CLASSES = [
  {
    id: "coverage",
    step: /^Coverage floor$/,
    cause: "новий або змінений файл прийшов без тесту",
    fix: "тест на нову поведінку; перед пушем — `npm run verify`",
  },
  {
    id: "comments",
    step: /^Comments$/,
    cause: "блок коментарів понад вісім рядків або мертвий шлях у коментарі",
    fix: "скоротити блок або перенести пояснення в `docs/`",
  },
  {
    id: "docs",
    step: /^Docs$/,
    cause: "документ за межею редагування, мертве посилання або § без дому",
    fix: "поділити документ на теми, поправити посилання",
  },
  {
    id: "format",
    step: /^Format check$/,
    cause: "файл не прогнано через Prettier",
    fix: "`npx prettier --write <файл>`",
  },
  {
    id: "style",
    step: /^Style catalog$/,
    cause: "каталог вигляду застарів після правки CSS",
    fix: "`npm run build:style` (або `npm run check:style -- --write`)",
  },
  {
    id: "audit",
    step: /^Security audit/,
    cause: "`npm audit` знайшов уразливість рівня high",
    fix: "оновити залежність; якщо фіксу немає — виняток із причиною в PR",
  },
  {
    id: "quality",
    step: /^Quality bar$/,
    cause: "файл понад межу рядків, нативний alert/confirm, 100vh без dvh або емодзі в UI",
    fix: "див. вивід гейта; борг живе в `scripts/quality-baseline.mjs`",
  },
  {
    id: "css",
    step: /^CSS classes$/,
    cause: "клас у розмітці без правила в CSS (або навпаки)",
    fix: "прибрати клас або додати правило",
  },
  {
    id: "inline",
    step: /^Inline styles/,
    cause: "інлайновий стиль в адмінці замість токена",
    fix: "клас або токен замість `style=`",
  },
  {
    id: "db",
    step: /^D1 schema$/,
    cause: "таблиця або `CREATE TABLE` поза реєстром схеми",
    fix: "`docs/DATA_MODEL.md` + `scripts/migrations/`",
  },
  {
    id: "lint",
    step: /^Run npm run lint$/,
    cause: "порушення ESLint",
    fix: "`npm run lint` локально, виправити, а не глушити правило",
  },
  {
    id: "typecheck",
    step: /^Run npm run typecheck$/,
    cause: "помилка типів",
    fix: "`npm run typecheck`; тип — не привід для `any`",
  },
  {
    id: "build",
    job: /^checks$/,
    step: /^Build shells/,
    cause: "збірка оболонки не пройшла",
    fix: "`npm run build --workspace web-platform-dev` і `web-admin-dev` локально",
  },
  {
    id: "bundle",
    step: /^Bundle budget$/,
    cause: "бандл переріс бюджет",
    fix: "прибрати зайве з входу бандла; бюджет — `scripts/bundle-baseline.mjs`",
  },
  {
    id: "tests",
    step: /^Unit tests$/,
    cause: "юніт-тест упав",
    fix: "`npm test` локально",
  },
  {
    id: "setup",
    step: /^(Run npm ci|Set up job|Run actions\/checkout|Run actions\/setup-node)$/,
    cause: "підготовка джоби: lockfile, мережа або реєстр npm",
    fix: "повторити; якщо повторюється — `npm ci` локально й перевірити lockfile",
    transient: true,
  },
  {
    id: "deploy-build",
    step: /^Run cd .* && npm run build$/,
    cause: "збірка воркера перед деплоєм не пройшла",
    fix: "та сама збірка локально; гейти цього не ловлять, бо `vite build` у CI інший",
  },
  {
    id: "deploy-flake",
    step: /wrangler deploy/,
    cause: "Cloudflare не прийняв деплой: квота, 5xx або обрив",
    fix: "перезапуск невдалих джоб; повтор — це сигнал про ліміт, а не про код",
    transient: true,
  },
];
