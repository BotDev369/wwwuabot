import { type ReactNode } from "react";
import { AccessDeniedPage } from "./AccessDeniedPage";
import { useAccess } from "./useAccess";

interface AuthGateProps {
  children: ReactNode;
}

/**
 * Гейт входу в платформу: підпис Telegram **і** допуск за запрошенням.
 *
 * **Чому чекаємо відповіді, а не малюємо «далі».** Поки ми не знаємо, чи є
 * допуск, платформа встигла б відмалювати каркас — футер, хаб, порожні
 * екрани з помилками 403, — а це виглядає як поломка. Тож спершу одне питання
 * до `/api/user/access` (єдиний шлях поза гейтом допуску), і лише «так»
 * відкриває додаток.
 *
 * **Помилка запиту — те саме «ні».** Показати закритий продукт людині, чий
 * допуск не вдалося перевірити, — це відкрити його.
 *
 * @module web-platform-dev/src/app/AuthGate
 */
export function AuthGate({ children }: AuthGateProps) {
  const { allowed, ready, retry } = useAccess();

  if (!ready) return <div className="wb-auth" />;

  if (!allowed) {
    return (
      <AccessDeniedPage
        subject="Платформа — за запрошеннями."
        hint="Попросіть людину, яка вже тут, надіслати вам посилання — і воно відкриється."
        onRetry={retry}
      />
    );
  }

  return <>{children}</>;
}
