/**
 * Page Builder — профіль користувача.
 *
 * Які поля видно — з даних; як вони стоять (картка, рядок, компактний рядок) —
 * варіант; мірки й розмір аватара — `styles/blocks.css`.
 *
 * @module packages/ui/src/blocks/UserProfileBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

export function UserProfileBlock({ block, context }: BlockComponentProps) {
  const {
    showAvatar = true,
    showName = true,
    showUsername = true,
    showId = false,
    layout = "card",
  } = block.props as {
    showAvatar?: boolean;
    showName?: boolean;
    showUsername?: boolean;
    showId?: boolean;
    layout?: string;
  };

  const user = context.user;

  if (!user) {
    return (
      <div className="wb-block-user-profile wb-empty">
        <span className="wb-text-sm wb-text-muted">Користувач не авторизований</span>
      </div>
    );
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "—";
  const avatarUrl = `https://t.me/i/userpic/320/${user.username || ""}`;
  const variant = layout === "compact" || layout === "inline" ? layout : "card";
  const avatarSize = variant === "compact" ? "sm" : variant === "inline" ? "md" : "lg";

  const avatar = showAvatar && user.username && (
    <img
      src={avatarUrl}
      alt=""
      className={`wb-block-user-profile__avatar wb-block-user-profile__avatar--${avatarSize}`}
    />
  );

  const username = showUsername && user.username && (
    <span className="wb-block-user-profile__username">@{user.username}</span>
  );

  const id = showId && <span className="wb-block-user-profile__id">ID: {user.id}</span>;

  if (variant === "compact") {
    return (
      <div className="wb-block-user-profile wb-block-user-profile--compact">
        {avatar}
        {showName && <span className="wb-block-user-profile__name">{displayName}</span>}
        {username}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className="wb-block-user-profile wb-block-user-profile--inline">
        {avatar}
        <div className="wb-block-user-profile__body">
          {showName && <span className="wb-block-user-profile__name">{displayName}</span>}
          {username}
          {id}
        </div>
      </div>
    );
  }

  return (
    <div className="wb-block-user-profile wb-block-user-profile--card">
      {avatar}
      {showName && <div className="wb-block-user-profile__name">{displayName}</div>}
      {username}
      {id}
    </div>
  );
}
