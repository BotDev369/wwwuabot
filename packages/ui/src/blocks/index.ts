/**
 * Page Builder — barrel export для всіх блоків (29 модулів, 9 категорій).
 *
 * Імпортуйте цей файл для реєстрації всіх блоків:
 * ```ts
 * import { registerAllBlocks } from '@wwwuabot/ui/blocks';
 * registerAllBlocks();
 * ```
 *
 * @module packages/ui/src/blocks
 */

// --- MVP (5) ---
export { TextBlock } from './TextBlock';
export { ImageBlock } from './ImageBlock';
export { ButtonsBlock } from './ButtonsBlock';
export { ListBlock } from './ListBlock';
export { DividerBlock } from './DividerBlock';

// --- Content (8) ---
export { RichTextBlock } from './RichTextBlock';
export { VideoBlock } from './VideoBlock';
export { GalleryBlock } from './GalleryBlock';
export { QuoteBlock } from './QuoteBlock';
export { CodeBlock } from './CodeBlock';
export { BadgeBlock } from './BadgeBlock';

// --- Layout (4) ---
export { SpacerBlock } from './SpacerBlock';
export { ColumnsBlock } from './ColumnsBlock';
export { CardBlock } from './CardBlock';
export { HeroBlock } from './HeroBlock';

// --- Navigation (3) ---
export { TabsBlock } from './TabsBlock';
export { AccordionBlock } from './AccordionBlock';
export { NavBlock } from './NavBlock';

// --- Data (4) ---
export { StatBlock } from './StatBlock';
export { ProgressBlock } from './ProgressBlock';
export { TableBlock } from './TableBlock';
export { RatingBlock } from './RatingBlock';

// --- Commerce (4) ---
export { PricingBlock } from './PricingBlock';
export { TestimonialBlock } from './TestimonialBlock';
export { FeatureCardBlock } from './FeatureCardBlock';
export { FaqBlock } from './FaqBlock';

// --- Forms (3) ---
export { InputBlock } from './InputBlock';
export { TextareaBlock } from './TextareaBlock';
export { SelectBlock } from './SelectBlock';

// --- Bot-domain (2) ---
export { UserProfileBlock } from './UserProfileBlock';
export { DateCardBlock } from './DateCardBlock';

// --- Analytics (1) ---
export { ChartBlock } from './ChartBlock';

// --- Raw (1) ---
export { HtmlBlock } from './HtmlBlock';

// --- Реєстрація ---
import { registerBlock } from '../registry';

// MVP
import { TextBlock } from './TextBlock';
import { ImageBlock } from './ImageBlock';
import { ButtonsBlock } from './ButtonsBlock';
import { ListBlock } from './ListBlock';
import { DividerBlock } from './DividerBlock';

// Content
import { RichTextBlock } from './RichTextBlock';
import { VideoBlock } from './VideoBlock';
import { GalleryBlock } from './GalleryBlock';
import { QuoteBlock } from './QuoteBlock';
import { CodeBlock } from './CodeBlock';
import { BadgeBlock } from './BadgeBlock';

// Layout
import { SpacerBlock } from './SpacerBlock';
import { ColumnsBlock } from './ColumnsBlock';
import { CardBlock } from './CardBlock';
import { HeroBlock } from './HeroBlock';

// Navigation
import { TabsBlock } from './TabsBlock';
import { AccordionBlock } from './AccordionBlock';
import { NavBlock } from './NavBlock';

// Data
import { StatBlock } from './StatBlock';
import { ProgressBlock } from './ProgressBlock';
import { TableBlock } from './TableBlock';
import { RatingBlock } from './RatingBlock';

// Commerce
import { PricingBlock } from './PricingBlock';
import { TestimonialBlock } from './TestimonialBlock';
import { FeatureCardBlock } from './FeatureCardBlock';
import { FaqBlock } from './FaqBlock';

// Forms
import { InputBlock } from './InputBlock';
import { TextareaBlock } from './TextareaBlock';
import { SelectBlock } from './SelectBlock';

// Bot-domain
import { UserProfileBlock } from './UserProfileBlock';
import { DateCardBlock } from './DateCardBlock';

// Analytics
import { ChartBlock } from './ChartBlock';

// Raw
import { HtmlBlock } from './HtmlBlock';

/**
 * Зареєструвати всі блоки в реєстрі (29 модулів).
 *
 * Викликається один раз при ініціалізації додатку:
 * ```ts
 * import { registerAllBlocks } from '@wwwuabot/ui/blocks';
 * registerAllBlocks();
 * ```
 */
export function registerAllBlocks(): void {
  // MVP
  registerBlock('text', TextBlock);
  registerBlock('image', ImageBlock);
  registerBlock('buttons', ButtonsBlock);
  registerBlock('list', ListBlock);
  registerBlock('divider', DividerBlock);

  // Content
  registerBlock('richtext', RichTextBlock);
  registerBlock('video', VideoBlock);
  registerBlock('gallery', GalleryBlock);
  registerBlock('quote', QuoteBlock);
  registerBlock('code', CodeBlock);
  registerBlock('badge', BadgeBlock);

  // Layout
  registerBlock('spacer', SpacerBlock);
  registerBlock('columns', ColumnsBlock);
  registerBlock('card', CardBlock);
  registerBlock('hero', HeroBlock);

  // Navigation
  registerBlock('tabs', TabsBlock);
  registerBlock('accordion', AccordionBlock);
  registerBlock('nav', NavBlock);

  // Data
  registerBlock('stat', StatBlock);
  registerBlock('progress', ProgressBlock);
  registerBlock('table', TableBlock);
  registerBlock('rating', RatingBlock);

  // Commerce
  registerBlock('pricing', PricingBlock);
  registerBlock('testimonial', TestimonialBlock);
  registerBlock('feature-card', FeatureCardBlock);
  registerBlock('faq', FaqBlock);

  // Forms
  registerBlock('input', InputBlock);
  registerBlock('textarea', TextareaBlock);
  registerBlock('select', SelectBlock);

  // Bot-domain
  registerBlock('user-profile', UserProfileBlock);
  registerBlock('date-card', DateCardBlock);

  // Analytics
  registerBlock('chart', ChartBlock);

  // Raw
  registerBlock('html', HtmlBlock);
}
