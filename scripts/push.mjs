#!/usr/bin/env node
/**
 * Пуш і перевірка деплою однією командою: `npm run push`.
 *
 * **Чому обгортка, а не два кроки.** «Запушу, а потім подивлюсь» — це і є та
 * памʼять, на яку не можна спиратись: деплой падає саме тоді, коли про нього
 * забули. Тут пуш і `scripts/watch-deploy.mjs` стоять в одному процесі, тож
 * третій крок не забувається: він фізично йде другим.
 *
 * Аргументи передаються `git push` як є (`npm run push -- --force-with-lease`),
 * але force-push у цьому репозиторії не робимо.
 *
 * Якщо пуш не вдався — код виходу того ж пушу й жодного стеження: перевіряти
 * нічого.
 *
 * @module scripts/push
 */

import { spawnSync } from "node:child_process";
import { ROOT } from "./lib/files.mjs";

// Обгортка вже стежить сама — хук не має запускати другого сторожа.
process.env.WWWUABOT_PUSH_WRAPPER = "1";

const push = spawnSync("git", ["push", ...process.argv.slice(2)], {
  cwd: ROOT,
  stdio: "inherit",
  env: process.env,
});

if (push.status !== 0) {
  console.error("✗ Пуш не пройшов — деплою немає, перевіряти нічого.");
  process.exit(push.status ?? 1);
}

const watch = spawnSync(process.execPath, ["scripts/watch-deploy.mjs"], {
  cwd: ROOT,
  stdio: "inherit",
  env: process.env,
});

process.exit(watch.status ?? 1);
