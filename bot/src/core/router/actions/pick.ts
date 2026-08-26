import type { AppContext } from "../../../shared/types/env";
import type { ParsedAction } from "./index";
import { log } from "../../../shared/utils/debug";

export async function handlePick(ctx: AppContext, action: ParsedAction): Promise<void> {
  // Ціль — це codeword товару. Оскільки кнопка @pick завжди на екрані товару,
  // дані (qty_options) вже завантажені в ctx.screen. Жодного запиту в БД!
  ctx.pickTarget = action.target;
  log("ACTION:pick", "target set for render", { target: action.target });
}
