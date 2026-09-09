/**
 * RAW — необроблений HTML-код (тільки для адміністраторів).
 */

import type { BlockDefinition } from '../../types/page-config';
import { block, s, b } from './helpers';

export const rawBlocks: BlockDefinition[] = [
  block({
    type: "html", label: "HTML", icon: "code", category: "raw",
    description: "Необроблений HTML-код (тільки для адміністраторів)",
    props: {
      code: s("HTML-код"),
      sandbox: b("Пісочниця (обмежений CSS)", { default: true }),
    },
    required: ["code"],
    defaultProps: { code: '<div class="wb-empty">HTML-вміст</div>', sandbox: true },
  }),
];
