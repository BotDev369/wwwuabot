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

export {
  CHINESE,
  CHINESE_ANIMALS,
  CHINESE_QUALITIES,
  SOLAR_MONTHS,
  chineseBranch,
  chineseClaims,
  chineseStem,
  type ChineseProfile,
  type Pillar,
} from "./chinese";
export {
  MAYAN,
  MAYAN_DAY_SIGNS,
  MAYAN_QUALITIES,
  mayanClaims,
  mayanSeal,
  mayanTone,
  type MayanProfile,
} from "./mayan";
export {
  NUMEROLOGY,
  NUMEROLOGY_NUMBERS,
  NUMEROLOGY_QUALITIES,
  chainLabel,
  numerologyClaims,
  type NumerologyProfile,
} from "./numerology";
export {
  WESTERN,
  WESTERN_QUALITIES,
  WESTERN_SIGNS,
  sunInSign,
  westernClaims,
  type WesternProfile,
} from "./western";
export { claimsOf, strongestPerQuality, type LensRule } from "./rule";
