/**
 * Вітрина — головний екран (макет 08 · Вхід / вітрина): хто ми, для кого й три
 * двері всередину. Хедера й сайдбара тут немає: вітрина сама собі шапка.
 *
 * «Увійти» веде в «Мій день» — людина вже авторизована підписом Telegram.
 *
 * @module web-platform-dev/src/pages/entry/EntryPage
 */

import { useState, type FormEvent, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { ACCESS_REQUEST_MAX } from "@wwwuabot/shared/access-requests";
import { DAY_PATH, ORDERS_PATH, USERS_PATH } from "@/app/routes";
import { sendAccessRequest } from "@/shared/api/access.api";

/** Три входи вітрини: кожен — екран, а не обіцянка. */
const ENTRIES: readonly { label: string; href: string }[] = [
  { label: "Замовлення", href: ORDERS_PATH },
  { label: "Гурт", href: USERS_PATH },
  { label: "Мій день", href: DAY_PATH },
];

type SendState = "closed" | "open" | "sending" | "sent" | "failed";

export function EntryPage(): ReactElement {
  const navigate = useNavigate();
  const [state, setState] = useState<SendState>("closed");
  const [text, setText] = useState("");

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const message = text.trim();
    if (!message || state === "sending") return;

    setState("sending");
    const ok = await sendAccessRequest(message);
    setState(ok ? "sent" : "failed");
    if (ok) setText("");
  }

  return (
    <main className="wb-showcase">
      <div className="wb-showcase-blob wb-showcase-blob-a" aria-hidden="true" />
      <div className="wb-showcase-blob wb-showcase-blob-b" aria-hidden="true" />
      <svg className="wb-showcase-watermark" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="58" r="28" fill="#ffffff" />
        <path d="M6 80h88" stroke="#ffffff" strokeWidth="1.3" />
        <path d="M14 72h72" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
      </svg>

      <div className="wb-showcase-top">
        <svg className="wb-showcase-mark" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="30" fill="#ffffff" opacity="0.96" />
          <g
            clipPath="url(#wb-showcase-mask)"
            stroke="var(--accent)"
            strokeWidth="7"
            strokeLinecap="round"
          >
            <path d="M4 26L60 48" />
            <path d="M60 26L4 48" />
          </g>
          <defs>
            <clipPath id="wb-showcase-mask">
              <circle cx="32" cy="32" r="26" />
            </clipPath>
          </defs>
        </svg>
        <span className="wb-showcase-word">ПАЛЯНИЦЯ</span>
      </div>

      <div className="wb-showcase-hero">
        <p className="wb-showcase-cap">Вхід за запрошенням</p>
        {/* Три рядки — як у макеті: перенос задає автор, а не ширина екрана. */}
        <h1 className="wb-showcase-title" aria-label="Ділова платформа для Своїх">
          Ділова
          <br />
          платформа
          <br />
          для Своїх
        </h1>
        <p className="wb-showcase-sub">
          Своє коло. Свої справи. Своя мова.
          <br />
          Без зайвих.
        </p>
      </div>

      <div className="wb-showcase-panel">
        <button type="button" className="wb-showcase-go" onClick={() => void navigate(DAY_PATH)}>
          Увійти
        </button>

        <p className="wb-showcase-or">або</p>

        {state === "sent" ? (
          <p className="wb-showcase-sent">Звернення надіслано. Відповідь прийде в боті.</p>
        ) : state === "closed" ? (
          <button type="button" className="wb-showcase-ghost" onClick={() => setState("open")}>
            Попросити доступ
          </button>
        ) : (
          <form className="wb-showcase-ask" onSubmit={onSubmit}>
            <textarea
              className="wb-textarea"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={3}
              maxLength={ACCESS_REQUEST_MAX}
              placeholder="Хто ви й чому хочете всередину"
              aria-label="Прохання про доступ"
            />
            {state === "failed" ? (
              <p className="wb-text-red">Не вдалося. Спробуйте ще раз.</p>
            ) : null}
            <button
              type="submit"
              className="wb-btn wb-btn-primary wb-showcase-send"
              disabled={state === "sending" || !text.trim()}
            >
              {state === "sending" ? "Надсилаємо…" : "Відправити"}
            </button>
          </form>
        )}

        <div className="wb-showcase-feats">
          {ENTRIES.map((entry, index) => (
            <button
              key={entry.href}
              type="button"
              className="wb-showcase-feat"
              onClick={() => void navigate(entry.href)}
            >
              <span className="wb-showcase-num">0{index + 1}</span>
              <span className="wb-showcase-feat-label">{entry.label}</span>
            </button>
          ))}
        </div>

        <p className="wb-showcase-foot">українською · для українців у світі</p>
      </div>
    </main>
  );
}
