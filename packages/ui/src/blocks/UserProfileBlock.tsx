/**
 * Page Builder — User Profile Block.
 *
 * Displays the current Telegram user's profile info (avatar, name, username, ID)
 * from the BlockContext.user data.
 *
 * @module packages/ui/src/blocks/UserProfileBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

export function UserProfileBlock({ block, context }: BlockComponentProps) {
  const {
    showAvatar = true,
    showName = true,
    showUsername = true,
    showId = false,
    layout = 'card',
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

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || '—';
  const avatarUrl = `https://t.me/i/userpic/320/${user.username || ''}`;

  if (layout === 'compact') {
    return (
      <div className="wb-block-user-profile" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
        {showAvatar && user.username && (
          <img
            src={avatarUrl}
            alt=""
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-full)',
              objectFit: 'cover',
            }}
          />
        )}
        <span className="wb-text-sm" style={{ fontWeight: 'var(--weight-semibold)' }}>
          {showName && displayName}
        </span>
        {showUsername && user.username && (
          <span className="wb-text-xs wb-text-secondary">@{user.username}</span>
        )}
      </div>
    );
  }

  if (layout === 'inline') {
    return (
      <div className="wb-block-user-profile" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
        {showAvatar && user.username && (
          <img
            src={avatarUrl}
            alt=""
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-full)',
              objectFit: 'cover',
            }}
          />
        )}
        <div>
          {showName && <div className="wb-text-sm" style={{ fontWeight: 'var(--weight-semibold)' }}>{displayName}</div>}
          {showUsername && user.username && (
            <div className="wb-text-xs wb-text-secondary">@{user.username}</div>
          )}
          {showId && (
            <div className="wb-text-xs wb-text-muted">ID: {user.id}</div>
          )}
        </div>
      </div>
    );
  }

  // card layout (default)
  return (
    <div
      className="wb-block-user-profile"
      style={{
        padding: 'var(--sp-4)',
        background: 'var(--bg-1)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--sp-3)',
        textAlign: 'center',
      }}
    >
      {showAvatar && user.username && (
        <img
          src={avatarUrl}
          alt=""
          style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-full)',
            objectFit: 'cover',
          }}
        />
      )}
      {showName && (
        <div style={{ fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-lg)' }}>
          {displayName}
        </div>
      )}
      {showUsername && user.username && (
        <div className="wb-text-sm wb-text-secondary">@{user.username}</div>
      )}
      {showId && (
        <div className="wb-text-xs wb-text-muted">ID: {user.id}</div>
      )}
    </div>
  );
}
