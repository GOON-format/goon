/**
 * JSON Format Converters
 * Pretty-printed and compact variants
 */

import type { FormatConverter } from '../types.js';

export const jsonFormat: FormatConverter = {
  name: 'JSON',
  extension: '.json',
  encode: (data: unknown): string => JSON.stringify(data, null, 2),
  decode: (text: string): unknown => JSON.parse(text),
  supportsNested: true,
};

export const jsonCompactFormat: FormatConverter = {
  name: 'JSON Compact',
  extension: '.min.json',
  encode: (data: unknown): string => JSON.stringify(data),
  decode: (text: string): unknown => JSON.parse(text),
  supportsNested: true,
};

