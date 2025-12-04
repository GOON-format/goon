/**
 * GOON Decoder - Greatly Optimized Object Notation
 * @module decode
 */
import { parseCell, parsePrimitive, unquoteString, validateInputSize, isSafeKey, createSafeObject, MAX_RECURSION_DEPTH, } from './utils.js';
/**
 * Error thrown when decoding fails
 */
export class GoonDecodeError extends Error {
    line;
    constructor(message, line) {
        super(line !== undefined ? `Line ${line}: ${message}` : message);
        this.line = line;
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
export function decode(input, options = {}) {
    // Validate input size
    validateInputSize(input);
    const lines = input.split('\n').filter((line) => line.trim() !== '');
    if (lines.length === 0)
        return null;
    // Detect indent
    const indent = detectIndent(lines);
    // Parse dictionary if present
    const dictionary = [];
    let startIndex = 0;
    if (lines[0].startsWith('$:')) {
        const dictLine = lines[0].slice(2);
        dictionary.push(...parseDictionary(dictLine));
        startIndex = 1;
    }
    if (startIndex >= lines.length)
        return null;
    const ctx = {
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
export function* decodeFromLines(lines, options = {}) {
    const allLines = [...lines].filter((line) => line.trim() !== '');
    if (allLines.length === 0)
        return;
    const result = decode(allLines.join('\n'), options);
    if (Array.isArray(result)) {
        for (const item of result) {
            yield item;
        }
    }
    else {
        yield result;
    }
}
function detectIndent(lines) {
    for (const line of lines) {
        const match = line.match(/^(\s+)/);
        if (match) {
            // Use first indentation character found
            const firstChar = match[1][0];
            if (firstChar === '\t')
                return '\t';
            // Count leading spaces up to first non-space
            let count = 0;
            for (const c of match[1]) {
                if (c === ' ')
                    count++;
                else
                    break;
            }
            return ' '.repeat(Math.min(count, 8)); // Cap at 8 spaces
        }
    }
    return '  ';
}
function parseDictionary(dictLine) {
    const entries = [];
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
function getIndentLevel(line, indent) {
    if (indent.length === 0)
        return 0;
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
function parseRoot(ctx) {
    if (ctx.index >= ctx.lines.length)
        return null;
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
    // Standalone tabular array: {fields}
    const standaloneTabular = firstLine.match(/^\{([^}]+)\}$/);
    if (standaloneTabular) {
        return parseTabularArray(ctx, -1, standaloneTabular[1]);
    }
    // Standalone simple array: []:values
    const standaloneSimpleArr = firstLine.match(/^\[\]:(.+)$/);
    if (standaloneSimpleArr) {
        ctx.index++;
        return parseRow(standaloneSimpleArr[1], ctx.dictionary);
    }
    // Standalone list array: []
    if (firstLine === '[]') {
        return parseListArray(ctx, -1);
    }
    // If first line looks like a key:value, key{}, key[], or just key - it's an object
    if (/^[\w.]+:/.test(firstLine) ||
        /^[\w.]+\{/.test(firstLine) ||
        /^[\w.]+\[/.test(firstLine) ||
        /^[\w.]+$/.test(firstLine)) {
        return parseObject(ctx, 0);
    }
    // Single primitive value
    ctx.index++;
    return parsePrimitive(firstLine, ctx.dictionary);
}
function parseObject(ctx, baseIndent) {
    ctx.depth++;
    if (ctx.depth > MAX_RECURSION_DEPTH) {
        throw new GoonDecodeError(`Maximum recursion depth (${MAX_RECURSION_DEPTH}) exceeded`, ctx.index + 1);
    }
    const obj = createSafeObject();
    try {
        while (ctx.index < ctx.lines.length) {
            const line = ctx.lines[ctx.index];
            const currentIndent = getIndentLevel(line, ctx.indent);
            const trimmed = line.trim();
            // Stop if we've dedented past base
            if (currentIndent < baseIndent)
                break;
            // Skip if indented more than expected (handled by nested parse)
            if (currentIndent > baseIndent) {
                ctx.index++;
                continue;
            }
            // Key with inline value (key:value)
            const keyValueMatch = trimmed.match(/^([\w.]+):(.+)$/);
            if (keyValueMatch) {
                const key = keyValueMatch[1];
                if (isSafeKey(key)) {
                    const valueStr = keyValueMatch[2];
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
            // Tabular array (key{fields})
            const tabularMatch = trimmed.match(/^([\w.]+)\{([^}]+)\}$/);
            if (tabularMatch) {
                const key = tabularMatch[1];
                if (isSafeKey(key)) {
                    obj[key] = parseTabularArray(ctx, currentIndent, tabularMatch[2]);
                }
                else {
                    ctx.index++;
                }
                continue;
            }
            // Simple array inline (key[]:values)
            const simpleArrMatch = trimmed.match(/^([\w.]+)\[\]:(.+)$/);
            if (simpleArrMatch) {
                const key = simpleArrMatch[1];
                if (isSafeKey(key)) {
                    obj[key] = parseRow(simpleArrMatch[2], ctx.dictionary);
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
                }
                else {
                    ctx.index++;
                }
                continue;
            }
            // Nested object key (just "key" with nested content below)
            const nestedKeyMatch = trimmed.match(/^([\w.]+)$/);
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
    }
    finally {
        ctx.depth--;
    }
}
function parseTabularArray(ctx, baseIndent, fieldsStr) {
    ctx.depth++;
    if (ctx.depth > MAX_RECURSION_DEPTH) {
        throw new GoonDecodeError(`Maximum recursion depth (${MAX_RECURSION_DEPTH}) exceeded`, ctx.index + 1);
    }
    try {
        const fields = fieldsStr.split('|').filter(isSafeKey);
        const rows = [];
        let prevRowValues = [];
        ctx.index++; // Skip header
        while (ctx.index < ctx.lines.length) {
            const line = ctx.lines[ctx.index];
            const currentIndent = getIndentLevel(line, ctx.indent);
            const trimmed = line.trim();
            // Stop if we've dedented
            if (currentIndent <= baseIndent)
                break;
            // Skip empty lines
            if (!trimmed) {
                ctx.index++;
                continue;
            }
            // Parse row
            const cells = parseRow(trimmed, ctx.dictionary);
            // Handle column references (^)
            const rowValues = [];
            for (let i = 0; i < fields.length; i++) {
                if (cells[i] === '^' && prevRowValues[i] !== undefined) {
                    rowValues.push(prevRowValues[i]);
                }
                else {
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
    }
    finally {
        ctx.depth--;
    }
}
function parseListArray(ctx, baseIndent) {
    ctx.depth++;
    if (ctx.depth > MAX_RECURSION_DEPTH) {
        throw new GoonDecodeError(`Maximum recursion depth (${MAX_RECURSION_DEPTH}) exceeded`, ctx.index + 1);
    }
    try {
        const items = [];
        ctx.index++; // Skip header
        while (ctx.index < ctx.lines.length) {
            const line = ctx.lines[ctx.index];
            const currentIndent = getIndentLevel(line, ctx.indent);
            const trimmed = line.trim();
            // Stop if we've dedented past base
            if (currentIndent <= baseIndent)
                break;
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
    }
    finally {
        ctx.depth--;
    }
}
function parseNestedValue(ctx, minIndent) {
    if (ctx.index >= ctx.lines.length)
        return null;
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
    // Tabular array
    const tabularMatch = trimmed.match(/^([\w.]+)?\{([^}]+)\}$/);
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
function parseRow(rowStr, dictionary) {
    const cells = [];
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
        if (char === '|' && !inQuote) {
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
function applyReviver(value, reviver, key, depth) {
    if (depth > MAX_RECURSION_DEPTH) {
        throw new GoonDecodeError(`Maximum recursion depth (${MAX_RECURSION_DEPTH}) exceeded in reviver`);
    }
    if (Array.isArray(value)) {
        const arr = value.map((item, i) => applyReviver(item, reviver, String(i), depth + 1));
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
