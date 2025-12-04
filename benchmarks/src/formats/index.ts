/**
 * Format converter aggregator for benchmarks
 */

import type { FormatConverter } from '../types.js';
import { jsonFormat, jsonCompactFormat } from './json.js';
import { yamlFormat } from './yaml.js';
import { xmlFormat } from './xml.js';
import { csvFormat } from './csv.js';
import { toonFormat } from './toon.js';
import { goonFormat, goonNoDictFormat, goonNoRefsFormat, goonBaselineFormat } from './goon.js';

/**
 * All format converters for benchmarking
 */
export const formats: FormatConverter[] = [
  jsonFormat,
  jsonCompactFormat,
  yamlFormat,
  xmlFormat,
  csvFormat,
  toonFormat,
  goonFormat,
];

/**
 * Get all available format converters
 */
export function getFormats(): FormatConverter[] {
  return formats;
}

/**
 * Get a specific format by name
 */
export function getFormat(name: string): FormatConverter | undefined {
  return formats.find(f => f.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get formats that support nested data structures
 */
export function getNestedFormats(): FormatConverter[] {
  return formats.filter(f => f.supportsNested);
}

/**
 * List available format names
 */
export function getFormatNames(): string[] {
  return formats.map(f => f.name);
}

// Export individual formats for feature analysis
export { jsonFormat, jsonCompactFormat } from './json.js';
export { yamlFormat } from './yaml.js';
export { xmlFormat } from './xml.js';
export { csvFormat } from './csv.js';
export { toonFormat } from './toon.js';
export { goonFormat, goonNoDictFormat, goonNoRefsFormat, goonBaselineFormat } from './goon.js';
export type { FormatConverter } from '../types.js';
