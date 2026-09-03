/**
 * Page Builder — Testimonial Block.
 *
 * Displays a customer review/quote with optional avatar, role, and star rating.
 *
 * @module packages/ui/src/blocks/TestimonialBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

export function TestimonialBlock({ block }: BlockComponentProps) {
  const {
    text = '',
    author = '',
    role = '',
    avatar = '',
    rating = 0,
  } = block.props as {
    text?: string;
    author?: string;
    role?: string;
    avatar?: string;
    rating?: number;
  };

  return (
    <div
      className="wb-block-testimonial"
      style={{
        padding: 'var(--sp-5)',
        background: 'var(--bg-1)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-3)',
      }}
    >
      {/* Stars */}
      {rating > 0 && (
        <div style={{ display: 'flex', gap: '2px' }}>
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              style={{
                color: i < Math.round(rating) ? 'var(--yellow)' : 'var(--border-subtle)',
                fontSize: 'var(--text-lg)',
                lineHeight: 1,
              }}
            >
              ★
            </span>
          ))}
        </div>
      )}

      {/* Quote */}
      <p
        className="wb-text-primary"
        style={{
          fontStyle: 'italic',
          lineHeight: 'var(--font-lineheight-3)',
          margin: 0,
        }}
      >
        &ldquo;{text}&rdquo;
      </p>

      {/* Author */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
        {avatar && (
          <img
            src={avatar}
            alt={author}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-full)',
              objectFit: 'cover',
            }}
          />
        )}
        <div>
          <div className="wb-text-sm" style={{ fontWeight: 'var(--weight-semibold)' }}>
            {author}
          </div>
          {role && (
            <div className="wb-text-xs wb-text-secondary">{role}</div>
          )}
        </div>
      </div>
    </div>
  );
}
