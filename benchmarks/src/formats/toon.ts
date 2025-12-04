/**
 * TOON Format Converter
 * Uses @toon-format/toon package for comparison baseline
 */

import { encode as toonEncode, decode as toonDecode } from '@toon-format/toon';
import type { FormatConverter } from '../types.js';

export const toonFormat: FormatConverter = {
  name: 'TOON',
  extension: '.toon',
  encode: (data: unknown): string => toonEncode(data),
  decode: (text: string): unknown => toonDecode(text),
  supportsNested: true,
};

