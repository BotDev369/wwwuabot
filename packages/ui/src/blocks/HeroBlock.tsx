/**
 * Page Builder — Hero Block.
 *
 * Large banner with title, subtitle, optional background image, and CTA buttons.
 *
 * @module packages/ui/src/blocks/HeroBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

interface HeroButton {
  text: string;
  url?: string;
  variant?: string;
}

export function HeroBlock({ block }: BlockComponentProps) {
  const {
    title = '',
    subtitle = '',
    backgroundImage = '',
    buttons = [],
    align = 'center',
  } = block.props as {
    title?: string;
    subtitle?: string;
    backgroundImage?: string;
    buttons?: HeroButton[];
    align?: string;
  };

  return (
    <section
      className="wb-block-hero"
      style={{
        position: 'relative',
        padding: backgroundImage ? 'var(--sp-12) var(--sp-4)' : 'var(--sp-8) var(--sp-4)',
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        textAlign: align as 'left' | 'center' | 'right',
      }}
    >
      {/* Overlay for background images */}
      {backgroundImage && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 0,
          }}
        />
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        {title && (
          <h2
            className="wb-block-hero__title"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-4)',
              fontWeight: 'var(--weight-bold)',
              margin: 0,
              color: backgroundImage ? '#fff' : 'var(--text-primary)',
              lineHeight: 'var(--font-lineheight-1)',
            }}
          >
            {title}
          </h2>
        )}

        {subtitle && (
          <p
            className="wb-block-hero__subtitle wb-mt-3"
            style={{
              fontSize: 'var(--text-lg)',
              margin: 'var(--sp-3) 0 0 0',
              color: backgroundImage ? 'rgba(255,255,255,0.85)' : 'var(--text-secondary)',
              maxWidth: '600px',
              marginLeft: align === 'center' ? 'auto' : undefined,
              marginRight: align === 'right' || align === 'center' ? 'auto' : undefined,
            }}
          >
            {subtitle}
          </p>
        )}

        {buttons.length > 0 && (
          <div
            className="wb-block-hero__actions wb-mt-4"
            style={{
              display: 'flex',
              gap: 'var(--sp-2)',
              justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
              marginTop: 'var(--sp-4)',
              flexWrap: 'wrap',
            }}
          >
            {buttons.map((btn, i) => {
              const isSecondary = btn.variant === 'secondary';
              const className = isSecondary ? 'wb-btn wb-btn-secondary' : 'wb-btn wb-btn-primary';

              return btn.url ? (
                <a key={i} href={btn.url} className={className} style={backgroundImage ? { borderColor: 'rgba(255,255,255,0.3)', color: '#fff' } : undefined}>
                  {btn.text}
                </a>
              ) : (
                <button key={i} type="button" className={className}>
                  {btn.text}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
