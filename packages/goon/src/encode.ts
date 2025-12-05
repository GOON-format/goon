/**
 * GOON Encoder - Greatly Optimized Object Notation
 * @module encode
 */

import type { GoonValue, EncodeOptions, EncodeMode, Dictionary } from './types.js';
import {
  isPlainObject,
  isTabularArray,
  isPrimitive,
  buildDictionary,
  encodePrimitive,
  quoteString,
  isSafeKey,
  MAX_RECURSION_DEPTH,
} from './utils.js';

/**
 * Base defaults (used by 'balanced' mode)
 */
const BASE_DEFAULTS: Required<Omit<EncodeOptions, 'replacer' | 'mode'>> = {
  dictionary: true,
  columnRefs: true,
  runLength: true,
  minDictLength: 3,
  minDictOccurrences: 2,
  maxDictEntries: 5,
  indent: '  ',
  autoSort: false,
  delimiter: ',',
  maxColumnRefDepth: 1,
  maxDictDepth: 2,
  arrayLengths: true,
  tabularArrays: true,
  minimalIndent: false,
  schemaDefaults: false,
  footerSummaries: false,
  rowNumbers: false,
};

/**
 * Mode presets - override base defaults for specific use cases
 */
const MODE_PRESETS: Record<EncodeMode, Partial<typeof BASE_DEFAULTS>> = {
  // LLM mode: Optimized for language model accuracy
  // Disables features that confuse LLMs (dictionary refs, column refs)
  llm: {
    dictionary: false,
    columnRefs: false,
    minimalIndent: true,
    schemaDefaults: false,
    footerSummaries: false,
    rowNumbers: false,  // Enable for +2.5% accuracy at cost of +2% tokens
  },
  
  // Compact mode: Maximum token efficiency
  // Enables all compression features
  compact: {
    dictionary: true,
    columnRefs: true,
    autoSort: true,        // Maximize column ref opportunities
    minimalIndent: true,   // Remove unnecessary whitespace
    maxDictEntries: 0,     // Unlimited dictionary entries
    maxColumnRefDepth: -1, // Unlimited column ref depth
    maxDictDepth: -1,      // Unlimited dictionary depth
  },
  
  // Balanced mode: Default trade-off (uses BASE_DEFAULTS)
  balanced: {},
};

/**
 * Error thrown when encoding fails
 */
export class GoonEncodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoonEncodeError';
  }
}

/**
 * Encode a JavaScript value to GOON format
 *
 * @param value - The value to encode
 * @param options - Encoding options
 * @returns The GOON-formatted string
 * @throws GoonEncodeError if encoding fails
 *
 * @example
 * ```ts
 * const goon = encode({ users: [{ id: 1, name: 'Alice' }] });
 * // users{id|name}
 * //   1|Alice
 * ```
 */
export function encode(value: GoonValue, options: EncodeOptions = {}): string {
  // Apply mode preset, then user options (user options override mode)
  // Default to 'llm' mode for best accuracy with language models
  const mode = options.mode ?? 'llm';
  const modeDefaults = MODE_PRESETS[mode];
  const opts = { ...BASE_DEFAULTS, ...modeDefaults, ...options };

  // Validate options
  if (typeof opts.indent !== 'string') {
    throw new GoonEncodeError('indent option must be a string');
  }

  // Apply replacer if provided
  if (opts.replacer) {
    const replaced = applyReplacer(value, opts.replacer, '', 0);
    if (replaced === OMIT_VALUE) {
      return ''; // Return empty string if root is omitted
    }
    value = replaced;
  }

  // Build dictionary
  const dictionary: Dictionary = opts.dictionary
    ? buildDictionary(value, opts.minDictLength, opts.minDictOccurrences, opts.maxDictEntries)
    : { entries: [], lookup: new Map() };

  const lines: string[] = [];

  // Build dictionary line
  if (dictionary.entries.length > 0) {
    const dictLine = `$:${dictionary.entries.map((val, i) => `$${i}=${quoteString(val)}`).join(',')}`;
    lines.push(dictLine);
  }

  // Encode the value
  encodeValue(value, 0, opts, dictionary, lines, null, 0);

  return lines.join('\n');
}

/**
 * Generator version for streaming large datasets
 *
 * @param value - The value to encode
 * @param options - Encoding options
 * @yields Lines of GOON-formatted output
 *
 * @example
 * ```ts
 * for (const line of encodeLines(largeData)) {
 *   stream.write(line + '\n');
 * }
 * ```
 */
export function* encodeLines(
  value: GoonValue,
  options: EncodeOptions = {}
): Generator<string> {
  // Default to 'llm' mode for best accuracy with language models
  const mode = options.mode ?? 'llm';
  const modeDefaults = MODE_PRESETS[mode];
  const opts = { ...BASE_DEFAULTS, ...modeDefaults, ...options };

  if (opts.replacer) {
    const replaced = applyReplacer(value, opts.replacer, '', 0);
    if (replaced === OMIT_VALUE) {
      return; // Yield nothing if root is omitted
    }
    value = replaced;
  }

  const dictionary: Dictionary = opts.dictionary
    ? buildDictionary(value, opts.minDictLength, opts.minDictOccurrences, opts.maxDictEntries)
    : { entries: [], lookup: new Map() };

  if (dictionary.entries.length > 0) {
    const dictLine = `$:${dictionary.entries.map((val, i) => `$${i}=${quoteString(val)}`).join(',')}`;
    yield dictLine;
  }

  const lines: string[] = [];
  encodeValue(value, 0, opts, dictionary, lines, null, 0);
  for (const line of lines) {
    yield line;
  }
}

const OMIT_VALUE = Symbol('OMIT');

function applyReplacer(
  value: GoonValue,
  replacer: NonNullable<EncodeOptions['replacer']>,
  key: string,
  depth: number
): GoonValue | typeof OMIT_VALUE {
  if (depth >= MAX_RECURSION_DEPTH) {
    throw new GoonEncodeError(
      `Maximum recursion depth (${MAX_RECURSION_DEPTH}) exceeded`
    );
  }

  const result = replacer(key, value);
  if (result === undefined) return OMIT_VALUE;

  if (Array.isArray(result)) {
    return result.map((item, i) =>
      applyReplacer(item, replacer, String(i), depth + 1)
    ).filter((item): item is GoonValue => item !== OMIT_VALUE);
  }

  if (isPlainObject(result)) {
    const obj: Record<string, GoonValue> = {};
    for (const [k, v] of Object.entries(result)) {
      if (!isSafeKey(k)) continue; // Skip dangerous keys
      const replaced = applyReplacer(v, replacer, k, depth + 1);
      if (replaced !== OMIT_VALUE) {
        obj[k] = replaced;
      }
    }
    return obj;
  }

  return result;
}

type InternalOptions = Required<Omit<EncodeOptions, 'replacer' | 'mode'>>;

function encodeValue(
  value: GoonValue,
  depth: number,
  opts: InternalOptions,
  dictionary: Dictionary,
  lines: string[],
  parentKey: string | null,
  recursionDepth: number
): void {
  if (recursionDepth >= MAX_RECURSION_DEPTH) {
    throw new GoonEncodeError(
      `Maximum recursion depth (${MAX_RECURSION_DEPTH}) exceeded`
    );
  }

  const indent = opts.indent.repeat(depth);
  
  // Check if dictionary refs should be used at this depth
  // maxDictDepth: 2 means use dictionary at depth 0, 1, 2 (not 3+)
  const useDictionary = opts.maxDictDepth === -1 || depth <= opts.maxDictDepth;

  if (isPrimitive(value)) {
    const encoded = encodePrimitive(value, dictionary, useDictionary);
    if (parentKey !== null) {
      lines.push(`${indent}${parentKey}: ${encoded}`);
    } else {
      lines.push(`${indent}${encoded}`);
    }
    return;
  }

  if (Array.isArray(value)) {
    encodeArray(
      value,
      depth,
      opts,
      dictionary,
      lines,
      parentKey,
      recursionDepth + 1
    );
    return;
  }

  if (isPlainObject(value)) {
    encodeObject(
      value,
      depth,
      opts,
      dictionary,
      lines,
      parentKey,
      recursionDepth + 1
    );
    return;
  }
}

function encodeArray(
  arr: GoonValue[],
  depth: number,
  opts: InternalOptions,
  dictionary: Dictionary,
  lines: string[],
  parentKey: string | null,
  recursionDepth: number
): void {
  const indent = opts.indent.repeat(depth);
  const useDictionary = opts.maxDictDepth === -1 || depth <= opts.maxDictDepth;
  
  // Build array length suffix if enabled
  const lengthSuffix = opts.arrayLengths ? `[${arr.length}]` : '[]';

  if (arr.length === 0) {
    if (parentKey !== null) {
      lines.push(`${indent}${parentKey}[]`);
    } else {
      lines.push(`${indent}[]`);
    }
    return;
  }

  // Check for tabular array (only if tabularArrays option is enabled)
  if (opts.tabularArrays && isTabularArray(arr)) {
    encodeTabularArray(
      arr as Record<string, GoonValue>[],
      depth,
      opts,
      dictionary,
      lines,
      parentKey
    );
    return;
  }

  // Check for simple primitive array (single line)
  if (arr.every(isPrimitive) && arr.length <= 10) {
    const values = arr.map((v) =>
      encodePrimitive(v as string | number | boolean | null, dictionary, useDictionary)
    );
    if (parentKey !== null) {
      lines.push(`${indent}${parentKey}[]:${values.join(opts.delimiter)}`);
    } else {
      lines.push(`${indent}[]:${values.join(opts.delimiter)}`);
    }
    return;
  }

  // Mixed array - use list format with explicit length (trailing colon indicates content follows)
  if (parentKey !== null) {
    lines.push(`${indent}${parentKey}${lengthSuffix}:`);
  } else {
    lines.push(`${indent}${lengthSuffix}:`);
  }

  for (const item of arr) {
    if (isPrimitive(item)) {
      lines.push(
        `${opts.indent.repeat(depth + 1)}- ${encodePrimitive(item, dictionary, useDictionary)}`
      );
    } else if (Array.isArray(item)) {
      lines.push(`${opts.indent.repeat(depth + 1)}-`);
      encodeValue(
        item,
        depth + 2,
        opts,
        dictionary,
        lines,
        null,
        recursionDepth + 1
      );
    } else if (isPlainObject(item)) {
      lines.push(`${opts.indent.repeat(depth + 1)}-`);
      encodeObject(
        item,
        depth + 2,
        opts,
        dictionary,
        lines,
        null,
        recursionDepth + 1
      );
    }
  }
}

function encodeTabularArray(
  arr: Record<string, GoonValue>[],
  depth: number,
  opts: InternalOptions,
  dictionary: Dictionary,
  lines: string[],
  parentKey: string | null
): void {
  const indent = opts.indent.repeat(depth);
  const fields = Object.keys(arr[0]).filter(isSafeKey);

  if (fields.length === 0) {
    // No safe fields - encode as empty
    if (parentKey !== null) {
      lines.push(`${indent}${parentKey}[]`);
    } else {
      lines.push(`${indent}[]`);
    }
    return;
  }

  // Check if column refs should be used at this depth
  // maxColumnRefDepth: 1 means only depth 0 tables use refs
  // maxColumnRefDepth: -1 means unlimited
  const useColumnRefs = opts.columnRefs && 
    (opts.maxColumnRefDepth === -1 || depth < opts.maxColumnRefDepth);
  
  // Check if dictionary refs should be used at ROW depth (depth+1, since header is at depth)
  // Table rows are indented one level below the header
  const rowDepth = depth + 1;
  const useDictionary = opts.maxDictDepth === -1 || rowDepth <= opts.maxDictDepth;

  // Auto-sort to maximize column references
  let sortedArr = arr;
  if (opts.autoSort && useColumnRefs && arr.length > 1) {
    sortedArr = autoSortForColumnRefs(arr, fields);
  }

  // Calculate schema defaults if enabled
  // Find the most common value for each field (if it appears in >50% of rows)
  const fieldDefaults: Map<string, GoonValue> = new Map();
  if (opts.schemaDefaults) {
    for (const field of fields) {
      const valueCounts = new Map<string, { value: GoonValue; count: number }>();
      for (const obj of arr) {
        const val = obj[field];
        const key = JSON.stringify(val);
        const existing = valueCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          valueCounts.set(key, { value: val, count: 1 });
        }
      }
      // Find most common value
      let mostCommon: { value: GoonValue; count: number } | null = null;
      for (const entry of valueCounts.values()) {
        if (!mostCommon || entry.count > mostCommon.count) {
          mostCommon = entry;
        }
      }
      // Only use as default if appears in >50% of rows and saves tokens
      if (mostCommon && mostCommon.count > arr.length * 0.5 && mostCommon.count > 1) {
        fieldDefaults.set(field, mostCommon.value);
      }
    }
  }

  // Build header with optional array length and schema defaults
  const lengthPrefix = opts.arrayLengths ? `[${arr.length}]` : '';
  const fieldParts = fields.map(f => {
    const defaultVal = fieldDefaults.get(f);
    if (defaultVal !== undefined && isPrimitive(defaultVal)) {
      return `${f}=${encodePrimitive(defaultVal as string | number | boolean | null, dictionary, false)}`;
    }
    return f;
  });
  const header = `${lengthPrefix}{${fieldParts.join(opts.delimiter)}}:`;
  if (parentKey !== null) {
    lines.push(`${indent}${parentKey}${header}`);
  } else {
    lines.push(`${indent}${header}`);
  }

  // Track previous row for column references
  let prevRow: (string | number | boolean | null)[] | null = null;
  
  // Track numeric sums for footer
  const numericSums: Map<string, { sum: number; count: number }> = new Map();

  for (let rowIdx = 0; rowIdx < sortedArr.length; rowIdx++) {
    const obj = sortedArr[rowIdx];
    const row = fields.map((f) => obj[f] as string | number | boolean | null);
    const cells: string[] = [];

    for (let i = 0; i < row.length; i++) {
      const value = row[i];
      const field = fields[i];
      const defaultVal = fieldDefaults.get(field);

      // Track numeric values for footer summaries
      if (opts.footerSummaries && typeof value === 'number' && isFinite(value)) {
        const existing = numericSums.get(field) || { sum: 0, count: 0 };
        existing.sum += value;
        existing.count++;
        numericSums.set(field, existing);
      }

      // Check for column reference (only if enabled at this depth)
      if (
        useColumnRefs &&
        prevRow !== null &&
        value === prevRow[i] &&
        value !== null
      ) {
        cells.push('^');
      } else if (opts.schemaDefaults && defaultVal !== undefined && value === defaultVal) {
        // Use empty string for default value (omit it)
        cells.push('');
      } else {
        cells.push(encodePrimitive(value, dictionary, useDictionary));
      }
    }

    // minimalIndent: rows at column 0 for max token efficiency
    const rowIndent = opts.minimalIndent ? '' : opts.indent.repeat(depth + 1);
    // Add row number prefix if enabled
    const rowPrefix = opts.rowNumbers ? `${rowIdx + 1}. ` : '';
    lines.push(`${rowIndent}${rowPrefix}${cells.join(opts.delimiter)}`);
    prevRow = row;
  }

  // Add footer summary if enabled and we have numeric fields
  if (opts.footerSummaries && numericSums.size > 0) {
    const summaryParts: string[] = [`n=${arr.length}`];
    for (const [field, stats] of numericSums) {
      if (stats.count === arr.length) {
        // All rows have this numeric field
        const avg = Math.round((stats.sum / stats.count) * 100) / 100;
        summaryParts.push(`${field}:sum=${stats.sum}`);
        summaryParts.push(`${field}:avg=${avg}`);
      }
    }
    const rowIndent = opts.minimalIndent ? '' : opts.indent.repeat(depth);
    lines.push(`${rowIndent}---[${summaryParts.join(',')}]`);
  }
}

/**
 * Sort tabular array to maximize column reference opportunities.
 * Finds the column with most repeated values and sorts by it.
 */
function autoSortForColumnRefs(
  arr: Record<string, GoonValue>[],
  fields: string[]
): Record<string, GoonValue>[] {
  // Count value frequencies for each column
  const columnRepetitions: { field: string; maxRun: number }[] = [];

  for (const field of fields) {
    const valueCounts = new Map<GoonValue, number>();
    for (const obj of arr) {
      const val = obj[field];
      valueCounts.set(val, (valueCounts.get(val) || 0) + 1);
    }
    // Max repetition count for this column
    const maxRun = Math.max(...valueCounts.values());
    columnRepetitions.push({ field, maxRun });
  }

  // Sort by the column with most repeated values
  columnRepetitions.sort((a, b) => b.maxRun - a.maxRun);
  const sortFields = columnRepetitions.slice(0, 3).map((c) => c.field);

  // Multi-level sort by the most repetitive columns
  return [...arr].sort((a, b) => {
    for (const field of sortFields) {
      const aVal = String(a[field] ?? '');
      const bVal = String(b[field] ?? '');
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
    }
    return 0;
  });
}

function encodeObject(
  obj: Record<string, GoonValue>,
  depth: number,
  opts: InternalOptions,
  dictionary: Dictionary,
  lines: string[],
  parentKey: string | null,
  recursionDepth: number
): void {
  // Check recursion depth at the start of object encoding
  if (recursionDepth >= MAX_RECURSION_DEPTH) {
    throw new GoonEncodeError(
      `Maximum recursion depth (${MAX_RECURSION_DEPTH}) exceeded`
    );
  }

  const indent = opts.indent.repeat(depth);
  const entries = Object.entries(obj).filter(([key]) => isSafeKey(key));

  if (entries.length === 0) {
    if (parentKey !== null) {
      lines.push(`${indent}${parentKey}{}`);
    } else {
      lines.push(`${indent}{}`);
    }
    return;
  }

  // Add parent key line if present (with trailing colon for container indication)
  if (parentKey !== null) {
    lines.push(`${indent}${parentKey}:`);
  }

  const childIndent = parentKey !== null ? depth + 1 : depth;
  
  // Check if dictionary refs should be used at CHILD depth (not current depth)
  const useDictionary = opts.maxDictDepth === -1 || childIndent <= opts.maxDictDepth;

  for (const [key, value] of entries) {
    if (isPrimitive(value)) {
      const encoded = encodePrimitive(value, dictionary, useDictionary);
      lines.push(`${opts.indent.repeat(childIndent)}${key}: ${encoded}`);
    } else if (Array.isArray(value)) {
      encodeArray(
        value,
        childIndent,
        opts,
        dictionary,
        lines,
        key,
        recursionDepth + 1
      );
    } else if (isPlainObject(value)) {
      encodeObject(
        value,
        childIndent,
        opts,
        dictionary,
        lines,
        key,
        recursionDepth + 1
      );
    }
  }
}
