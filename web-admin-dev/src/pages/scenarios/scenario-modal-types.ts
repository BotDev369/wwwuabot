/**
 * ScenarioCardModal — спільні типи, константи та допоміжні функції.
 */

import type { IconName } from '@wwwuabot/shared';

// ── Types ─────────────────────────────────────────────────────────

export type MainTab = 'web' | 'bot_rich' | 'bot' | 'shared';
export type SubTab = 'preview' | 'json' | 'constructor';

// ── Constants ─────────────────────────────────────────────────────

export const MAIN_TAB_ICONS: Record<MainTab, IconName> = {
  web: 'globe',
  bot_rich: 'sparkles',
  bot: 'bot',
  shared: 'settings',
};

export const SUB_TAB_ICONS: Record<SubTab, IconName> = {
  preview: 'eye',
  json: 'wrench',
  constructor: 'construction',
};

export const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: 'web', label: 'Веб' },
  { key: 'bot_rich', label: 'Бот-Річ + Кнопки' },
  { key: 'bot', label: 'Бот + Кнопки' },
  { key: 'shared', label: 'Спільне' },
];

export const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'preview', label: 'Превʼю' },
  { key: 'json', label: 'JSON' },
  { key: 'constructor', label: 'Конструктор' },
];

// ── Helpers ───────────────────────────────────────────────────────

const FIELD_MAP: Record<MainTab, string[]> = {
  web: ['page_data'],
  bot_rich: ['rich_message', 'rich_data'],
  bot: [
    'photo_url', 'caption_top', 'caption_mid', 'caption_bot',
    'keyboard_type', 'buttons', 'awaits_input', 'input_path',
    'input_next', 'price', 'qty_options',
  ],
  shared: ['codeword', 'title', 'created_at', 'updated_at'],
};

export function getFieldsForTab(tab: MainTab, allFields: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of FIELD_MAP[tab]) {
    if (key in allFields) result[key] = allFields[key];
  }
  return result;
}

export function parsePageConfigSafe(raw: unknown) {
  // Dynamic import to avoid circular deps — handled by caller
  return raw;
}
