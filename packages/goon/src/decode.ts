/**
 * GOON Decoder - Greatly Optimized Object Notation
 * @module decode
 */

import type { GoonValue, DecodeOptions } from './types.js';
import {
  parseCell,
  parsePrimitive,
  unquoteString,
  validateInputSize,
  isSafeKey,
  createSafeObject,
  MAX_RECURSION_DEPTH,
} from './utils.js';

interface ParseContext {
  lines: string[];
  index: number;
  dictionary: string[];
  indent: string;
  depth: number;
}

/**
 * Error thrown when decoding fails
 */
export class GoonDecodeError extends Error {
  constructor(
    message: string,
    public line?: number
  ) {
    super(line !== undefined ? `Line ${line}: ${message}` : message);
    this.name = 'GoonDecodeError';
  }
}

/**
 * Decode a GOON string to a JavaScript value
 *
 * @param input - The GOON-formatted string to decode
 * @param options - Decoding options
 * @returns The decoded JavaScript value
 * @throws GoonDecodeError if the input is invalid
 *
 * @example
 * ```ts
 * const data = decode(`users{id|name}
 *   1|Alice
 *   2|Bob`);
 * // { users: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] }
 * ```
 */
export function decode(input: string, options: DecodeOptions = {}): GoonValue {
  // Validate input size
  validateInputSize(input);

  const lines = input.split('\n').filter((line) => line.trim() !== '');
  if (lines.length === 0) return null;

  // Detect indent
  const indent = detectIndent(lines);

  // Parse dictionary if present
  const dictionary: string[] = [];
  let startIndex = 0;

  if (lines[0].startsWith('$:')) {
    const dictLine = lines[0].slice(2);
    dictionary.push(...parseDictionary(dictLine));
    startIndex = 1;
  }

  if (startIndex >= lines.length) return null;

  const ctx: ParseContext = {
    lines,
    index: startIndex,
    dictionary,
    indent,
    depth: 0,
  };

  // Parse the root structure
  const result = parseRoot(ctx);

  if (options.reviver) {
    return applyReviver(result, options.reviver, '', 0);
  }

  return result;
}

/**
 * Streaming decoder for large inputs
 *
 * @param lines - Iterable of GOON lines
 * @param options - Decoding options
 * @yields Decoded values (array items if root is array, otherwise single value)
 */
export function* decodeFromLines(
  lines: Iterable<string>,
  options: DecodeOptions = {}
): Generator<GoonValue> {
  const allLines = [...lines].filter((line) => line.trim() !== '');
  if (allLines.length === 0) return;

  const result = decode(allLines.join('\n'), options);
  if (Array.isArray(result)) {
    for (const item of result) {
      yield item;
    }
  } else {
    yield result;
  }
}

function detectIndent(lines: string[]): string {
  for (const line of lines) {
    const match = line.match(/^(\s+)/);
    if (match) {
      // Use first indentation character found
      const firstChar = match[1][0];
      if (firstChar === '\t') return '\t';
      // Count leading spaces up to first non-space
      let count = 0;
      for (const c of match[1]) {
        if (c === ' ') count++;
        else break;
      }
      return ' '.repeat(Math.min(count, 8)); // Cap at 8 spaces
    }
  }
  return '  ';
}

function parseDictionary(dictLine: string): string[] {
  const entries: string[] = [];
  let current = '';
  let inQuote = false;
  let escaped = false;

  for (let i = 0; i < dictLine.length; i++) {
    const char = dictLine[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && inQuote) {
      escaped = true;
      current += char;
      continue;
    }

    if (char === '"') {
      inQuote = !inQuote;
      current += char;
      continue;
    }

    if (char === ',' && !inQuote) {
      const trimmed = current.trim();
      if (trimmed) {
        entries.push(unquoteString(trimmed));
      }
      current = '';
      continue;
    }

    current += char;
  }

  const trimmed = current.trim();
  if (trimmed) {
    entries.push(unquoteString(trimmed));
  }

  return entries;
}

function getIndentLevel(line: string, indent: string): number {
  if (indent.length === 0) return 0;

  let level = 0;
  let remaining = line;

  while (remaining.startsWith(indent)) {
    level++;
    remaining = remaining.slice(indent.length);
  }

  return level;
}

/**
 * Parse the root level - determine if it's an object, array, or primitive
 */
function parseRoot(ctx: ParseContext): GoonValue {
  if (ctx.index >= ctx.lines.length) return null;

  const firstLine = ctx.lines[ctx.index].trim();

  // Empty object
  if (firstLine === '{}') {
    ctx.index++;
    return createSafeObject();
  }

  // Empty array
  if (firstLine === '[]') {
    ctx.index++;
    return [];
  }

  // Standalone tabular array: {fields} or [N]{fields} or [N]{fields}:
  const standaloneTabular = firstLine.match(/^(?:\[\d*\])?\{([^}]+)\}:?$/);
  if (standaloneTabular) {
    return parseTabularArray(ctx, -1, standaloneTabular[1]);
  }

  // Standalone simple array: []:values
  const standaloneSimpleArr = firstLine.match(/^\[\]:(.+)$/);
  if (standaloneSimpleArr) {
    ctx.index++;
    const valuesStr = standaloneSimpleArr[1];
    const delimiter = detectDelimiter(valuesStr);
    return parseRow(valuesStr, ctx.dictionary, delimiter);
  }

  // Standalone list array: []
  if (firstLine === '[]') {
    return parseListArray(ctx, -1);
  }

  // If first line looks like a key:value, key{}, key[], or just key - it's an object
  if (
    /^[\w.]+:/.test(firstLine) ||
    /^[\w.]+\{/.test(firstLine) ||
    /^[\w.]+\[/.test(firstLine) ||
    /^[\w.]+$/.test(firstLine)
  ) {
    return parseObject(ctx, 0);
  }

  // Single primitive value
  ctx.index++;
  return parsePrimitive(firstLine, ctx.dictionary);
}

function parseObject(ctx: ParseContext, baseIndent: number): GoonValue {
  ctx.depth++;
  if (ctx.depth > MAX_RECURSION_DEPTH) {
    throw new GoonDecodeError(
      `Maximum recursion depth (${MAX_RECURSION_DEPTH}) exceeded`,
      ctx.index + 1
    );
  }

  const obj = createSafeObject();

  try {
    while (ctx.index < ctx.lines.length) {
      const line = ctx.lines[ctx.index];
      const currentIndent = getIndentLevel(line, ctx.indent);
      const trimmed = line.trim();

      // Stop if we've dedented past base
      if (currentIndent < baseIndent) break;

      // Skip if indented more than expected (handled by nested parse)
      if (currentIndent > baseIndent) {
        ctx.index++;
        continue;
      }

      // Key with inline value (key: value or key:value)
      const keyValueMatch = trimmed.match(/^([\w.]+):\s*(.+)$/);
      if (keyValueMatch) {
        const key = keyValueMatch[1];
        if (isSafeKey(key)) {
          const valueStr = keyValueMatch[2].trim();
          obj[key] = parsePrimitive(valueStr, ctx.dictionary);
        }
        ctx.index++;
        continue;
      }

      // Empty object (key{})
      const emptyObjMatch = trimmed.match(/^([\w.]+)\{\}$/);
      if (emptyObjMatch) {
        const key = emptyObjMatch[1];
        if (isSafeKey(key)) {
          obj[key] = createSafeObject();
        }
        ctx.index++;
        continue;
      }

      // Empty array (key[])
      const emptyArrMatch = trimmed.match(/^([\w.]+)\[\]$/);
      if (emptyArrMatch) {
        const key = emptyArrMatch[1];
        if (isSafeKey(key)) {
          obj[key] = [];
        }
        ctx.index++;
        continue;
      }

      // Tabular array (key{fields} or key[N]{fields} or key[N]{fields}:)
      const tabularMatch = trimmed.match(/^([\w.]+)(?:\[\d*\])?\{([^}]+)\}:?$/);
      if (tabularMatch) {
        const key = tabularMatch[1];
        if (isSafeKey(key)) {
          obj[key] = parseTabularArray(ctx, currentIndent, tabularMatch[2]);
        } else {
          ctx.index++;
        }
        continue;
      }

      // Simple array inline (key[]:values)
      const simpleArrMatch = trimmed.match(/^([\w.]+)\[\]:(.+)$/);
      if (simpleArrMatch) {
        const key = simpleArrMatch[1];
        if (isSafeKey(key)) {
          const valuesStr = simpleArrMatch[2];
          const delimiter = detectDelimiter(valuesStr);
          obj[key] = parseRow(valuesStr, ctx.dictionary, delimiter);
        }
        ctx.index++;
        continue;
      }

      // List array (key[])
      const listArrMatch = trimmed.match(/^([\w.]+)\[\]$/);
      if (listArrMatch) {
        const key = listArrMatch[1];
        if (isSafeKey(key)) {
          obj[key] = parseListArray(ctx, currentIndent);
        } else {
          ctx.index++;
        }
        continue;
      }

      // Nested object key with trailing colon (key:) or without (key)
      const nestedKeyMatch = trimmed.match(/^([\w.]+):?$/);
      if (nestedKeyMatch) {
        const key = nestedKeyMatch[1];
        ctx.index++;

        // Check if next lines are indented (nested object)
        if (ctx.index < ctx.lines.length && isSafeKey(key)) {
          const nextIndent = getIndentLevel(ctx.lines[ctx.index], ctx.indent);
          if (nextIndent > currentIndent) {
            obj[key] = parseObject(ctx, nextIndent);
            continue;
          }
        }

        if (isSafeKey(key)) {
          obj[key] = null;
        }
        continue;
      }

      // Unknown line format - skip
      ctx.index++;
    }

    return obj;
  } finally {
    ctx.depth--;
  }
}

function parseTabularArray(
  ctx: ParseContext,
  baseIndent: number,
  fieldsStr: string
): GoonValue[] {
  ctx.depth++;
  if (ctx.depth > MAX_RECURSION_DEPTH) {
    throw new GoonDecodeError(
      `Maximum recursion depth (${MAX_RECURSION_DEPTH}) exceeded`,
      ctx.index + 1
    );
  }

  try {
    // Detect delimiter from header
    const delimiter = detectDelimiter(fieldsStr);
    const fields = fieldsStr.split(delimiter).filter(isSafeKey);
    const rows: GoonValue[] = [];
    let prevRowValues: GoonValue[] = [];

    ctx.index++; // Skip header

    while (ctx.index < ctx.lines.length) {
      const line = ctx.lines[ctx.index];
      const currentIndent = getIndentLevel(line, ctx.indent);
      const trimmed = line.trim();

      // Stop if we've dedented below the header level
      if (currentIndent < baseIndent) break;

      // Skip empty lines
      if (!trimmed) {
        ctx.index++;
        continue;
      }

      // Stop if this looks like a new key (not a data row)
      // Data rows are comma/pipe/tab separated values, not key:value or key{} etc.
      if (/^[\w.]+[:\[{]/.test(trimmed) || /^\$:/.test(trimmed)) {
        break;
      }

      // Parse row with detected delimiter
      const cells = parseRow(trimmed, ctx.dictionary, delimiter);

      // Handle column references (^)
      const rowValues: GoonValue[] = [];
      for (let i = 0; i < fields.length; i++) {
        if (cells[i] === '^' && prevRowValues[i] !== undefined) {
          rowValues.push(prevRowValues[i]);
        } else {
          rowValues.push(cells[i] ?? null);
        }
      }

      // Build object with safe object creation
      const obj = createSafeObject();
      for (let i = 0; i < fields.length; i++) {
        obj[fields[i]] = rowValues[i];
      }

      rows.push(obj);
      prevRowValues = rowValues;
      ctx.index++;
    }

    return rows;
  } finally {
    ctx.depth--;
  }
}

function parseListArray(ctx: ParseContext, baseIndent: number): GoonValue[] {
  ctx.depth++;
  if (ctx.depth > MAX_RECURSION_DEPTH) {
    throw new GoonDecodeError(
      `Maximum recursion depth (${MAX_RECURSION_DEPTH}) exceeded`,
      ctx.index + 1
    );
  }

  try {
    const items: GoonValue[] = [];

    ctx.index++; // Skip header

    while (ctx.index < ctx.lines.length) {
      const line = ctx.lines[ctx.index];
      const currentIndent = getIndentLevel(line, ctx.indent);
      const trimmed = line.trim();

      // Stop if we've dedented past base
      if (currentIndent <= baseIndent) break;

      // List item with value
      if (trimmed.startsWith('- ')) {
        const valueStr = trimmed.slice(2);
        items.push(parsePrimitive(valueStr, ctx.dictionary));
        ctx.index++;
        continue;
      }

      // List item alone (nested content follows)
      if (trimmed === '-') {
        ctx.index++;
        // Check for nested content
        if (ctx.index < ctx.lines.length) {
          const nextIndent = getIndentLevel(ctx.lines[ctx.index], ctx.indent);
          if (nextIndent > currentIndent) {
            items.push(parseNestedValue(ctx, nextIndent));
            continue;
          }
        }
        items.push(null);
        continue;
      }

      ctx.index++;
    }

    return items;
  } finally {
    ctx.depth--;
  }
}

function parseNestedValue(ctx: ParseContext, minIndent: number): GoonValue {
  if (ctx.index >= ctx.lines.length) return null;

  const line = ctx.lines[ctx.index];
  const trimmed = line.trim();

  // Empty object
  if (trimmed === '{}') {
    ctx.index++;
    return createSafeObject();
  }

  // Empty array
  if (trimmed === '[]') {
    ctx.index++;
    return [];
  }

  // Tabular array (with optional key and array length)
  const tabularMatch = trimmed.match(/^([\w.]+)?(?:\[\d*\])?\{([^}]+)\}:?$/);
  if (tabularMatch) {
    if (tabularMatch[1]) {
      // Has key - return as object
      return parseObject(ctx, minIndent);
    }
    return parseTabularArray(ctx, minIndent - 1, tabularMatch[2]);
  }

  // List array
  if (trimmed === '[]' || /^[\w.]+\[\]$/.test(trimmed)) {
    return parseObject(ctx, minIndent);
  }

  // Looks like object content
  if (/^[\w.]+[:{\[]/.test(trimmed) || /^[\w.]+$/.test(trimmed)) {
    return parseObject(ctx, minIndent);
  }

  // Single value
  ctx.index++;
  return parsePrimitive(trimmed, ctx.dictionary);
}

/**
 * Detect delimiter from a fields string (content between {})
 */
function detectDelimiter(fieldsStr: string): ',' | '|' | '\t' {
  // Count occurrences outside of quotes
  let commas = 0, pipes = 0, tabs = 0;
  let inQuote = false;
  for (const char of fieldsStr) {
    if (char === '"') inQuote = !inQuote;
    if (!inQuote) {
      if (char === ',') commas++;
      if (char === '|') pipes++;
      if (char === '\t') tabs++;
    }
  }
  // Return the most common delimiter
  if (tabs > pipes && tabs > commas) return '\t';
  if (pipes > commas) return '|';
  return ',';
}

function parseRow(rowStr: string, dictionary: string[], delimiter: ',' | '|' | '\t' = ','): GoonValue[] {
  const cells: GoonValue[] = [];
  let current = '';
  let inQuote = false;
  let escaped = false;

  for (let i = 0; i < rowStr.length; i++) {
    const char = rowStr[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && inQuote) {
      escaped = true;
      current += char;
      continue;
    }

    if (char === '"') {
      inQuote = !inQuote;
      current += char;
      continue;
    }

    if (char === delimiter && !inQuote) {
      const trimmed = current.trim();
      const { value, repeat } = parseCell(trimmed, dictionary);
      for (let r = 0; r < repeat; r++) {
        cells.push(value);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const trimmed = current.trim();
  if (trimmed) {
    const { value, repeat } = parseCell(trimmed, dictionary);
    for (let r = 0; r < repeat; r++) {
      cells.push(value);
    }
  }

  return cells;
}

function applyReviver(
  value: GoonValue,
  reviver: NonNullable<DecodeOptions['reviver']>,
  key: string,
  depth: number
): GoonValue {
  if (depth > MAX_RECURSION_DEPTH) {
    throw new GoonDecodeError(
      `Maximum recursion depth (${MAX_RECURSION_DEPTH}) exceeded in reviver`
    );
  }

  if (Array.isArray(value)) {
    const arr = value.map((item, i) =>
      applyReviver(item, reviver, String(i), depth + 1)
    );
    return reviver(key, arr);
  }

  if (typeof value === 'object' && value !== null) {
    const obj = createSafeObject();
    for (const [k, v] of Object.entries(value)) {
      if (isSafeKey(k)) {
        obj[k] = applyReviver(v, reviver, k, depth + 1);
      }
    }
    return reviver(key, obj);
  }

  return reviver(key, value);
}
