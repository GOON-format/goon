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
 * 
 * ## Quick Reference: Efficiency vs Accuracy Trade-offs
 * 
 * | Option | Efficiency | Accuracy | Notes |
 * |--------|------------|----------|-------|
 * | dictionary | +15-25% | -10-20% | Confuses LLMs with $N references |
 * | columnRefs | +5-10% | -5-10% | ^ symbol requires tracking previous row |
 * | minimalIndent | +12% | neutral | Safe token savings |
 * | rowNumbers | -2-4% | +2-3% | Helps LLMs count rows |
 * | schemaDefaults | +3-5% | -3-5% | Empty cells can confuse LLMs |
 * | footerSummaries | -20-30% | ±2% | Mixed results, high token cost |
 * | arrayLengths | -1% | +2-3% | Explicit counts help aggregation |
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
   * 
   * **Trade-off:**
   * - ✅ EFFICIENCY: +15-25% token savings on repetitive data
   * - ❌ ACCURACY: -10-20% (LLMs struggle with multi-hop $N reference resolution)
   * 
   * @default true (but disabled in 'llm' mode)
   */
  dictionary?: boolean;

  /**
   * Enable column references (^) for repeated values in tabular arrays.
   * When a cell value equals the cell above it, ^ is used instead.
   * 
   * **Trade-off:**
   * - ✅ EFFICIENCY: +5-10% token savings on sorted/grouped data
   * - ❌ ACCURACY: -5-10% (LLMs must track previous row values)
   * 
   * @default true (but disabled in 'llm' mode)
   */
  columnRefs?: boolean;

  /**
   * Enable run-length encoding for consecutive identical values.
   * 
   * **Trade-off:**
   * - ✅ EFFICIENCY: Significant savings on repetitive sequences
   * - ⚠️ ACCURACY: Neutral for most cases
   * 
   * @default true
   */
  runLength?: boolean;

  /**
   * Minimum string length to include in dictionary.
   * Shorter strings are not worth the dictionary overhead.
   * 
   * @default 3
   */
  minDictLength?: number;

  /**
   * Minimum occurrences to include string in dictionary.
   * Strings appearing fewer times are not worth deduplicating.
   * 
   * @default 2
   */
  minDictOccurrences?: number;

  /**
   * Maximum number of dictionary entries.
   * Limiting entries improves LLM comprehension (fewer $N references to track).
   * Set to 0 for unlimited.
   * 
   * **Trade-off:**
   * - Lower = better accuracy (fewer references to track)
   * - Higher = better efficiency (more deduplication)
   * 
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
   * 
   * @default "  " (2 spaces)
   */
  indent?: string;

  /**
   * Auto-sort tabular arrays to maximize column reference efficiency.
   * Sorts by the column with most repeated values to group them together.
   * 
   * **Trade-off:**
   * - ✅ EFFICIENCY: +5-15% when combined with columnRefs
   * - ⚠️ NOTE: Changes the order of array elements!
   * 
   * @default false
   */
  autoSort?: boolean;

  /**
   * Delimiter for tabular array cells.
   * 
   * **Trade-off:**
   * - Comma (,): Most token-efficient
   * - Pipe (|): More visually distinct
   * - Tab (\t): Single token, good for data with commas
   * 
   * @default ","
   */
  delimiter?: ',' | '|' | '\t';

  /**
   * Maximum nesting depth for column references.
   * Column refs in deeply nested tables confuse LLMs.
   * 
   * **Trade-off:**
   * - 1 = Only top-level tables (best accuracy)
   * - -1 = Unlimited (best efficiency)
   * 
   * @default 1
   */
  maxColumnRefDepth?: number;

  /**
   * Maximum nesting depth for dictionary references.
   * Research shows LLMs struggle with $N references at depth 3+.
   * 
   * **Trade-off:**
   * - 2 = Shallow only (better accuracy)
   * - -1 = Unlimited (better efficiency)
   * 
   * @default 2
   */
  maxDictDepth?: number;

  /**
   * Include explicit array lengths in output (e.g., orders[50] vs orders[]).
   * 
   * **Trade-off:**
   * - ✅ ACCURACY: +2-3% (explicit counts help LLM aggregation)
   * - ❌ EFFICIENCY: -1% tokens
   * 
   * @default true
   */
  arrayLengths?: boolean;

  /**
   * Use tabular format for uniform object arrays.
   * When false, all arrays use list format with "-" markers.
   * 
   * **Trade-off:**
   * - true = More efficient (tabular is compact)
   * - false = Better for nested data accuracy
   * 
   * @default true
   */
  tabularArrays?: boolean;

  /**
   * Minimal mode - removes indent from tabular rows for maximum token efficiency.
   * Rows start at column 0.
   * 
   * **Trade-off:**
   * - ✅ EFFICIENCY: +12% token savings
   * - ⚠️ ACCURACY: Neutral (no impact on LLM comprehension)
   * 
   * @default false (but enabled in 'llm' mode)
   */
  minimalIndent?: boolean;

  /**
   * Enable schema defaults in tabular headers.
   * Common values become defaults: {id,name,role=user,active=T}
   * Missing values in rows use the default.
   * 
   * **Trade-off:**
   * - ✅ EFFICIENCY: +3-5% token savings (no repetition of common values)
   * - ❌ ACCURACY: -3-5% (empty cells can confuse LLMs)
   * 
   * @default false
   */
  schemaDefaults?: boolean;

  /**
   * Add footer summaries with pre-computed aggregates for arrays.
   * Format: ---[n=42,sum=3450,avg=82.1]
   * 
   * **Trade-off:**
   * - ❌ EFFICIENCY: -20-30% tokens (summaries are verbose)
   * - ⚠️ ACCURACY: ±2% (mixed results in testing)
   * 
   * @default false
   */
  footerSummaries?: boolean;

  /**
   * Add row numbers to tabular arrays for easier counting.
   * Format: 1. value1,value2
   * 
   * **Trade-off:**
   * - ❌ EFFICIENCY: -2-4% tokens (row prefixes add up)
   * - ✅ ACCURACY: +2-3% (LLMs can read the last number to count)
   * 
   * @default false
   */
  rowNumbers?: boolean;
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
