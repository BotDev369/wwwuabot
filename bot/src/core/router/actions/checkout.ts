import type { AppContext } from "../../../shared/types/env";
import type { ParsedAction } from "./index";
import { log } from "../../../shared/utils/debug";
import { getFamilyBox, saveFamilyBox } from "../../../shared/utils/family-box";

export async function handleCheckout(ctx: AppContext, action: ParsedAction): Promise<void> {
  const { target, family } = action;
  log("ACTION:checkout", "processing", { target, family });

  if (!ctx.user || !ctx.screen) {
    log("ACTION:checkout", "error: no user or screen");
    return;
  }

  // 1. Отримуємо коробку сім'ї
  const box = getFamilyBox(ctx.user, family);
  const cart = box.cart || {};

  // 2. Перевіряємо чи кошик не порожній
  if (Object.keys(cart).length === 0) {
    log("ACTION:checkout", "skipped | cart is empty");
    return;
  }

  // 3. Рахуємо суму і формуємо текст позицій
  let total = 0;
  const itemsText: string[] = [];
  for (const [codeword, item] of Object.entries(cart) as [string, any][]) {
    const price = Number(item.price) || 0;
    const qty = Number(item.qty) || 0;
    const sum = price * qty;
    total += sum;
    itemsText.push(`${item.title} — ${price}₴ x ${qty} = ${sum}₴`);
  }

  // 4. Створюємо знімок замовлення
  const order = {
    items: cart,
    created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
    status: "new",
  };

  // 5. Оновлюємо коробку: додаємо в orders, чистимо cart
  if (!box.orders) box.orders = [];
  box.orders.push(order);
  box.cart = {};
  saveFamilyBox(ctx.user, family, box);
  ctx.userDirty = true;

  log("ACTION:checkout", "order saved", {
    family,
    order_index: box.orders.length - 1,
    total,
    items_count: Object.keys(cart).length,
  });

  // 6. Підготовка нотифікації (відкладаємо до postMiddleware)
  ctx.pendingNotification = {
    data: {
      cart_items: itemsText.join("\n"),
      cart_total: total,
      order_id: box.orders.length - 1,
    },
  };
  log("ACTION:checkout", "notification deferred to postMiddleware");
}
