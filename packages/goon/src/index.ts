/**
 * GOON - Greatly Optimized Object Notation
 *
 * A hyper-compact, LLM-optimized data format that builds upon TOON
 * with mode presets, compact literals, and optional compression features.
 *
 * @example
 * ```ts
 * import { encode, decode } from '@goon-format/goon';
 *
 * const data = {
 *   users: [
 *     { id: 1, name: 'Alice', role: 'admin', active: true },
 *     { id: 2, name: 'Bob', role: 'user', active: true },
 *     { id: 3, name: 'Carol', role: 'admin', active: false },
 *   ]
 * };
 *
 * // Use LLM mode for best accuracy with language models
 * const goon = encode(data, { mode: 'llm' });
 * // users[3]{id,name,role,active}:
 * // 1,Alice,admin,T
 * // 2,Bob,user,T
 * // 3,Carol,admin,F
 *
 * const restored = decode(goon);
 * ```
 *
 * @packageDocumentation
 */

// Main API
export { encode, encodeLines, GoonEncodeError } from './encode.js';
export { decode, decodeFromLines, GoonDecodeError } from './decode.js';

// Types
export type {
  GoonValue,
  EncodeMode,
  EncodeOptions,
  DecodeOptions,
  Dictionary,
  TabularArray,
} from './types.js';

// Constants (useful for configuration)
export {
  MAX_REPEAT_COUNT,
  MAX_RECURSION_DEPTH,
  MAX_INPUT_SIZE,
} from './utils.js';
