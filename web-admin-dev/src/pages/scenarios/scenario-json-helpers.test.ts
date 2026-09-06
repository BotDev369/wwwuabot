import { describe, it, expect } from 'vitest';
import {
  deserializeJsonFields,
  serializeJsonFields,
  extractFieldsFromJson,
} from './scenario-json-helpers';

describe('scenario-json-helpers', () => {
  describe('extractFieldsFromJson (Web tab)', () => {
    it('handles direct unwrapped PageConfig JSON for web tab', () => {
      const pageConfig = {
        version: 1,
        zones: {
          sidebar: [],
          header: [],
          main: [{ id: 'block-1', type: 'heading', props: { text: 'Hello' } }],
          footer: [],
        },
        visibleZones: ['main'],
      };

      const current = { codeword: 'test', title: 'Test', page_data: null };
      const updated = extractFieldsFromJson(pageConfig, 'web', current);

      expect(typeof updated.page_data).toBe('string');
      expect(JSON.parse(updated.page_data as string)).toEqual(pageConfig);
    });

    it('handles wrapped { page_data: ... } JSON for web tab', () => {
      const pageConfig = {
        version: 1,
        zones: { sidebar: [], header: [], main: [], footer: [] },
        visibleZones: [],
      };

      const current = { codeword: 'test', page_data: null };
      const updated = extractFieldsFromJson({ page_data: pageConfig }, 'web', current);

      expect(typeof updated.page_data).toBe('string');
      expect(JSON.parse(updated.page_data as string)).toEqual(pageConfig);
    });

    it('handles string page_data input for web tab', () => {
      const str = JSON.stringify({ version: 1, zones: { sidebar: [], header: [], main: [], footer: [] }, visibleZones: [] });
      const current = { codeword: 'test', page_data: null };
      const updated = extractFieldsFromJson({ page_data: str }, 'web', current);

      expect(updated.page_data).toBe(str);
    });
  });

  describe('deserializeJsonFields', () => {
    it('deserializes JSON strings into objects', () => {
      const raw = {
        page_data: JSON.stringify({ version: 1 }),
        buttons: JSON.stringify([[{ text: 'Btn' }]]),
        title: 'Plain Title',
      };

      const deserialized = deserializeJsonFields(raw, 'web');
      expect(deserialized.page_data).toEqual({ version: 1 });
      expect(deserialized.buttons).toEqual([[{ text: 'Btn' }]]);
      expect(deserialized.title).toBe('Plain Title');
    });

    it('defaults empty page_data to empty PageConfig on web tab', () => {
      const raw = { page_data: null };
      const deserialized = deserializeJsonFields(raw, 'web');

      expect(deserialized.page_data).toMatchObject({
        version: 1,
        zones: {
          sidebar: [],
          header: [],
          main: [],
          footer: [],
        },
        visibleZones: [],
      });
    });
  });

  describe('serializeJsonFields', () => {
    it('serializes objects and arrays into JSON strings for D1 SQLite', () => {
      const input = {
        page_data: { version: 1, zones: {} },
        buttons: [{ text: 'Click' }],
        title: 'Normal String',
        price: 100,
        empty_field: null,
      };

      const serialized = serializeJsonFields(input);
      expect(typeof serialized.page_data).toBe('string');
      expect(JSON.parse(serialized.page_data as string)).toEqual({ version: 1, zones: {} });
      expect(typeof serialized.buttons).toBe('string');
      expect(JSON.parse(serialized.buttons as string)).toEqual([{ text: 'Click' }]);
      expect(serialized.title).toBe('Normal String');
      expect(serialized.price).toBe(100);
      expect(serialized.empty_field).toBeNull();
    });
  });
});
