/**
 * Page Builder — barrel export для всіх блоків.
 *
 * Імпортуйте цей файл для реєстрації всіх MVP-блоків.
 *
 * @module packages/ui/src/blocks
 */

export { TextBlock } from './TextBlock';
export { ImageBlock } from './ImageBlock';
export { ButtonsBlock } from './ButtonsBlock';
export { ListBlock } from './ListBlock';
export { DividerBlock } from './DividerBlock';

import { registerBlock } from '../registry';
import { TextBlock } from './TextBlock';
import { ImageBlock } from './ImageBlock';
import { ButtonsBlock } from './ButtonsBlock';
import { ListBlock } from './ListBlock';
import { DividerBlock } from './DividerBlock';

/**
 * Зареєструвати всі MVP-блоки в реєстрі.
 *
 * Викликається один раз при ініціалізації додатку:
 * ```ts
 * import { registerAllBlocks } from '@wwwuabot/ui/blocks';
 * registerAllBlocks();
 * ```
 */
export function registerAllBlocks(): void {
  registerBlock('text', TextBlock);
  registerBlock('image', ImageBlock);
  registerBlock('buttons', ButtonsBlock);
  registerBlock('list', ListBlock);
  registerBlock('divider', DividerBlock);
}
