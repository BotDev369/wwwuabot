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

const headingClasses: Record<string, string> = {
  h1: 'text-3xl font-bold tracking-tight',
  h2: 'text-2xl font-semibold',
  h3: 'text-xl font-semibold',
  h4: 'text-lg font-medium',
  body: 'text-base',
};

const alignClasses: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function TextBlock({ block, children }: BlockComponentProps) {
  const { title, content, level = 'body', align = 'left' } =
    block.props as unknown as TextBlockProps;

  const HeadingTag = level !== 'body' ? level : 'p';

  return (
    <div className={`py-2 ${alignClasses[align] ?? ''}`}>
      {title ? (
        <HeadingTag
          className={`mb-1 ${headingClasses[level] ?? headingClasses.body}`}
        >
          {title}
        </HeadingTag>
      ) : null}

      {content ? (
        <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {content}
        </div>
      ) : null}

      {children}
    </div>
  );
}
