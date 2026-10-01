/**
 * Сторінка «за запрошенням» — те, що бачить людина без допуску.
 *
 * **Одна дія, і вона тут.** Людина, якій відмовили, мусить мати десь сказати
 * «ось моє питання» — і це має бути **тут**, у цьому ж екрані: перехід кудись
 * ще далі означає б, що наступного кроку вона не зробить. Тому форма з полем
 * і кнопкою, без «відкрити в Telegram» й без «спробувати ще раз».
 *
 * **Текст нейтральний.** Поле не про запрошення: людину можуть цікавити
 * будь-яке питання чи пропозиція, а не лише «запросіть мене». Обіцянка
 * «ми відкриємо доступ» тут не потрібна — вона була б і правдою для одного
 * випадку, і порожніми словами для решти.
 *
 * **Екран, а не модалка.** Вміст займає всю висоту, а поле росте на вільне
 * місце: маленька картка посередині телефона з двома рядками тексту читалася б
 * як спливаюче вікно, а не як сторінка.
 *
 * **Каркас — спільний `.wb-auth*` і `.wb-textarea`, як у `LoginScreen`
 * адмінки.** Приватного CSS на цю сторінку немає й не з'явиться.
 *
 * @module web-platform-dev/src/app/AccessDeniedPage
 */

import { useState, type FormEvent } from "react";
import { Icon } from "@wwwuabot/shared";
import { sendAccessRequest } from "@/shared/api/access.api";

/** Скільки символів вміщує поле — те саме число, що приймає сервер. */
const TEXT_MAX = 500;

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
        <div className="wb-auth-logo">
          <span className="wb-auth-logo-icon">✦</span>
          <span className="wb-auth-logo-text">WWWUABOT</span>
        </div>
        <p className="wb-auth-message">Платформа — за запрошеннями.</p>
        {state === "sent" ? (
          <p className="wb-auth-message">Написано. Дякуємо!</p>
        ) : (
          <form className="wb-auth-form" onSubmit={onSubmit}>
            <p className="wb-auth-label">
              Напишіть адміну — будь-яке питання, пропозиція чи зауваження.
            </p>
            <div className="wb-auth-field wb-auth-field--grow">
              <textarea
                className="wb-textarea wb-textarea--grow"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Ваше повідомлення"
                rows={4}
                maxLength={TEXT_MAX}
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
