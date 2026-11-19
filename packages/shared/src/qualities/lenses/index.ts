/**
 * Реєстр лінз: нова лінза — рядок тут і свій адаптер; ядро про неї не знає.
 * Порядок — порядок показу у виборі систем.
 *
 * @module @wwwuabot/shared/qualities/lenses
 */

import { CHINESE } from "./chinese";
import { MAYAN } from "./mayan";
import { NUMEROLOGY } from "./numerology";
import { WESTERN } from "./western";
import type { LensDefinition } from "../types";

export const LENSES: readonly LensDefinition[] = [WESTERN, NUMEROLOGY, CHINESE, MAYAN];

export { CHINESE, CHINESE_ANIMALS, chineseClaims } from "./chinese";
export { MAYAN, MAYAN_DAY_SIGNS, mayanClaims } from "./mayan";
export { NUMEROLOGY, NUMEROLOGY_NUMBERS, numerologyClaims } from "./numerology";
export { WESTERN, WESTERN_SIGNS, sunInSign, westernClaims } from "./western";
export { claimsOf, type LensRule } from "./rule";
