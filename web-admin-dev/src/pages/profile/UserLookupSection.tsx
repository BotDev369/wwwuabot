/**
 * Профіль людини в адмінці — те саме, що людина бачить у Telegram.
 *
 * Ключове тут — не власна картка, а **спільний** `UserProfileCard` зі
 * `@wwwuabot/shared`: той самий компонент рендерить і TWA (`/profile` у
 * платформі), і модалка списку користувачів. Адмінка лише додає спосіб обрати
 * людину — за ID, бо жодного «свого» акаунта в панелі немає (вхід за паролем).
 *
 * @module web-admin-dev/src/pages/profile/UserLookupSection
 */

import { useState, type FormEvent, type ReactElement } from "react";
import { Icon, UserProfileCard, type UserProfileData } from "@wwwuabot/shared";
import { readUserProfile } from "../../shared/api/users.api";
import { parseUserIdInput } from "./session-format";

type Status = "idle" | "loading" | "empty" | "error";

export function UserLookupSection(): ReactElement {
  const [value, setValue] = useState("");
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const id = parseUserIdInput(value);
    if (id === null) {
      setProfile(null);
      setStatus("error");
      setErrorMsg("ID — це число: наприклад, 123456789");
      return;
    }

    setStatus("loading");
    setErrorMsg(null);
    try {
      const data = await readUserProfile(id);
      setProfile(data);
      setStatus(data ? "idle" : "empty");
    } catch (err: unknown) {
      setProfile(null);
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Не вдалося завантажити профіль");
    }
  }

  return (
    <section className="wb-profile">
      <h2 className="wb-profile-title">
        <Icon name="users" size={16} />
        <span>Профіль користувача</span>
      </h2>

      <p className="wb-profile-note">
        Той самий екран, що бачить людина в Telegram: усі поля рядка `users` і збережені дані, які
        віддав Telegram.
      </p>

      <form className="wb-profile-lookup" onSubmit={handleSubmit}>
        <input
          className="wb-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputMode="numeric"
          autoComplete="off"
          placeholder="ID користувача"
          aria-label="ID користувача"
        />
        <button
          type="submit"
          className="wb-btn wb-btn-primary"
          disabled={status === "loading" || !value.trim()}
        >
          {status === "loading" ? "Шукаємо…" : "Показати"}
        </button>
      </form>

      {status === "empty" && <p className="wb-profile-note">Користувача з таким ID немає.</p>}
      {status === "error" && <p className="wb-handle-error">{errorMsg}</p>}

      {status === "idle" && profile && <UserProfileCard user={profile} variant="admin" />}
    </section>
  );
}
