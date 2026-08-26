import type { AppContext } from "../../../shared/types/env";
import type { ParsedAction } from "./index";
import { getFamilyBox, saveFamilyBox } from "../../../shared/utils/family-box";
import {
  newGame,
  playerMove,
  type TttState,
  type TttScore,
} from "../../../modules/games/tictactoe/engine";
import { setGameScreen, setHomeScreen } from "../../../modules/games/tictactoe/render";

const FAM = "ttt";

function readScore(box: Record<string, any>): TttScore {
  const s = box.score;
  if (s && typeof s === "object") return { w: +s.w || 0, l: +s.l || 0, d: +s.d || 0 };
  return { w: 0, l: 0, d: 0 };
}

function readGame(box: Record<string, any>): TttState | null {
  const g = box.game;
  if (g && Array.isArray(g.board) && g.board.length === 9) return g as TttState;
  return null;
}

export async function handleTtt(ctx: AppContext, action: ParsedAction): Promise<void> {
  if (!ctx.user) return;

  const box = getFamilyBox(ctx.user, FAM);
  const score = readScore(box);
  const { target, param } = action;

  if (target === "menu") {
    box.resetConfirm = false;
    saveFamilyBox(ctx.user, FAM, box);
    ctx.userDirty = true;
    setHomeScreen(ctx, score, false);
    return;
  }

  if (target === "start") {
    box.game = newGame();
    box.resetConfirm = false;
    saveFamilyBox(ctx.user, FAM, box);
    ctx.userDirty = true;
    setGameScreen(ctx, box.game, score);
    return;
  }

  // ── СКИДАННЯ РАХУНКУ (двокрокове підтвердження) ─────────────
  if (target === "reset") {
    box.resetConfirm = true;
    saveFamilyBox(ctx.user, FAM, box);
    ctx.userDirty = true;
    setHomeScreen(ctx, score, true);
    return;
  }

  if (target === "reset_yes") {
    const fresh: TttScore = { w: 0, l: 0, d: 0 };
    box.score = fresh;
    box.resetConfirm = false;
    saveFamilyBox(ctx.user, FAM, box);
    ctx.userDirty = true;
    setHomeScreen(ctx, fresh, false);
    return;
  }

  if (target === "reset_no") {
    box.resetConfirm = false;
    saveFamilyBox(ctx.user, FAM, box);
    ctx.userDirty = true;
    setHomeScreen(ctx, score, false);
    return;
  }
  // ────────────────────────────────────────────────────────────

  if (target === "cell") {
    const game = readGame(box);
    if (!game) {
      setHomeScreen(ctx, score, false);
      return;
    }
    if (game.status !== "playing") {
      setGameScreen(ctx, game, score);
      return;
    }

    const idx = parseInt(param ?? "", 10);
    if (Number.isNaN(idx) || idx < 0 || idx > 8) {
      setGameScreen(ctx, game, score);
      return;
    }

    // Ігноруємо клік на зайняту клітинку — просто перерендер без змін
    if (game.board[idx] !== null) {
      setGameScreen(ctx, game, score);
      return;
    }

    const moved = playerMove(game, idx);
    if (moved && game.status !== "playing") {
      if (game.status === "win") score.w++;
      else if (game.status === "lose") score.l++;
      else score.d++;
      box.score = score;
    }
    box.game = game;
    saveFamilyBox(ctx.user, FAM, box);
    ctx.userDirty = true;
    setGameScreen(ctx, game, score);
    return;
  }

  setHomeScreen(ctx, score, false);
}
