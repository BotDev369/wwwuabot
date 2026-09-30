/**
 * Сторінка «за запрошенням» — те, що бачить людина без допуску.
 *
 * **Одна дія, і вона тут.** Людина, якій відмовили, мусить мати десь сказати
 * «запростіть мене» — і це має бути **тут**, у цьому ж екрані: перехід кудись
 * ще далі означає б, що наступного кроку вона не зробить. Тому форма з полем
 * і кнопкою, без «відкрити в Telegram» й без «спробувати ще раз».
 *
 * **Каркас — спільний `.wb-auth*` і `.wb-input`, як у `LoginScreen` адмінки.**
 * Оболонки однакові за виглядом (AGENTS.md §3), тому приватний CSS на цю
 * сторінку не потрібен і не з'явиться.
 *
 * @module web-platform-dev/src/app/AccessDeniedPage
 */

import { useState, type FormEvent } from "react";
import { Icon } from "@wwwuabot/shared";
import { sendAccessRequest } from "@/shared/api/access.api";

export function AccessDeniedPage() {
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const message = text.trim();
    if (!message || state === "sending") return;

    setState("sending");
    const ok = await sendAccessRequest(message);
    setState(ok ? "sent" : "failed");
    if (ok) setText("");
  }

  return (
    <div className="wb-auth">
      <div className="wb-auth-card">
        <div className="wb-auth-logo">
          <span className="wb-auth-logo-icon">✦</span>
          <span className="wb-auth-logo-text">WWWUABOT</span>
        </div>
        <p className="wb-auth-message">Платформа — за запрошеннями.</p>
        <p className="wb-auth-message">
          Напишіть, будь ласка, як вас запросити — і ми відкриємо доступ.
        </p>
        {state === "sent" ? (
          <p className="wb-auth-message">Написано. Дякуємо!</p>
        ) : (
          <form className="wb-auth-form" onSubmit={onSubmit}>
            <div className="wb-auth-field">
              <textarea
                className="wb-textarea"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Ваше повідомлення"
                rows={4}
                maxLength={500}
              />
              {state === "failed" ? (
                <p className="wb-auth-error">Не вдалося надіслати. Спробуйте ще раз.</p>
              ) : null}
            </div>
            <button
              type="submit"
              className="wb-btn wb-btn-primary wb-auth-submit"
              disabled={state === "sending" || !text.trim()}
            >
              <Icon name="mail" size={16} />
              {state === "sending" ? "Надсилаємо…" : "Написати адміну"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
