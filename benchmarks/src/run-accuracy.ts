#!/usr/bin/env node
/**
 * LLM Accuracy Benchmark CLI Runner
 * Usage: npm run benchmark:accuracy
 *        npm run benchmark:accuracy -- --dry-run
 */

import 'dotenv/config';
import { runAccuracyBenchmark } from './accuracy.js';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = !args.includes('--quiet');

  console.log('🧠 GOON LLM Accuracy Benchmark');
  console.log('═'.repeat(60));
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No API calls will be made\n');
  } else if (!process.env.OPENAI_API_KEY) {
    console.log('❌ OPENAI_API_KEY not set');
    console.log('   Run with --dry-run to test without API calls\n');
    process.exit(1);
  }

  try {
    const report = await runAccuracyBenchmark({
      verbose,
      dryRun,
      model: 'gpt-4o-mini',
    });

    console.log('\n' + '═'.repeat(60));
    console.log('📈 SUMMARY');
    console.log('═'.repeat(60));

    // Print format comparison
    console.log('\nBy Format:');
    console.log('┌─────────────────┬──────────┬──────────┬────────────┐');
    console.log('│ Format          │ Accuracy │ Tokens   │ Efficiency │');
    console.log('├─────────────────┼──────────┼──────────┼────────────┤');

    for (const fmt of report.summary.byFormat) {
      console.log(`│ ${fmt.format.padEnd(15)} │ ${fmt.avgAccuracy.toFixed(1).padStart(6)}% │ ${String(fmt.avgTokens).padStart(8)} │ ${fmt.efficiencyScore.toFixed(1).padStart(10)} │`);
    }
    console.log('└─────────────────┴──────────┴──────────┴────────────┘');

    // Overall results
    console.log('\n🎯 Overall Results:');
    console.log(`  GOON Accuracy: ${report.summary.overall.goonAccuracy.toFixed(1)}%`);
    console.log(`  GOON Efficiency: ${report.summary.overall.goonEfficiency.toFixed(1)}`);
    console.log(`  TOON Accuracy: ${report.summary.overall.toonAccuracy.toFixed(1)}%`);
    console.log(`  TOON Efficiency: ${report.summary.overall.toonEfficiency.toFixed(1)}`);
    console.log(`  Comparison: ${report.summary.overall.goonVsToon}`);

    // Save report
    const outputPath = path.join(process.cwd(), 'benchmarks/results/accuracy.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${outputPath}`);

  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
    process.exit(1);
  }
}

main();

