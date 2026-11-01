/**
 * Page Builder — Testimonial Block.
 *
 * Displays a customer review/quote with optional avatar, role, and star rating.
 *
 * @module packages/ui/src/blocks/TestimonialBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

export function TestimonialBlock({ block }: BlockComponentProps) {
  const {
    text = "",
    author = "",
    role = "",
    avatar = "",
    rating = 0,
  } = block.props as {
    text?: string;
    author?: string;
    role?: string;
    avatar?: string;
    rating?: number;
  };

  return (
    <div className="wb-block-testimonial">
      {rating > 0 && (
        <div className="wb-block-testimonial__stars">
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              className={`wb-block-testimonial__star${i < Math.round(rating) ? " wb-block-testimonial__star--on" : ""}`}
              aria-hidden="true"
            >
              ★
            </span>
          ))}
        </div>
      )}

      <p className="wb-block-testimonial__text">&ldquo;{text}&rdquo;</p>

      <div className="wb-block-testimonial__author">
        {avatar && (
          <img className="wb-block-testimonial__avatar" src={avatar} alt={author} loading="lazy" />
        )}
        <div>
          <div className="wb-block-testimonial__name">{author}</div>
          {role && <div className="wb-text-xs wb-text-secondary">{role}</div>}
        </div>
      </div>
    </div>
  );
}
