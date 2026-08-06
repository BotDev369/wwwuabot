import type { AppContext } from "../../../shared/types/env";
import { log } from "../../../shared/utils/debug";
import { handlePick } from "./pick";
import { handleSet } from "./set";
import { handleCheckout } from "./checkout";
import { handleTtt } from "./ttt";

export interface ParsedAction {
    action: string;
    target: string;
    param?: string;
    family: string;
}

/**
 * Парсить callback_data виду @дія:ціль:параметр
 * Повертає null, якщо це не дія (не починається з @).
 */
export function parseActionData(data: string): ParsedAction | null {
    if (!data.startsWith("@")) return null;

    const parts = data.substring(1).split(":");
    if (parts.length < 2) return null; // Мінімум має бути @дія:ціль

    const action = parts[0];
    const target = parts[1];
    const param = parts[2];

    // Сім'я = частина codeword цілі до першого "_" (згідно з ТЗ)
    const family = target.includes("_") ? target.split("_")[0] : target;

    return { action, target, param, family };
}

/**
 * Диспетчер дій. Викликає відповідний обробник.
 * Повертає true, якщо дія успішно розпізнана і передана в обробник.
 */
export async function dispatchAction(ctx: AppContext, data: string): Promise<boolean> {
    const parsed = parseActionData(data);
    if (!parsed) return false;

    log("ACTION", "dispatching", parsed);

    switch (parsed.action) {
        case "pick":
            await handlePick(ctx, parsed);
            return true;
        case "set":
            await handleSet(ctx, parsed);
            return true;
        case "checkout":
            await handleCheckout(ctx, parsed);
            return true;
        case "ttt":
            await handleTtt(ctx, parsed);
            return true;
        default:
            log("ACTION", "unknown action ignored", { action: parsed.action });
            return false;
    }
}