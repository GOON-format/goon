/**
 * Token Efficiency Benchmark Runner
 * Compares token counts across formats using o200k_base tokenizer
 */

import { countTokens, countTokensDetailed, TOKENIZER_MODEL } from './tokenizer.js';
import { generateDatasets } from './datasets/index.js';
import { getFormats } from './formats/index.js';
import type { Dataset, FormatConverter, TokenResult } from './types.js';

export interface TokenBenchmarkOptions {
  datasets?: string[];      // Specific dataset slugs to run (default: all)
  formats?: string[];       // Specific format names to run (default: all)
  verbose?: boolean;        // Print progress
}

export interface TokenBenchmarkReport {
  timestamp: string;
  tokenizer: string;
  results: TokenResult[];
  summary: {
    byFormat: Array<{
      format: string;
      avgTokens: number;
      avgBytes: number;
      avgSavingsVsJson: number;
      avgSavingsVsToon: number;
    }>;
    byDataset: Array<{
      dataset: string;
      bestFormat: string;
      bestTokens: number;
      worstFormat: string;
      worstTokens: number;
    }>;
    overall: {
      goonVsJson: number;
      goonVsToon: number;
      goonBeatsToon: boolean;
    };
  };
}

/**
 * Run token efficiency benchmarks
 */
export async function runTokenBenchmark(
  options: TokenBenchmarkOptions = {}
): Promise<TokenBenchmarkReport> {
  const { verbose = false } = options;
  
  if (verbose) console.log('🔄 Generating datasets...');
  const allDatasets = await generateDatasets();
  const datasets = options.datasets
    ? allDatasets.filter(d => options.datasets!.includes(d.slug))
    : allDatasets;

  const allFormats = getFormats();
  const formats = options.formats
    ? allFormats.filter(f => options.formats!.includes(f.name))
    : allFormats;

  const results: TokenResult[] = [];
  
  // Get JSON baseline tokens for each dataset
  const jsonBaseline = new Map<string, number>();
  const toonBaseline = new Map<string, number>();

  for (const dataset of datasets) {
    if (verbose) console.log(`\n📊 Processing ${dataset.name}...`);
    
    for (const format of formats) {
      // Skip CSV for nested datasets
      if (!format.supportsNested && dataset.structure !== 'uniform') {
        continue;
      }

      try {
        const encoded = format.encode(dataset.data);
        const { tokens, bytes } = countTokensDetailed(encoded);
        
        // Store baselines
        if (format.name === 'JSON') {
          jsonBaseline.set(dataset.slug, tokens);
        }
        if (format.name === 'TOON') {
          toonBaseline.set(dataset.slug, tokens);
        }
        
        results.push({
          dataset: dataset.slug,
          format: format.name,
          tokens,
          bytes,
          savingsVsJson: 0, // Will be calculated below
          savingsVsToon: 0, // Will be calculated below
        });

        if (verbose) {
          console.log(`  ${format.name}: ${tokens} tokens, ${bytes} bytes`);
        }
      } catch (error) {
        if (verbose) {
          console.warn(`  ⚠️ ${format.name}: Failed - ${error}`);
        }
      }
    }
  }

  // Calculate savings percentages
  for (const result of results) {
    const jsonTokens = jsonBaseline.get(result.dataset);
    const toonTokens = toonBaseline.get(result.dataset);
    
    if (jsonTokens) {
      result.savingsVsJson = ((jsonTokens - result.tokens) / jsonTokens) * 100;
    }
    if (toonTokens) {
      result.savingsVsToon = ((toonTokens - result.tokens) / toonTokens) * 100;
    }
  }

  // Generate summary
  const summary = generateSummary(results, datasets);

  return {
    timestamp: new Date().toISOString(),
    tokenizer: TOKENIZER_MODEL,
    results,
    summary,
  };
}

function generateSummary(
  results: TokenResult[],
  datasets: Dataset[]
): TokenBenchmarkReport['summary'] {
  // Group by format
  const byFormat = new Map<string, TokenResult[]>();
  for (const result of results) {
    const existing = byFormat.get(result.format) || [];
    existing.push(result);
    byFormat.set(result.format, existing);
  }

  const formatSummary = Array.from(byFormat.entries()).map(([format, formatResults]) => ({
    format,
    avgTokens: Math.round(formatResults.reduce((sum, r) => sum + r.tokens, 0) / formatResults.length),
    avgBytes: Math.round(formatResults.reduce((sum, r) => sum + r.bytes, 0) / formatResults.length),
    avgSavingsVsJson: Math.round(formatResults.reduce((sum, r) => sum + r.savingsVsJson, 0) / formatResults.length * 10) / 10,
    avgSavingsVsToon: Math.round(formatResults.reduce((sum, r) => sum + r.savingsVsToon, 0) / formatResults.length * 10) / 10,
  }));

  // Group by dataset
  const byDataset = new Map<string, TokenResult[]>();
  for (const result of results) {
    const existing = byDataset.get(result.dataset) || [];
    existing.push(result);
    byDataset.set(result.dataset, existing);
  }

  const datasetSummary = Array.from(byDataset.entries()).map(([dataset, datasetResults]) => {
    const sorted = [...datasetResults].sort((a, b) => a.tokens - b.tokens);
    return {
      dataset,
      bestFormat: sorted[0]?.format || 'N/A',
      bestTokens: sorted[0]?.tokens || 0,
      worstFormat: sorted[sorted.length - 1]?.format || 'N/A',
      worstTokens: sorted[sorted.length - 1]?.tokens || 0,
    };
  });

  // Calculate overall GOON vs JSON/TOON
  const goonResults = results.filter(r => r.format === 'GOON');
  const overallGoonVsJson = goonResults.length > 0
    ? Math.round(goonResults.reduce((sum, r) => sum + r.savingsVsJson, 0) / goonResults.length * 10) / 10
    : 0;
  const overallGoonVsToon = goonResults.length > 0
    ? Math.round(goonResults.reduce((sum, r) => sum + r.savingsVsToon, 0) / goonResults.length * 10) / 10
    : 0;

  // Check if GOON beats TOON on all datasets
  const goonBeatsToon = goonResults.every(r => r.savingsVsToon >= 0);

  return {
    byFormat: formatSummary,
    byDataset: datasetSummary,
    overall: {
      goonVsJson: overallGoonVsJson,
      goonVsToon: overallGoonVsToon,
      goonBeatsToon,
    },
  };
}

/**
 * Compare a single piece of data across formats
 */
export function compareFormats(data: unknown): Array<{
  format: string;
  tokens: number;
  bytes: number;
  savingsVsJson: number;
}> {
  const formats = getFormats().filter(f => f.supportsNested);
  const results: Array<{ format: string; tokens: number; bytes: number; savingsVsJson: number }> = [];
  
  let jsonTokens = 0;
  
  for (const format of formats) {
    try {
      const encoded = format.encode(data);
      const { tokens, bytes } = countTokensDetailed(encoded);
      
      if (format.name === 'JSON') {
        jsonTokens = tokens;
      }
      
      results.push({ format: format.name, tokens, bytes, savingsVsJson: 0 });
    } catch {
      // Skip failed formats
    }
  }
  
  // Calculate savings
  for (const result of results) {
    if (jsonTokens > 0) {
      result.savingsVsJson = Math.round(((jsonTokens - result.tokens) / jsonTokens) * 1000) / 10;
    }
  }
  
  return results.sort((a, b) => a.tokens - b.tokens);
}

