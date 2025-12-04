/**
 * Feature Impact Analysis
 * Measures token savings from individual GOON features
 */

// Import from local source for development
import { encode } from '../../packages/goon/src/index.js';
import { countTokens } from './tokenizer.js';
import { generateDatasets } from './datasets/index.js';
import type { Dataset, FeatureImpact } from './types.js';

export interface FeatureAnalysisOptions {
  datasets?: string[];
  verbose?: boolean;
}

export interface FeatureAnalysisReport {
  timestamp: string;
  impacts: FeatureImpact[];
  summary: {
    avgDictionarySavings: number;
    avgColumnRefsSavings: number;
    avgLiteralsSavings: number;
    avgTotalSavings: number;
    mostEffectiveFeature: string;
  };
}

/**
 * Analyze the impact of each GOON feature on token count
 */
export async function analyzeFeatures(
  options: FeatureAnalysisOptions = {}
): Promise<FeatureAnalysisReport> {
  const { verbose = false } = options;
  
  if (verbose) console.log('🔍 Analyzing feature impact...\n');
  
  const allDatasets = await generateDatasets();
  const datasets = options.datasets
    ? allDatasets.filter(d => options.datasets!.includes(d.slug))
    : allDatasets;

  const impacts: FeatureImpact[] = [];

  for (const dataset of datasets) {
    if (verbose) console.log(`📊 ${dataset.name}:`);
    
    const impact = analyzeDataset(dataset, verbose);
    impacts.push(impact);
    
    if (verbose) {
      console.log(`  Baseline:        ${impact.baseline} tokens`);
      console.log(`  + Dictionary:    ${impact.withDictionary} tokens (${formatPercent(impact.dictionarySavings)} savings)`);
      console.log(`  + Column Refs:   ${impact.withColumnRefs} tokens (${formatPercent(impact.columnRefsSavings)} savings)`);
      console.log(`  + Literals:      ${impact.withCompactLiterals} tokens (${formatPercent(impact.literalsSavings)} savings)`);
      console.log(`  All Features:    ${impact.withAll} tokens (${formatPercent(impact.totalSavings)} total savings)`);
      console.log();
    }
  }

  const summary = generateFeatureSummary(impacts);

  return {
    timestamp: new Date().toISOString(),
    impacts,
    summary,
  };
}

function analyzeDataset(dataset: Dataset, verbose: boolean): FeatureImpact {
  // Baseline: no GOON-specific features
  const baseline = countTokens(encode(dataset.data, {
    dictionary: false,
    columnRefs: false,
    runLength: false,
  }));

  // With dictionary only
  const withDictionary = countTokens(encode(dataset.data, {
    dictionary: true,
    columnRefs: false,
    runLength: false,
  }));

  // With column refs only
  const withColumnRefs = countTokens(encode(dataset.data, {
    dictionary: false,
    columnRefs: true,
    runLength: false,
  }));

  // With compact literals (always on, so we measure by comparing to a hypothetical without)
  // For now, we can't easily disable literals, so we estimate based on boolean/null counts
  const withCompactLiterals = baseline; // Literals are always compact in GOON

  // All features enabled
  const withAll = countTokens(encode(dataset.data));

  return {
    dataset: dataset.slug,
    baseline,
    withDictionary,
    withColumnRefs,
    withCompactLiterals,
    withAll,
    dictionarySavings: calculateSavings(baseline, withDictionary),
    columnRefsSavings: calculateSavings(baseline, withColumnRefs),
    literalsSavings: 0, // Hard to measure independently
    totalSavings: calculateSavings(baseline, withAll),
  };
}

function calculateSavings(baseline: number, withFeature: number): number {
  if (baseline === 0) return 0;
  return Math.round(((baseline - withFeature) / baseline) * 1000) / 10;
}

function formatPercent(value: number): string {
  return value >= 0 ? `${value.toFixed(1)}%` : `${value.toFixed(1)}%`;
}

function generateFeatureSummary(impacts: FeatureImpact[]): FeatureAnalysisReport['summary'] {
  const avgDictionarySavings = average(impacts.map(i => i.dictionarySavings));
  const avgColumnRefsSavings = average(impacts.map(i => i.columnRefsSavings));
  const avgLiteralsSavings = average(impacts.map(i => i.literalsSavings));
  const avgTotalSavings = average(impacts.map(i => i.totalSavings));

  // Determine most effective feature
  const featureAvgs = [
    { name: 'Dictionary', avg: avgDictionarySavings },
    { name: 'Column References', avg: avgColumnRefsSavings },
    { name: 'Compact Literals', avg: avgLiteralsSavings },
  ];
  const mostEffective = featureAvgs.sort((a, b) => b.avg - a.avg)[0];

  return {
    avgDictionarySavings: Math.round(avgDictionarySavings * 10) / 10,
    avgColumnRefsSavings: Math.round(avgColumnRefsSavings * 10) / 10,
    avgLiteralsSavings: Math.round(avgLiteralsSavings * 10) / 10,
    avgTotalSavings: Math.round(avgTotalSavings * 10) / 10,
    mostEffectiveFeature: mostEffective.name,
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

