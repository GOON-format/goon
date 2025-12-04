/**
 * GOON Utilities
 * @module utils
 */

import type { GoonValue, Dictionary } from './types.js';

/** Maximum allowed repeat count for run-length encoding to prevent memory exhaustion */
export const MAX_REPEAT_COUNT = 10000;

/** Maximum allowed recursion depth to prevent stack overflow */
export const MAX_RECURSION_DEPTH = 100;

/** Maximum allowed input size in bytes */
export const MAX_INPUT_SIZE = 10 * 1024 * 1024; // 10MB

/** Dangerous keys that could cause prototype pollution */
const DANGEROUS_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
]);

/**
 * Check if a key is safe (not a prototype pollution vector)
 */
export function isSafeKey(key: string): boolean {
  return !DANGEROUS_KEYS.has(key);
}

/**
 * Check if a value is a plain object (not null, array, or special object)
 */
export function isPlainObject(
  value: unknown
): value is Record<string, GoonValue> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

/**
 * Check if an array is tabular (all objects with same primitive keys)
 */
export function isTabularArray(arr: GoonValue[]): boolean {
  if (arr.length === 0) return false;

  // All items must be plain objects
  if (!arr.every(isPlainObject)) return false;

  // Get keys from first object
  const firstKeys = Object.keys(arr[0] as Record<string, GoonValue>).sort();
  if (firstKeys.length === 0) return false;

  // All objects must have same keys with primitive values
  return arr.every((item) => {
    if (!isPlainObject(item)) return false;
    const keys = Object.keys(item).sort();
    if (keys.length !== firstKeys.length) return false;
    return keys.every((key, i) => {
      if (key !== firstKeys[i]) return false;
      const value = item[key];
      return (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      );
    });
  });
}

/**
 * Check if a value is a primitive
 */
export function isPrimitive(
  value: GoonValue
): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

/**
 * Build a string dictionary from a value for deduplication
 * @param value - The value to scan for repeated strings
 * @param minLength - Minimum string length to include
 * @param minOccurrences - Minimum occurrences to include
 * @param maxEntries - Maximum dictionary entries (0 = unlimited)
 * @returns Dictionary with entries and lookup map
 */
export function buildDictionary(
  value: GoonValue,
  minLength: number,
  minOccurrences: number,
  maxEntries: number = 8
): Dictionary {
  const counts = new Map<string, number>();
  let depth = 0;

  function scan(v: GoonValue): void {
    // Prevent stack overflow on deeply nested structures
    if (depth > MAX_RECURSION_DEPTH) return;

    if (typeof v === 'string' && v.length >= minLength) {
      counts.set(v, (counts.get(v) || 0) + 1);
    } else if (Array.isArray(v)) {
      depth++;
      v.forEach(scan);
      depth--;
    } else if (isPlainObject(v)) {
      depth++;
      Object.values(v).forEach(scan);
      depth--;
    }
  }

  scan(value);

  // Filter by minimum occurrences and calculate actual savings
  const DICT_LINE_OVERHEAD_CHARS = 10;
  
  const candidates = [...counts.entries()]
    .filter(([, count]) => count >= minOccurrences)
    .map(([str, count], potentialIndex) => {
      const refLength = potentialIndex < 10 ? 2 : potentialIndex < 100 ? 3 : 4;
      const dictCost = str.length + 1;
      const savings = (str.length - refLength) * count - dictCost;
      return { str, count, savings };
    })
    .filter(({ savings }) => savings > DICT_LINE_OVERHEAD_CHARS)
    .sort((a, b) => b.savings - a.savings);

  const entries: string[] = [];
  const lookup = new Map<string, string>();
  
  for (const { str } of candidates) {
    if (maxEntries > 0 && entries.length >= maxEntries) {
      break;
    }
    
    const index = entries.length;
    const count = counts.get(str)!;
    const dictCost = str.length + 1;
    const refLength = 2; // $N for single digit
    const actualSavings = (str.length - refLength) * count - dictCost;
    
    if (actualSavings > 0) {
      lookup.set(str, `$${index}`);
      entries.push(str);
    }
  }

  return { entries, lookup };
}

/**
 * Check if a string needs quoting in GOON format
 */
export function needsQuoting(str: string): boolean {
  if (str === '') return false; // Empty string becomes ~
  if (str.length === 0) return true;

  // Reserved single chars
  if (['T', 'F', '_', '~', '^'].includes(str)) return true;

  // Starts with special chars
  if (str[0] === '$' || str[0] === '^') return true;

  // Contains delimiters, newlines, or control characters
  if (/[|\n\r\t]/.test(str)) return true;

  // Looks like a number (be conservative)
  if (/^-?\d+(\.\d+)?$/.test(str)) return true;

  // Looks like a reference ($N where N is digits)
  if (/^\$\d+$/.test(str)) return true;

  // Looks like run-length (*N at end where N is digits)
  if (/\*\d+$/.test(str)) return true;

  return false;
}

/**
 * Quote a string for GOON format with proper escaping
 */
export function quoteString(str: string): string {
  if (!needsQuoting(str)) return str;

  // Escape special characters
  const escaped = str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');

  return `"${escaped}"`;
}

/**
 * Unquote and unescape a GOON string
 */
export function unquoteString(str: string): string {
  if (!str.startsWith('"') || !str.endsWith('"')) return str;
  const inner = str.slice(1, -1);

  // Process escape sequences
  let result = '';
  let i = 0;
  while (i < inner.length) {
    if (inner[i] === '\\' && i + 1 < inner.length) {
      const next = inner[i + 1];
      switch (next) {
        case '\\':
          result += '\\';
          break;
        case '"':
          result += '"';
          break;
        case 'n':
          result += '\n';
          break;
        case 'r':
          result += '\r';
          break;
        case 't':
          result += '\t';
          break;
        default:
          // Unknown escape - keep as-is
          result += '\\' + next;
      }
      i += 2;
    } else {
      result += inner[i];
      i++;
    }
  }

  return result;
}

/**
 * Encode a primitive value to GOON format
 * @param value - The primitive value to encode
 * @param dictionary - The string dictionary
 * @param useDictionary - Whether to use dictionary refs (false at deep nesting)
 */
export function encodePrimitive(
  value: string | number | boolean | null,
  dictionary: Dictionary,
  useDictionary: boolean = true
): string {
  if (value === null) return '_';
  if (value === true) return 'T';
  if (value === false) return 'F';

  if (typeof value === 'number') {
    // Handle special numeric values
    if (!Number.isFinite(value)) {
      return '_'; // Encode Infinity/NaN as null
    }
    return String(value);
  }

  if (value === '') return '~';

  // Check dictionary (only if enabled at this depth)
  if (useDictionary) {
    const dictRef = dictionary.lookup.get(value);
    if (dictRef !== undefined) {
      return dictRef;
    }
  }

  return quoteString(value);
}

/**
 * Parse a cell value with potential run-length encoding
 */
export function parseCell(
  cell: string,
  dictionary: string[]
): { value: GoonValue; repeat: number } {
  let repeat = 1;
  let valueStr = cell;

  // Check for run-length encoding (only if not quoted)
  // Use a more specific regex to prevent ReDoS
  if (!cell.startsWith('"')) {
    const lastStarIndex = cell.lastIndexOf('*');
    if (lastStarIndex > 0) {
      const suffix = cell.slice(lastStarIndex + 1);
      // Verify suffix is all digits
      if (/^\d+$/.test(suffix)) {
        valueStr = cell.slice(0, lastStarIndex);
        repeat = Math.min(parseInt(suffix, 10), MAX_REPEAT_COUNT);
        if (repeat < 1) repeat = 1;
      }
    }
  }

  const value = parsePrimitive(valueStr, dictionary);
  return { value, repeat };
}

/**
 * Parse a primitive value from GOON format
 */
export function parsePrimitive(str: string, dictionary: string[]): GoonValue {
  if (str === '_') return null;
  if (str === 'T') return true;
  if (str === 'F') return false;
  if (str === '~') return '';

  // Dictionary reference
  if (str.startsWith('$') && str.length > 1) {
    const indexStr = str.slice(1);
    if (/^\d+$/.test(indexStr)) {
      const index = parseInt(indexStr, 10);
      if (index >= 0 && index < dictionary.length) {
        return dictionary[index];
      }
      // Invalid reference - return as string
      return str;
    }
  }

  // Quoted string
  if (str.startsWith('"') && str.endsWith('"') && str.length >= 2) {
    return unquoteString(str);
  }

  // Number (be strict to avoid false positives)
  if (/^-?\d+(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    if (Number.isFinite(num)) return num;
  }

  return str;
}

/**
 * Validate that input size is within limits
 * @throws Error if input exceeds maximum size
 */
export function validateInputSize(input: string): void {
  const bytes = new TextEncoder().encode(input).length;
  if (bytes > MAX_INPUT_SIZE) {
    throw new Error(
      `Input size ${bytes} bytes exceeds maximum allowed size of ${MAX_INPUT_SIZE} bytes`
    );
  }
}

/**
 * Create a safe object that filters out dangerous keys
 */
export function createSafeObject(): Record<string, GoonValue> {
  return Object.create(null) as Record<string, GoonValue>;
}
