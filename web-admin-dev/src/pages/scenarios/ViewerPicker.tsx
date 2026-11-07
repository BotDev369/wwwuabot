/**
 * «Хто бачить сторінку» — глядачі приватної сторінки.
 *
 * Це окреме поле, а не адміни: адмін **веде** сторінку (товари, замовлення),
 * глядач лише бачить текст. Тому список читається з `scenarios.viewer_ids`, а
 * не з `admin_ids`, і збіг id у SQL тут нічого не вирішує — точний склад
 * перевіряє `pageVisibleTo`.
 *
 * Людей беруть із тієї самої таблиці `users`, що вже є в базі: тільки так
 * «додати людину» не потребує вписувати Telegram-id з пам'яті.
 *
 * @module web-admin-dev/src/pages/scenarios/ViewerPicker
 */

import { useEffect, useMemo, useState } from "react";
import { pageViewerIds } from "@wwwuabot/shared/pages";
import { listUsers, type UserRow } from "../../shared/api/users.api";

interface Props {
  fields: Record<string, unknown>;
  updateField: (key: string, value: unknown) => void;
}

const labelStyle = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  color: "var(--text-muted)",
} as const;

const hintStyle = {
  margin: "4px 0 0",
  fontSize: 12,
  lineHeight: 1.5,
  color: "var(--text-muted)",
} as const;

const listStyle = {
  maxHeight: 180,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 4,
} as const;

const rowStyle = { display: "flex", gap: 8, alignItems: "center" } as const;

/** Ім'я людини в списку: платформне, далі Telegram, далі номер рядка. */
function userName(user: UserRow): string {
  const platform = typeof user.platform_username === "string" ? user.platform_username : "";
  if (platform) return platform;
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return full || user.username || String(user.user_id);
}

export function ViewerPicker({ fields, updateField }: Props) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [query, setQuery] = useState("");
  const [failed, setFailed] = useState(false);

  const selected = pageViewerIds(fields.viewer_ids);
  const isPublic = fields.is_public === 1 || fields.is_public === "1" || fields.is_public === true;

  useEffect(() => {
    let alive = true;
    listUsers()
      .then((list) => {
        if (alive) setUsers(list);
      })
      .catch(() => {
        // Мовчати не можна: без списку людей доступ не змінити, і людина
        // мусить знати, що це не «нікого немає», а помилка.
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? users.filter(
          (user) => userName(user).toLowerCase().includes(q) || String(user.user_id).includes(q),
        )
      : users;
    return matched.slice(0, 30);
  }, [users, query]);

  function toggle(id: number): void {
    const next = selected.includes(id)
      ? selected.filter((value) => value !== id)
      : [...selected, id];
    updateField("viewer_ids", JSON.stringify(next));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={labelStyle}>Хто бачить сторінку</span>

      <label style={rowStyle}>
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => updateField("is_public", e.target.checked ? 1 : 0)}
        />
        <span>Відкрита всім (публічна)</span>
      </label>

      {!isPublic && (
        <>
          <input
            className="wb-input"
            value={query}
            placeholder="Пошук за іменем або Telegram-id"
            onChange={(e) => setQuery(e.target.value)}
          />

          {failed ? (
            <p style={{ ...hintStyle, color: "var(--danger, #dc2626)" }}>
              Список людей не завантажився — доступ не змінити. Оновіть сторінку.
            </p>
          ) : visible.length === 0 ? (
            <p style={hintStyle}>Нікого не знайдено.</p>
          ) : (
            <div style={listStyle}>
              {visible.map((user) => (
                <label key={user.user_id} style={rowStyle}>
                  <input
                    type="checkbox"
                    checked={selected.includes(user.user_id)}
                    onChange={() => toggle(user.user_id)}
                  />
                  <span>
                    {userName(user)} · {user.user_id}
                  </span>
                </label>
              ))}
            </div>
          )}

          <p style={hintStyle}>
            Обрані бачать сторінку за посиланням, навіть коли вона приватна. Список зберігається
            разом із рештою полів — кнопкою «Зберегти».
          </p>
        </>
      )}
    </div>
  );
}
