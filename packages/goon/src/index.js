/**
 * GOON - Greatly Optimized Object Notation
 *
 * A hyper-compact, LLM-optimized data format that builds upon TOON
 * with string deduplication, column references, and run-length encoding.
 *
 * @example
 * ```ts
 * import { encode, decode } from '@goon-format/goon';
 *
 * const data = {
 *   users: [
 *     { id: 1, name: 'Alice', role: 'admin' },
 *     { id: 2, name: 'Bob', role: 'user' },
 *     { id: 3, name: 'Carol', role: 'admin' },
 *   ]
 * };
 *
 * const goon = encode(data);
 * // $:admin,user
 * // users{id|name|role}
 * //   1|Alice|$0
 * //   2|Bob|$1
 * //   3|Carol|$0
 *
 * const restored = decode(goon);
 * ```
 *
 * @packageDocumentation
 */
// Main API
export { encode, encodeLines, GoonEncodeError } from './encode.js';
export { decode, decodeFromLines, GoonDecodeError } from './decode.js';
// Constants (useful for configuration)
export { MAX_REPEAT_COUNT, MAX_RECURSION_DEPTH, MAX_INPUT_SIZE, } from './utils.js';
