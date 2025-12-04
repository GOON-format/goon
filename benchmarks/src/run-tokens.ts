#!/usr/bin/env node
/**
 * Token Efficiency Benchmark CLI Runner
 * Usage: npm run benchmark:tokens
 */

import { runTokenBenchmark } from './token-efficiency.js';
import { generateMarkdownReport } from './generate-report.js';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🦍 GOON Token Efficiency Benchmark');
  console.log('═'.repeat(60));
  console.log();

  try {
    const report = await runTokenBenchmark({ verbose: true });
    
    console.log('\n' + '═'.repeat(60));
    console.log('📈 SUMMARY');
    console.log('═'.repeat(60));
    
    // Print format comparison table
    console.log('\nBy Format:');
    console.log('┌─────────────────┬──────────┬─────────────┬─────────────┐');
    console.log('│ Format          │ Avg Tok  │ vs JSON     │ vs TOON     │');
    console.log('├─────────────────┼──────────┼─────────────┼─────────────┤');
    
    for (const fmt of report.summary.byFormat) {
      const vsJson = fmt.avgSavingsVsJson >= 0 
        ? `${fmt.avgSavingsVsJson.toFixed(1)}%`.padStart(10)
        : `${fmt.avgSavingsVsJson.toFixed(1)}%`.padStart(10);
      const vsToon = fmt.avgSavingsVsToon >= 0
        ? `${fmt.avgSavingsVsToon.toFixed(1)}%`.padStart(10)
        : `${fmt.avgSavingsVsToon.toFixed(1)}%`.padStart(10);
      
      console.log(`│ ${fmt.format.padEnd(15)} │ ${String(fmt.avgTokens).padStart(8)} │ ${vsJson} │ ${vsToon} │`);
    }
    console.log('└─────────────────┴──────────┴─────────────┴─────────────┘');

    // Print overall results
    console.log('\n🎯 Overall Results:');
    console.log(`  GOON vs JSON: ${report.summary.overall.goonVsJson.toFixed(1)}% savings`);
    console.log(`  GOON vs TOON: ${report.summary.overall.goonVsToon.toFixed(1)}% savings`);
    console.log(`  GOON beats TOON on all datasets: ${report.summary.overall.goonBeatsToon ? '✅ YES' : '❌ NO'}`);

    // Generate and save markdown report
    const markdown = generateMarkdownReport(report);
    const outputPath = path.join(process.cwd(), 'benchmarks/results/token-efficiency.md');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, markdown);
    console.log(`\n📄 Report saved to: ${outputPath}`);

  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
    process.exit(1);
  }
}

main();

