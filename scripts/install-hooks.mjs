#!/usr/bin/env node
/**
 * Увімкнути замок на пуш: `core.hooksPath` → `.githooks`.
 *
 * Хуки лежать у репозиторії, а git їх сам не бере — тому це робить `prepare`
 * (він біжить після кожного `npm install`). Тихо нічого не ламає: якщо git
 * недоступний, скрипт лише попереджає.
 *
 * @module scripts/install-hooks
 */

import { execFileSync } from "node:child_process";

try {
  execFileSync("git", ["config", "core.hooksPath", ".githooks"], { stdio: "pipe" });
  console.log("✓ Git-хуки ввімкнено: core.hooksPath = .githooks (замок на пуш)");
} catch {
  console.warn("! Git-хуки не ввімкнено — перевір, що це git-копія репозиторію");
}
