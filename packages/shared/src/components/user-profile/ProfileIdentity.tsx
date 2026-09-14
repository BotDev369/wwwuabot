import type { UserProfileData } from "./types";

/** Аватар + ім'я. Фото немає — перша літера імені на акцентному тлі. */
export function ProfileIdentity({ user, showId }: { user: UserProfileData; showId: boolean }) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "—";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
      {user.photoUrl ? (
        <img
          src={user.photoUrl}
          alt="Avatar"
          style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }}
        />
      ) : (
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "var(--accent, #6c5ce7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 28,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {(user.firstName || "?")[0]?.toUpperCase()}
        </div>
      )}
      <div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{fullName}</div>
        {user.username && (
          <div style={{ color: "var(--text-muted, #888)", fontSize: 14 }}>@{user.username}</div>
        )}
        {showId && (
          <div style={{ fontSize: 13, color: "var(--text-muted, #888)", marginTop: 2 }}>
            ID: {user.id}
          </div>
        )}
      </div>
    </div>
  );
}
