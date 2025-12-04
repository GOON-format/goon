/**
 * GOON Encoder - Greatly Optimized Object Notation
 * @module encode
 */
import { isPlainObject, isTabularArray, isPrimitive, buildDictionary, encodePrimitive, quoteString, isSafeKey, MAX_RECURSION_DEPTH, } from './utils.js';
const DEFAULT_OPTIONS = {
    dictionary: true,
    columnRefs: true,
    runLength: true,
    minDictLength: 3,
    minDictOccurrences: 2,
    indent: '  ',
};
/**
 * Error thrown when encoding fails
 */
export class GoonEncodeError extends Error {
    constructor(message) {
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
export function encode(value, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
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
    const dictionary = opts.dictionary
        ? buildDictionary(value, opts.minDictLength, opts.minDictOccurrences)
        : { entries: [], lookup: new Map() };
    const lines = [];
    // Output dictionary if non-empty
    if (dictionary.entries.length > 0) {
        const dictLine = dictionary.entries.map(quoteString).join(',');
        lines.push(`$:${dictLine}`);
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
export function* encodeLines(value, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    if (opts.replacer) {
        const replaced = applyReplacer(value, opts.replacer, '', 0);
        if (replaced === OMIT_VALUE) {
            return; // Yield nothing if root is omitted
        }
        value = replaced;
    }
    const dictionary = opts.dictionary
        ? buildDictionary(value, opts.minDictLength, opts.minDictOccurrences)
        : { entries: [], lookup: new Map() };
    if (dictionary.entries.length > 0) {
        yield `$:${dictionary.entries.map(quoteString).join(',')}`;
    }
    const lines = [];
    encodeValue(value, 0, opts, dictionary, lines, null, 0);
    for (const line of lines) {
        yield line;
    }
}
const OMIT_VALUE = Symbol('OMIT');
function applyReplacer(value, replacer, key, depth) {
    if (depth >= MAX_RECURSION_DEPTH) {
        throw new GoonEncodeError(`Maximum recursion depth (${MAX_RECURSION_DEPTH}) exceeded`);
    }
    const result = replacer(key, value);
    if (result === undefined)
        return OMIT_VALUE;
    if (Array.isArray(result)) {
        return result.map((item, i) => applyReplacer(item, replacer, String(i), depth + 1));
    }
    if (isPlainObject(result)) {
        const obj = {};
        for (const [k, v] of Object.entries(result)) {
            if (!isSafeKey(k))
                continue; // Skip dangerous keys
            const replaced = applyReplacer(v, replacer, k, depth + 1);
            if (replaced !== OMIT_VALUE) {
                obj[k] = replaced;
            }
        }
        return obj;
    }
    return result;
}
function encodeValue(value, depth, opts, dictionary, lines, parentKey, recursionDepth) {
    if (recursionDepth >= MAX_RECURSION_DEPTH) {
        throw new GoonEncodeError(`Maximum recursion depth (${MAX_RECURSION_DEPTH}) exceeded`);
    }
    const indent = opts.indent.repeat(depth);
    if (isPrimitive(value)) {
        const encoded = encodePrimitive(value, dictionary);
        if (parentKey !== null) {
            lines.push(`${indent}${parentKey}:${encoded}`);
        }
        else {
            lines.push(`${indent}${encoded}`);
        }
        return;
    }
    if (Array.isArray(value)) {
        encodeArray(value, depth, opts, dictionary, lines, parentKey, recursionDepth + 1);
        return;
    }
    if (isPlainObject(value)) {
        encodeObject(value, depth, opts, dictionary, lines, parentKey, recursionDepth + 1);
        return;
    }
}
function encodeArray(arr, depth, opts, dictionary, lines, parentKey, recursionDepth) {
    const indent = opts.indent.repeat(depth);
    if (arr.length === 0) {
        if (parentKey !== null) {
            lines.push(`${indent}${parentKey}[]`);
        }
        else {
            lines.push(`${indent}[]`);
        }
        return;
    }
    // Check for tabular array
    if (isTabularArray(arr)) {
        encodeTabularArray(arr, depth, opts, dictionary, lines, parentKey);
        return;
    }
    // Check for simple primitive array (single line)
    if (arr.every(isPrimitive) && arr.length <= 10) {
        const values = arr.map((v) => encodePrimitive(v, dictionary));
        if (parentKey !== null) {
            lines.push(`${indent}${parentKey}[]:${values.join('|')}`);
        }
        else {
            lines.push(`${indent}[]:${values.join('|')}`);
        }
        return;
    }
    // Mixed array - use list format
    if (parentKey !== null) {
        lines.push(`${indent}${parentKey}[]`);
    }
    else {
        lines.push(`${indent}[]`);
    }
    for (const item of arr) {
        if (isPrimitive(item)) {
            lines.push(`${opts.indent.repeat(depth + 1)}- ${encodePrimitive(item, dictionary)}`);
        }
        else if (Array.isArray(item)) {
            lines.push(`${opts.indent.repeat(depth + 1)}-`);
            encodeValue(item, depth + 2, opts, dictionary, lines, null, recursionDepth + 1);
        }
        else if (isPlainObject(item)) {
            lines.push(`${opts.indent.repeat(depth + 1)}-`);
            encodeObject(item, depth + 2, opts, dictionary, lines, null, recursionDepth + 1);
        }
    }
}
function encodeTabularArray(arr, depth, opts, dictionary, lines, parentKey) {
    const indent = opts.indent.repeat(depth);
    const fields = Object.keys(arr[0]).filter(isSafeKey);
    if (fields.length === 0) {
        // No safe fields - encode as empty
        if (parentKey !== null) {
            lines.push(`${indent}${parentKey}[]`);
        }
        else {
            lines.push(`${indent}[]`);
        }
        return;
    }
    // Build header
    const header = `{${fields.join('|')}}`;
    if (parentKey !== null) {
        lines.push(`${indent}${parentKey}${header}`);
    }
    else {
        lines.push(`${indent}${header}`);
    }
    // Track previous row for column references
    let prevRow = null;
    for (const obj of arr) {
        const row = fields.map((f) => obj[f]);
        const cells = [];
        for (let i = 0; i < row.length; i++) {
            const value = row[i];
            // Check for column reference
            if (opts.columnRefs &&
                prevRow !== null &&
                value === prevRow[i] &&
                value !== null) {
                cells.push('^');
            }
            else {
                cells.push(encodePrimitive(value, dictionary));
            }
        }
        lines.push(`${opts.indent.repeat(depth + 1)}${cells.join('|')}`);
        prevRow = row;
    }
}
function encodeObject(obj, depth, opts, dictionary, lines, parentKey, recursionDepth) {
    // Check recursion depth at the start of object encoding
    if (recursionDepth >= MAX_RECURSION_DEPTH) {
        throw new GoonEncodeError(`Maximum recursion depth (${MAX_RECURSION_DEPTH}) exceeded`);
    }
    const indent = opts.indent.repeat(depth);
    const entries = Object.entries(obj).filter(([key]) => isSafeKey(key));
    if (entries.length === 0) {
        if (parentKey !== null) {
            lines.push(`${indent}${parentKey}{}`);
        }
        else {
            lines.push(`${indent}{}`);
        }
        return;
    }
    // Add parent key line if present
    if (parentKey !== null) {
        lines.push(`${indent}${parentKey}`);
    }
    const childIndent = parentKey !== null ? depth + 1 : depth;
    for (const [key, value] of entries) {
        if (isPrimitive(value)) {
            const encoded = encodePrimitive(value, dictionary);
            lines.push(`${opts.indent.repeat(childIndent)}${key}:${encoded}`);
        }
        else if (Array.isArray(value)) {
            encodeArray(value, childIndent, opts, dictionary, lines, key, recursionDepth + 1);
        }
        else if (isPlainObject(value)) {
            encodeObject(value, childIndent, opts, dictionary, lines, key, recursionDepth + 1);
        }
    }
}
