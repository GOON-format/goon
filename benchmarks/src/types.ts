/**
 * Core types for GOON benchmarks
 */

// ============================================================================
// Dataset Types
// ============================================================================

export type DatasetStructure = 
  | 'uniform'       // All records have identical shape (e.g., employees)
  | 'nested'        // Records contain nested objects/arrays (e.g., orders)
  | 'semi-uniform'  // Most records similar with some variation (e.g., logs)
  | 'deeply-nested' // Multiple levels of nesting (e.g., config)
  | 'time-series';  // Sequential data with timestamps (e.g., analytics)

export interface Question {
  id: string;
  text: string;
  type: 'lookup' | 'aggregation' | 'filter' | 'structure';
  expectedAnswer: string | number | boolean | string[];
  tolerance?: number; // For numeric answers (default: 0.05 = 5%)
}

export interface Dataset {
  name: string;
  slug: string;
  description: string;
  structure: DatasetStructure;
  recordCount: number;
  data: unknown;
  questions: Question[];
  expectedGoonAdvantage: string;
}

// ============================================================================
// Format Converter Types
// ============================================================================

export interface FormatConverter {
  name: string;
  extension: string;
  encode(data: unknown): string;
  decode(text: string): unknown;
  supportsNested: boolean;
}

// ============================================================================
// Benchmark Result Types
// ============================================================================

export interface TokenResult {
  dataset: string;
  format: string;
  tokens: number;
  bytes: number;
  savingsVsJson: number;
  savingsVsToon: number;
}

export interface AccuracyResult {
  dataset: string;
  format: string;
  model: string;
  questionsTotal: number;
  questionsCorrect: number;
  accuracy: number;
  tokensUsed: number;
  efficiencyScore: number;
  errors: string[];
}

export interface FeatureImpact {
  dataset: string;
  baseline: number;
  withDictionary: number;
  withColumnRefs: number;
  withCompactLiterals: number;
  withAll: number;
  dictionarySavings: number;
  columnRefsSavings: number;
  literalsSavings: number;
  totalSavings: number;
}

export interface BenchmarkReport {
  timestamp: string;
  tokenizer: string;
  tokenizerModel: string;
  datasets: string[];
  tokenResults: TokenResult[];
  featureImpact: FeatureImpact[];
  accuracyResults?: AccuracyResult[];
  summary: {
    avgSavingsVsJson: number;
    avgSavingsVsToon: number;
    avgAccuracy?: number;
    avgEfficiency?: number;
  };
}

