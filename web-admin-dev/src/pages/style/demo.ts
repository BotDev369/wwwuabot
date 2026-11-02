/**
 * Демо-блок у формі продукту: та сама розмітка, той самий CSS.
 * @module web-admin-dev/src/pages/style/demo
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

/** Блок як дані: демосторінка рендерить справжній компонент, а не копію. */
export function demo(type: string, props: Record<string, unknown>): BlockComponentProps {
  return {
    block: { id: `demo-${type}`, type, order: 0, props },
    zone: "main",
    context: {} as BlockComponentProps["context"],
  };
}
