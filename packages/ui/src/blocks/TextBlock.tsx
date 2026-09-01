/**
 * Block: Текст
 *
 * Базовий текстовий блок з заголовком та/або вмістом.
 * Підтримує рівні заголовків (h1-h4, body) та вирівнювання.
 *
 * @module packages/ui/src/blocks/TextBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

interface TextBlockProps {
  title?: string;
  content: string;
  level?: 'h1' | 'h2' | 'h3' | 'h4' | 'body';
  align?: 'left' | 'center' | 'right';
}

const headingStyles: Record<string, React.CSSProperties> = {
  h1: { fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: '0.25rem' },
  h2: { fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' },
  h3: { fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' },
  h4: { fontSize: '1.125rem', fontWeight: 500, marginBottom: '0.25rem' },
  body: { fontSize: '1rem' },
};

const alignStyles: Record<string, React.CSSProperties> = {
  left: { textAlign: 'left' },
  center: { textAlign: 'center' },
  right: { textAlign: 'right' },
};

export function TextBlock({ block, children }: BlockComponentProps) {
  const { title, content, level = 'body', align = 'left' } =
    block.props as unknown as TextBlockProps;

  const HeadingTag = level !== 'body' ? level : 'p';

  return (
    <div style={{ padding: '8px 0', ...alignStyles[align] }}>
      {title ? (
        <HeadingTag style={headingStyles[level] ?? headingStyles.body}>
          {title}
        </HeadingTag>
      ) : null}

      {content ? (
        <div style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-secondary, #6b7280)', whiteSpace: 'pre-wrap' }}>
          {content}
        </div>
      ) : null}

      {children}
    </div>
  );
}
