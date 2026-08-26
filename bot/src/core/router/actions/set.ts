import type { AppContext } from "../../../shared/types/env";
import type { ParsedAction } from "./index";
import { log } from "../../../shared/utils/debug";
import { getFamilyBox, saveFamilyBox } from "../../../shared/utils/family-box";

export async function handleSet(ctx: AppContext, action: ParsedAction): Promise<void> {
  const { target, param, family } = action;
  const qty = parseInt(param || "0", 10);

  log("ACTION:set", "processing", { target, qty, family });

  if (!ctx.user || !ctx.screen) {
    log("ACTION:set", "error: no user or screen");
    return;
  }

  // Отримуємо JSON-коробку сім'ї (безпечно, з захистом від битого JSON)
  const box = getFamilyBox(ctx.user, family);

  // Якщо qty === 0 — видаляємо товар з кошика
  if (qty === 0) {
    const shortKey = target.includes("_") ? target.substring(family.length + 1) : target;
    if (box.cart && box.cart[shortKey]) {
      delete box.cart[shortKey];
      log("ACTION:set", "removed from cart", { target: shortKey });
    }
  } else {
    // Інакше — додаємо/оновлюємо позицію
    const title = ctx.screen.caption?.top || target; // fallback на codeword
    const price = ctx.screen.price;

    if (price === null) {
      log("ACTION:set", "error: no price in scenario", { target });
      return;
    }

    if (!box.cart) box.cart = {};
    const shortKey = target.includes("_") ? target.substring(family.length + 1) : target;
    box.cart[shortKey] = { title, price, qty };

    log("ACTION:set", "added to cart", { target, title, price, qty });
  }

  // Зберігаємо коробку назад (серіалізація в JSON)
  saveFamilyBox(ctx.user, family, box);
  ctx.userDirty = true; // ← Прапорець на ctx, не на user!

  log("ACTION:set", "saved", { family, cart: box.cart });
}
