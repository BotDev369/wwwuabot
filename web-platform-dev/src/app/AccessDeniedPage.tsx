/**
 * Відмова — **стопінка**, а не сторінка з текстом.
 *
 * **На екрані два елементи й жодного слогана.** Знак «зупинка» каже «сюди не
 * можна» без слів, а під ним окремий блок «Написати адміну» з полем і
 * кнопкою «Відправити». Пояснювати тут нічего не треба: хто відкрив
 * посилання, той і так знає, що платформа закрита — слогани тут лише
 * заповнюють екран.
 *
 * **Слова на екрані — ті, що дав продукт.** «Написати адміну» і «Відправити»
 * єдина дія сторінки; усе інше (`ACCESS_DENIED` у `bot-dev`) живе в чаті,
 * де людина спершу спробувала відкрити бота.
 *
 * **Каркас — спільний `.wb-auth*` і `.wb-textarea`,** як у `LoginScreen`
 * адмінки. Приватного CSS тут немає.
 *
 * @module web-platform-dev/src/app/AccessDeniedPage
 */

import { useState, type FormEvent } from "react";
import { sendAccessRequest } from "@/shared/api/access.api";
import { ACCESS_REQUEST_MAX } from "@wwwuabot/shared/access-requests";

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
    <div className="wb-auth wb-auth--page">
      <div className="wb-auth-sheet">
        <div className="wb-auth-stage">
          <span className="wb-stop-mark" aria-hidden="true" />
        </div>

        <form className="wb-auth-contact" onSubmit={onSubmit}>
          <h2 className="wb-auth-contact-title">Написати адміну</h2>

          {state === "sent" ? (
            <p className="wb-auth-message">Відправлено.</p>
          ) : (
            <>
              <textarea
                className="wb-textarea"
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={4}
                maxLength={ACCESS_REQUEST_MAX}
              />
              {state === "failed" ? <p className="wb-auth-error">Не вдалося.</p> : null}
              <button
                type="submit"
                className="wb-btn wb-btn-primary wb-auth-submit"
                disabled={state === "sending" || !text.trim()}
              >
                {state === "sending" ? "Надсилаємо…" : "Відправити"}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
