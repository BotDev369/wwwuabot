/**
 * Реєстр лінз: нова лінза — рядок тут і свій адаптер; ядро про неї не знає.
 *
 * @module @wwwuabot/shared/qualities/lenses
 */

import { WESTERN } from "./western";
import type { LensDefinition } from "../types";

export const LENSES: readonly LensDefinition[] = [WESTERN];

export { WESTERN, WESTERN_SIGNS, westernClaims } from "./western";
