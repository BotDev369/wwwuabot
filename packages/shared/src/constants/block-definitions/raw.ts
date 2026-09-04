/**
 * RAW — необроблений вміст
 *
 * HTML-код (тільки для адміністраторів).
 */

import type { BlockDefinition } from '../../types/page-config';

export const rawBlocks: BlockDefinition[] = [
  {
    type: 'html',
    label: 'HTML',
    description: 'Необроблений HTML-код (тільки для адміністраторів)',
    icon: 'code',
    category: 'raw',
    compatibleZones: ['main', 'sidebar', 'header', 'footer'],
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          title: 'HTML-код',
        },
        sandbox: {
          type: 'boolean',
          title: 'Пісочниця (обмежений CSS)',
          default: true,
        },
      },
      required: ['code'],
    },
    defaultProps: {
      code: '<div class="wb-empty">HTML-вміст</div>',
      sandbox: true,
    },
  },
];
