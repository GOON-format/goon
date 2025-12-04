/**
 * GOON Types - Greatly Optimized Object Notation
 * @module types
 */

/**
 * Any valid GOON/JSON value
 */
export type GoonValue =
  | string
  | number
  | boolean
  | null
  | GoonValue[]
  | { [key: string]: GoonValue };

/**
 * Encoding mode presets for common use cases.
 * 
 * - `llm`: Optimized for LLM accuracy. Disables dictionary and column refs
 *   which can confuse language models. Best for sending data to GPT, Claude, etc.
 * 
 * - `compact`: Maximum token efficiency. Enables all compression features
 *   including dictionary, column refs, and auto-sorting. Best for storage/transfer.
 * 
 * - `balanced`: Default settings. Good trade-off between readability and efficiency.
 *   Individual options can still override mode settings.
 */
export type EncodeMode = 'llm' | 'compact' | 'balanced';

/**
 * Options for encoding values to GOON format
 */
export interface EncodeOptions {
  /**
   * Encoding mode preset. Sets sensible defaults for common use cases.
   * Individual options below will override mode settings if specified.
   * 
   * - `llm`: Best for LLM prompts (disables confusing features) - DEFAULT
   * - `compact`: Max compression (enables all features)
   * - `balanced`: Trade-off between readability and compression
   * 
   * @default 'llm'
   */
  mode?: EncodeMode;
  /**
   * Enable string dictionary for deduplication.
   * Repeated strings are stored once and referenced by index ($0, $1, etc.)
   * @default true
   */
  dictionary?: boolean;

  /**
   * Enable column references (^) for repeated values in tabular arrays.
   * When a cell value equals the cell above it, ^ is used instead.
   * @default true
   */
  columnRefs?: boolean;

  /**
   * Enable run-length encoding for consecutive identical values.
   * @default true
   */
  runLength?: boolean;

  /**
   * Minimum string length to include in dictionary.
   * Shorter strings are not worth the dictionary overhead.
   * @default 3
   */
  minDictLength?: number;

  /**
   * Minimum occurrences to include string in dictionary.
   * Strings appearing fewer times are not worth deduplicating.
   * @default 2
   */
  minDictOccurrences?: number;

  /**
   * Maximum number of dictionary entries.
   * Limiting entries improves LLM comprehension (fewer $N references to track).
   * Set to 0 for unlimited.
   * @default 8
   */
  maxDictEntries?: number;

  /**
   * Replacer function, similar to JSON.stringify's replacer.
   * Called for each value with the key and value.
   * Return undefined to omit the value.
   */
  replacer?: (key: string, value: GoonValue) => GoonValue | undefined;

  /**
   * Indentation string used for nested structures.
   * @default "  " (2 spaces)
   */
  indent?: string;

  /**
   * Auto-sort tabular arrays to maximize column reference efficiency.
   * Sorts by the column with most repeated values to group them together.
   * Note: This changes the order of array elements.
   * @default false
   */
  autoSort?: boolean;

  /**
   * Delimiter for tabular array cells.
   * Comma is most token-efficient, pipe is more visually distinct.
   * @default ","
   */
  delimiter?: ',' | '|' | '\t';

  /**
   * Maximum nesting depth for column references.
   * Column refs in deeply nested tables confuse LLMs.
   * Set to 1 to only use refs in top-level tables, 0 to disable, -1 for unlimited.
   * @default 1
   */
  maxColumnRefDepth?: number;

  /**
   * Maximum nesting depth for dictionary references.
   * Research shows LLMs struggle with $N references at depth 3+.
   * Set to 2 to only use dictionary at depth ≤2, 0 to disable, -1 for unlimited.
   * @default 2
   */
  maxDictDepth?: number;

  /**
   * Include explicit array lengths in output (e.g., orders[50] vs orders[]).
   * Research shows explicit counts improve LLM accuracy on aggregation tasks.
   * @default true
   */
  arrayLengths?: boolean;

  /**
   * Use tabular format for uniform object arrays.
   * When false, all arrays use list format with "-" markers.
   * Disabling may improve LLM accuracy on nested data at cost of token efficiency.
   * @default true
   */
  tabularArrays?: boolean;

  /**
   * Minimal mode - removes indent from tabular rows for maximum token efficiency.
   * Rows start at column 0, reducing tokens by ~12%.
   * @default false
   */
  minimalIndent?: boolean;
}

/**
 * Options for decoding GOON format to values
 */
export interface DecodeOptions {
  /**
   * Reviver function, similar to JSON.parse's reviver.
   * Called for each value with the key and value.
   * The return value replaces the original value.
   */
  reviver?: (key: string, value: GoonValue) => GoonValue;
}

/**
 * String dictionary for deduplication
 */
export interface Dictionary {
  /** Ordered list of dictionary entries */
  entries: string[];
  /** Map from string to its dictionary reference (e.g., "$0") */
  lookup: Map<string, string>;
}

/**
 * Parsed tabular array structure
 */
export interface TabularArray {
  /** Column names */
  fields: string[];
  /** Row data as arrays of values */
  rows: GoonValue[][];
}
