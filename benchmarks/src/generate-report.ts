/**
 * Markdown Report Generator for Benchmarks
 */

import type { TokenBenchmarkReport } from './token-efficiency.js';
import type { FeatureAnalysisReport } from './feature-analysis.js';

/**
 * Generate markdown report for token efficiency benchmarks
 */
export function generateMarkdownReport(report: TokenBenchmarkReport): string {
  const lines: string[] = [];
  
  lines.push('# Token Efficiency Benchmark Results');
  lines.push('');
  lines.push(`**Generated**: ${report.timestamp}`);
  lines.push(`**Tokenizer**: ${report.tokenizer} (o200k_base)`);
  lines.push('');
  
  // Summary section
  lines.push('## Summary');
  lines.push('');
  lines.push('### Overall Results');
  lines.push('');
  lines.push(`- **GOON vs JSON**: ${report.summary.overall.goonVsJson.toFixed(1)}% savings`);
  lines.push(`- **GOON vs TOON**: ${report.summary.overall.goonVsToon.toFixed(1)}% savings`);
  lines.push(`- **GOON beats TOON on all datasets**: ${report.summary.overall.goonBeatsToon ? '✅ Yes' : '❌ No'}`);
  lines.push('');
  
  // Format comparison table
  lines.push('### By Format');
  lines.push('');
  lines.push('| Format | Avg Tokens | Avg Bytes | vs JSON | vs TOON |');
  lines.push('|--------|------------|-----------|---------|---------|');
  
  for (const fmt of report.summary.byFormat) {
    const vsJson = fmt.avgSavingsVsJson >= 0 
      ? `**${fmt.avgSavingsVsJson.toFixed(1)}%**` 
      : `${fmt.avgSavingsVsJson.toFixed(1)}%`;
    const vsToon = fmt.avgSavingsVsToon >= 0 
      ? `**${fmt.avgSavingsVsToon.toFixed(1)}%**` 
      : `${fmt.avgSavingsVsToon.toFixed(1)}%`;
    
    const formatName = fmt.format === 'GOON' ? `**${fmt.format}**` : fmt.format;
    lines.push(`| ${formatName} | ${fmt.avgTokens.toLocaleString()} | ${fmt.avgBytes.toLocaleString()} | ${vsJson} | ${vsToon} |`);
  }
  lines.push('');
  
  // Dataset breakdown
  lines.push('### By Dataset');
  lines.push('');
  lines.push('| Dataset | Best Format | Best Tokens | Worst Format | Worst Tokens |');
  lines.push('|---------|-------------|-------------|--------------|--------------|');
  
  for (const ds of report.summary.byDataset) {
    lines.push(`| ${ds.dataset} | ${ds.bestFormat} | ${ds.bestTokens.toLocaleString()} | ${ds.worstFormat} | ${ds.worstTokens.toLocaleString()} |`);
  }
  lines.push('');
  
  // Detailed results
  lines.push('## Detailed Results');
  lines.push('');
  
  // Group by dataset
  const byDataset = new Map<string, typeof report.results>();
  for (const result of report.results) {
    const existing = byDataset.get(result.dataset) || [];
    existing.push(result);
    byDataset.set(result.dataset, existing);
  }
  
  for (const [dataset, results] of byDataset) {
    lines.push(`### ${dataset}`);
    lines.push('');
    lines.push('| Format | Tokens | Bytes | vs JSON | vs TOON |');
    lines.push('|--------|--------|-------|---------|---------|');
    
    const sorted = [...results].sort((a, b) => a.tokens - b.tokens);
    for (const r of sorted) {
      const vsJson = r.savingsVsJson >= 0 ? `${r.savingsVsJson.toFixed(1)}%` : `${r.savingsVsJson.toFixed(1)}%`;
      const vsToon = r.savingsVsToon >= 0 ? `${r.savingsVsToon.toFixed(1)}%` : `${r.savingsVsToon.toFixed(1)}%`;
      const formatName = r.format === 'GOON' ? `**${r.format}**` : r.format;
      lines.push(`| ${formatName} | ${r.tokens.toLocaleString()} | ${r.bytes.toLocaleString()} | ${vsJson} | ${vsToon} |`);
    }
    lines.push('');
  }
  
  // Methodology
  lines.push('## Methodology');
  lines.push('');
  lines.push('- **Tokenizer**: GPT-4o tokenizer (o200k_base encoding)');
  lines.push('- **Datasets**: 6 benchmark datasets covering uniform, nested, time-series, real-world, and config structures');
  lines.push('- **Comparison**: Savings calculated as percentage reduction from baseline (JSON or TOON)');
  lines.push('- **Reproducibility**: Run `npm run benchmark:tokens` to regenerate');
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Generate markdown report for feature analysis
 */
export function generateFeatureReport(report: FeatureAnalysisReport): string {
  const lines: string[] = [];
  
  lines.push('# Feature Impact Analysis');
  lines.push('');
  lines.push(`**Generated**: ${report.timestamp}`);
  lines.push('');
  
  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Most Effective Feature**: ${report.summary.mostEffectiveFeature}`);
  lines.push(`- **Avg Dictionary Savings**: ${report.summary.avgDictionarySavings.toFixed(1)}%`);
  lines.push(`- **Avg Column Refs Savings**: ${report.summary.avgColumnRefsSavings.toFixed(1)}%`);
  lines.push(`- **Avg Total Savings**: ${report.summary.avgTotalSavings.toFixed(1)}%`);
  lines.push('');
  
  // Per-dataset breakdown
  lines.push('## By Dataset');
  lines.push('');
  lines.push('| Dataset | Baseline | + Dict | + ColRefs | All | Total Savings |');
  lines.push('|---------|----------|--------|-----------|-----|---------------|');
  
  for (const impact of report.impacts) {
    lines.push(`| ${impact.dataset} | ${impact.baseline} | ${impact.withDictionary} | ${impact.withColumnRefs} | ${impact.withAll} | ${impact.totalSavings.toFixed(1)}% |`);
  }
  lines.push('');
  
  return lines.join('\n');
}

