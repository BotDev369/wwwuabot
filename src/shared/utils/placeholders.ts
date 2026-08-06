import type { AppContext } from "../types/env";
import { getFamilyBox } from "./family-box";

/**
 * Автоматично обробляє кнопки кошика та товарів.
 * - Для @_cart: додає загальну суму кошика.
 * - Для @pick: (товар): 
 *   1. Парсить подвійний текст через ";" (напр. "➕ Додати; ➖ Змінити").
 *   2. Якщо товару немає в кошику -> показує першу частину тексту (1 кнопка).
 *   3. Якщо товар є в кошику -> показує другу частину тексту + додає кнопку "❌ Видалити" (2 кнопки в ряд).
 * - Для #prod (каталог): додає іконку кошика з кількістю.
 */
export function replaceQtyInButtons(buttons: any[][], ctx: AppContext): any[][] {
  const user = ctx.user;
  if (!user) return buttons;

  return buttons.map(row =>
    row.flatMap(btn => {
      if (!btn.text || !btn.callback_data) return btn;
      
      const callbackData = btn.callback_data;
      const pureCallbackData = callbackData.includes("#")
        ? callbackData.split("#")[0]
        : callbackData;
      
      const family = pureCallbackData.includes("_")
        ? pureCallbackData.split("_")[0]
        : pureCallbackData;
      
      const box = getFamilyBox(user, family);
      const cart = box.cart || {};

      // 1. Загальна кнопка кошика (закінчується на _cart)
      if (pureCallbackData.endsWith("_cart")) {
        const keys = Object.keys(cart);
        if (keys.length === 0) return btn;
        
        let totalQty = 0;
        let totalPrice = 0;
        keys.forEach(key => {
          const item = cart[key];
          const qty = Number(item.qty) || 0;
          const price = Number(item.price) || 0;
          totalQty += qty;
          totalPrice += price * qty;
        });
        return { ...btn, text: `${btn.text} -> ${totalQty} = ${totalPrice}₴` };
      }

      // 2. Кнопка товару з дією @pick: (Додати/Змінити)
      if (callbackData.startsWith("@pick:")) {
        const target = callbackData.split(":")[1] || "";
        const pureTarget = target.includes("#") ? target.split("#")[0] : target;
        if (!pureTarget) return btn;

        const itemFamily = pureTarget.includes("_") ? pureTarget.split("_")[0] : pureTarget;
        const shortKey = pureTarget.includes("_") ? pureTarget.substring(itemFamily.length + 1) : pureTarget;
        const itemBox = getFamilyBox(user, itemFamily);
        const itemCart = itemBox.cart || {};
        const item = itemCart[shortKey];

        // Логіка подвійного тексту через ";"
        let newText = btn.text;
        if (btn.text.includes(";")) {
          const parts = btn.text.split(";").map((p: string) => p.trim());
          newText = item ? (parts[1] || parts[0]) : parts[0];
        }

        if (!item) {
          return { ...btn, text: newText };
        } else {
          return [
            { ...btn, text: newText },
            { 
              text: "❌ Видалити", 
              callback_data: `@set:${pureTarget}:0`
            }
          ];
        }
      }

      // 3. Звичайна кнопка товару в каталозі (закінчується на #prod)
      if (callbackData.endsWith("#prod")) {
        const shortKey = pureCallbackData.includes("_")
          ? pureCallbackData.substring(family.length + 1)
          : pureCallbackData;
        const item = cart[shortKey];
        if (!item) return btn;
        
        const qty = Number(item.qty) || 0;
        if (qty === 0) return btn;
        
        return { ...btn, text: `${btn.text} -> 🛒 ${qty}` };
      }

      return btn;
    })
  );
}

/**
 * Замінює ${cart_items}, ${cart_total} та ${price} у тексті підпису.
 */
export function replaceCartInfo(text: string | undefined, family: string, ctx: AppContext): string | undefined {
  // ← ВИПРАВЛЕННЯ: якщо немає юзера — просто повертаємо текст
  if (!ctx.user) {
    return text;
  }
  
  const user = ctx.user;
  if (!text) return text;
  
  // ← НОВЕ: Обробка ${price} (беремо з ctx.screen.price)
  if (text.includes("${price}")) {
    const price = ctx.screen?.price ?? 0;
    text = text.replace(/\$\{price\}/g, `${price}₴`);
  }
  
  const box = getFamilyBox(user, family);
  const cart = box.cart || {};
  const keys = Object.keys(cart);

  // Обробка ${cart_items}
  if (text.includes("${cart_items}")) {
    if (keys.length === 0) {
      text = text.replace(/\$\{cart_items\}/g, "— порожньо —");
    } else {
      const itemsText = keys.map(key => {
        const item = cart[key];
        const price = Number(item.price) || 0;
        const qty = Number(item.qty) || 0;
        const sum = price * qty;
        return `${item.title} — ${price}₴ x ${qty} = ${sum}₴`;
      }).join("\n");
      text = text.replace(/\$\{cart_items\}/g, itemsText);
    }
  }

  // Обробка ${cart_total}
  if (text.includes("${cart_total}")) {
    let total = 0;
    keys.forEach(key => {
      const item = cart[key];
      total += (Number(item.price) || 0) * (Number(item.qty) || 0);
    });
    text = text.replace(/\$\{cart_total\}/g, String(total));
  }

  return text;
}