/**
 * GOON Format Converter
 * Uses local @goon-format/goon implementation
 */

// Import from local source for development
import { encode, decode } from '../../../packages/goon/src/index.js';
import type { FormatConverter } from '../types.js';

export const goonFormat: FormatConverter = {
  name: 'GOON',
  extension: '.goon',
  // OPTIMIZED CONFIG: 92.5% accuracy + 12% more token efficient
  // - NO dictionary (all forms of $N refs hurt LLM accuracy)
  // - NO column refs (^ confuses tabular data parsing)
  // - Minimal indent (removes row indentation for token savings)
  encode: (data: unknown): string => encode(data as any, { 
    dictionary: false,
    columnRefs: false,
    minimalIndent: true,  // 12% token savings
  }),
  decode: (text: string): unknown => decode(text),
  supportsNested: true,
};

/**
 * GOON format with specific features disabled for analysis
 */
export const goonNoDictFormat: FormatConverter = {
  name: 'GOON (no dict)',
  extension: '.goon',
  encode: (data: unknown): string => encode(data, { dictionary: false }),
  decode: (text: string): unknown => decode(text),
  supportsNested: true,
};

export const goonNoRefsFormat: FormatConverter = {
  name: 'GOON (no refs)',
  extension: '.goon',
  encode: (data: unknown): string => encode(data, { columnRefs: false }),
  decode: (text: string): unknown => decode(text),
  supportsNested: true,
};

export const goonBaselineFormat: FormatConverter = {
  name: 'GOON (baseline)',
  extension: '.goon',
  encode: (data: unknown): string => encode(data, { 
    dictionary: false, 
    columnRefs: false,
    runLength: false,
  }),
  decode: (text: string): unknown => decode(text),
  supportsNested: true,
};

/**
 * GOON format optimized for LLM accuracy based on research:
 * - Dictionary at end (recency bias)
 * - Depth-aware dictionary (already default)
 * - Explicit array lengths (already default)
 */
export const goonLLMFormat: FormatConverter = {
  name: 'GOON (LLM)',
  extension: '.goon',
  encode: (data: unknown): string => encode(data, { 
    dictionaryAtEnd: true,  // Research: recency bias helps
  }),
  decode: (text: string): unknown => decode(text),
  supportsNested: true,
};

