#!/usr/bin/env node

/**
 * GOON CLI - Greatly Optimized Object Notation
 *
 * Convert JSON to GOON and back, with comparison and validation
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { encode, decode, GoonDecodeError } from '@goon-format/goon';

// Optional: Use gpt-tokenizer if available for accurate token counts
let countTokensAccurate: ((text: string) => number) | null = null;
try {
  const { encode: tokenize } = await import('gpt-tokenizer/model/gpt-4o');
  countTokensAccurate = (text: string) => tokenize(text).length;
} catch {
  // gpt-tokenizer not available, will use approximate counting
}

const HELP = `
🦍 GOON CLI - Greatly Optimized Object Notation

Usage:
  goon [input...] [options]

Arguments:
  input              Input file(s) (JSON or GOON). Reads from stdin if omitted.
                     Supports glob patterns with --batch.

Options:
  -o, --output       Output file (or directory with --batch)
  -e, --encode       Force encode mode (JSON → GOON)
  -d, --decode       Force decode mode (GOON → JSON)
  --no-dict          Disable string dictionary
  --no-refs          Disable column references
  --stats            Show token statistics
  --compare          Compare format token counts (JSON, JSON Compact, TOON, GOON)
  --validate         Validate GOON file syntax
  --batch            Process multiple files (output must be directory)
  -h, --help         Show this help

Examples:
  # Convert JSON to GOON
  goon data.json -o data.goon

  # Convert GOON to JSON
  goon data.goon -o data.json

  # Pipe from stdin
  echo '{"users":[{"id":1,"name":"Alice"}]}' | goon

  # Show token savings
  goon data.json --stats

  # Compare formats
  goon data.json --compare

  # Validate GOON file
  goon data.goon --validate

  # Batch convert
  goon *.json --batch -o ./goon-files/

Website: https://github.com/goon-format/goon
`;

interface Options {
  inputs: string[];
  output?: string;
  encode?: boolean;
  decode?: boolean;
  dictionary: boolean;
  columnRefs: boolean;
  stats?: boolean;
  compare?: boolean;
  validate?: boolean;
  batch?: boolean;
  help?: boolean;
}

function parseArgs(args: string[]): Options {
  const opts: Options = {
    inputs: [],
    dictionary: true,
    columnRefs: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '-h':
      case '--help':
        opts.help = true;
        break;
      case '-o':
      case '--output':
        opts.output = args[++i];
        break;
      case '-e':
      case '--encode':
        opts.encode = true;
        break;
      case '-d':
      case '--decode':
        opts.decode = true;
        break;
      case '--no-dict':
        opts.dictionary = false;
        break;
      case '--no-refs':
        opts.columnRefs = false;
        break;
      case '--stats':
        opts.stats = true;
        break;
      case '--compare':
        opts.compare = true;
        break;
      case '--validate':
        opts.validate = true;
        break;
      case '--batch':
        opts.batch = true;
        break;
      default:
        if (!arg.startsWith('-')) {
          opts.inputs.push(arg);
        }
    }
  }

  return opts;
}

function detectMode(
  input: string,
  inputPath?: string
): 'encode' | 'decode' {
  // Check file extension
  if (inputPath) {
    if (inputPath.endsWith('.json')) return 'encode';
    if (inputPath.endsWith('.goon')) return 'decode';
  }

  // Try to detect from content
  const trimmed = input.trim();

  // JSON starts with { or [
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'encode';
  }

  // GOON with dictionary starts with $:
  if (trimmed.startsWith('$:')) {
    return 'decode';
  }

  // GOON tabular format has {fields} headers
  if (/^\w*\{[^}]+\}/.test(trimmed)) {
    return 'decode';
  }

  // Default to encode (assume JSON)
  return 'encode';
}

function countTokensApprox(text: string): number {
  // Rough approximation: split on whitespace and punctuation
  return text.split(/[\s,{}[\]:"|]+/).filter((t) => t.length > 0).length;
}

function countTokens(text: string): number {
  return countTokensAccurate ? countTokensAccurate(text) : countTokensApprox(text);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

/**
 * Compare format token counts
 */
function compareFormats(data: unknown): void {
  const json = JSON.stringify(data, null, 2);
  const jsonCompact = JSON.stringify(data);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const goon = encode(data as any);
  
  // Try TOON if available
  let toon: string | null = null;
  let toonTokens = 0;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { encode: toonEncode } = require('@toon-format/toon');
    toon = toonEncode(data) as string;
    toonTokens = countTokens(toon ?? '');
  } catch {
    // TOON not available
  }

  const jsonTokens = countTokens(json);
  const jsonCompactTokens = countTokens(jsonCompact);
  const goonTokens = countTokens(goon);

  console.log(`
🦍 Format Comparison
═══════════════════════════════════════════════════════════
Format           Tokens        Bytes       vs JSON    vs TOON
─────────────────────────────────────────────────────────────`);

  console.log(`JSON             ${String(jsonTokens).padStart(6)}   ${formatBytes(json.length).padStart(10)}      ---        ---`);
  
  const compactVsJson = ((jsonTokens - jsonCompactTokens) / jsonTokens) * 100;
  console.log(`JSON Compact     ${String(jsonCompactTokens).padStart(6)}   ${formatBytes(jsonCompact.length).padStart(10)}   ${formatPercent(compactVsJson).padStart(6)}      ---`);
  
  if (toon !== null) {
    const toonVsJson = ((jsonTokens - toonTokens) / jsonTokens) * 100;
    console.log(`TOON             ${String(toonTokens).padStart(6)}   ${formatBytes(toon.length).padStart(10)}   ${formatPercent(toonVsJson).padStart(6)}      ---`);
    
    const goonVsJson = ((jsonTokens - goonTokens) / jsonTokens) * 100;
    const goonVsToon = ((toonTokens - goonTokens) / toonTokens) * 100;
    console.log(`GOON             ${String(goonTokens).padStart(6)}   ${formatBytes(goon.length).padStart(10)}   ${formatPercent(goonVsJson).padStart(6)}   ${formatPercent(goonVsToon).padStart(6)}`);
  } else {
    const goonVsJson = ((jsonTokens - goonTokens) / jsonTokens) * 100;
    console.log(`GOON             ${String(goonTokens).padStart(6)}   ${formatBytes(goon.length).padStart(10)}   ${formatPercent(goonVsJson).padStart(6)}      N/A`);
  }
  
  console.log(`═══════════════════════════════════════════════════════════

🏆 Winner: GOON with ${countTokensAccurate ? 'accurate' : 'approximate'} token counting
`);
}

/**
 * Validate GOON syntax
 */
function validateGoon(input: string, filepath?: string): boolean {
  const location = filepath ? filepath : 'stdin';
  
  try {
    decode(input);
    console.log(`✅ ${location}: Valid GOON`);
    return true;
  } catch (error) {
    const err = error as Error;
    if (err instanceof GoonDecodeError) {
      console.error(`❌ ${location}: Invalid GOON`);
      console.error(`   Error: ${err.message}`);
      if (err.line !== undefined) {
        console.error(`   Line: ${err.line}`);
      }
    } else {
      console.error(`❌ ${location}: Error validating`);
      console.error(`   ${err.message || String(err)}`);
    }
    return false;
  }
}

/**
 * Process a single file
 */
function processFile(
  inputPath: string,
  opts: Options,
  outputDir?: string
): void {
  if (!existsSync(inputPath)) {
    console.error(`Error: File not found: ${inputPath}`);
    return;
  }

  const input = readFileSync(inputPath, 'utf-8');
  
  // Handle validation
  if (opts.validate) {
    validateGoon(input, inputPath);
    return;
  }

  // Handle comparison
  if (opts.compare) {
    console.log(`\n📁 ${inputPath}`);
    try {
      const data = JSON.parse(input);
      compareFormats(data);
    } catch {
      console.error(`Error: ${inputPath} is not valid JSON`);
    }
    return;
  }

  // Determine mode
  let mode: 'encode' | 'decode';
  if (opts.encode) {
    mode = 'encode';
  } else if (opts.decode) {
    mode = 'decode';
  } else {
    mode = detectMode(input, inputPath);
  }

  // Process
  let output: string;
  let newExt: string;

  if (mode === 'encode') {
    const data = JSON.parse(input);
    output = encode(data, {
      dictionary: opts.dictionary,
      columnRefs: opts.columnRefs,
    });
    newExt = '.goon';
  } else {
    const data = decode(input);
    output = JSON.stringify(data, null, 2);
    newExt = '.json';
  }

  // Determine output path
  let outputPath: string | undefined;
  if (outputDir) {
    const baseName = basename(inputPath, extname(inputPath));
    outputPath = join(outputDir, baseName + newExt);
  } else if (opts.output) {
    outputPath = opts.output;
  }

  // Write output
  if (outputPath) {
    writeFileSync(outputPath, output);
    console.log(`✓ ${inputPath} → ${outputPath}`);
  } else if (!opts.stats) {
    console.log(output);
  }

  // Show stats
  if (opts.stats) {
    const jsonSize = mode === 'encode' ? input.length : output.length;
    const goonSize = mode === 'encode' ? output.length : input.length;
    const jsonTokens = countTokens(mode === 'encode' ? input : output);
    const goonTokens = countTokens(mode === 'encode' ? output : input);
    const savings = ((1 - goonSize / jsonSize) * 100).toFixed(1);
    const tokenSavings = ((1 - goonTokens / jsonTokens) * 100).toFixed(1);

    console.error(`
🦍 ${basename(inputPath)} Statistics
─────────────────────────────
Format       Size         Tokens
JSON         ${formatBytes(jsonSize).padEnd(12)} ${jsonTokens}
GOON         ${formatBytes(goonSize).padEnd(12)} ${goonTokens}
─────────────────────────────
Size reduction: ${savings}%
Token reduction: ${tokenSavings}%
`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const opts = parseArgs(args);

  if (opts.help) {
    console.log(HELP);
    process.exit(0);
  }

  // Batch mode
  if (opts.batch) {
    if (opts.inputs.length === 0) {
      console.error('Error: --batch requires input files');
      process.exit(1);
    }

    const outputDir = opts.output;
    if (outputDir && !existsSync(outputDir)) {
      console.error(`Error: Output directory does not exist: ${outputDir}`);
      process.exit(1);
    }

    let validCount = 0;
    let invalidCount = 0;

    for (const inputPath of opts.inputs) {
      if (opts.validate) {
        const valid = validateGoon(readFileSync(inputPath, 'utf-8'), inputPath);
        if (valid) validCount++;
        else invalidCount++;
      } else {
        processFile(inputPath, opts, outputDir);
      }
    }

    if (opts.validate) {
      console.log(`\n📊 Validation Summary: ${validCount} valid, ${invalidCount} invalid`);
      process.exit(invalidCount > 0 ? 1 : 0);
    }
    return;
  }

  // Single file or stdin mode
  let input: string;
  let inputPath: string | undefined;

  if (opts.inputs.length > 0) {
    inputPath = opts.inputs[0];
    if (!existsSync(inputPath)) {
      console.error(`Error: File not found: ${inputPath}`);
      process.exit(1);
    }
    input = readFileSync(inputPath, 'utf-8');
  } else {
    // Read from stdin
    if (process.stdin.isTTY) {
      console.log(HELP);
      process.exit(0);
    }
    input = await readStdin();
  }

  // Handle validation
  if (opts.validate) {
    const valid = validateGoon(input, inputPath);
    process.exit(valid ? 0 : 1);
  }

  // Handle comparison
  if (opts.compare) {
    try {
      const data = JSON.parse(input);
      compareFormats(data);
    } catch {
      console.error('Error: Input is not valid JSON');
      process.exit(1);
    }
    return;
  }

  // Determine mode
  let mode: 'encode' | 'decode';
  if (opts.encode) {
    mode = 'encode';
  } else if (opts.decode) {
    mode = 'decode';
  } else {
    mode = detectMode(input, inputPath);
  }

  // Process
  let output: string;
  let jsonSize: number;
  let goonSize: number;

  if (mode === 'encode') {
    const data = JSON.parse(input);
    output = encode(data, {
      dictionary: opts.dictionary,
      columnRefs: opts.columnRefs,
    });
    jsonSize = input.length;
    goonSize = output.length;
  } else {
    const data = decode(input);
    output = JSON.stringify(data, null, 2);
    goonSize = input.length;
    jsonSize = output.length;
  }

  // Output
  if (opts.output) {
    writeFileSync(opts.output, output);
    console.error(`✓ Written to ${opts.output}`);
  } else if (!opts.stats) {
    console.log(output);
  }

  // Stats
  if (opts.stats) {
    const jsonTokens = countTokens(mode === 'encode' ? input : output);
    const goonTokens = countTokens(mode === 'encode' ? output : input);
    const savings = ((1 - goonSize / jsonSize) * 100).toFixed(1);
    const tokenSavings = ((1 - goonTokens / jsonTokens) * 100).toFixed(1);

    console.error(`
🦍 GOON Statistics
─────────────────────────────
Format       Size         Tokens
JSON         ${formatBytes(jsonSize).padEnd(12)} ${jsonTokens}
GOON         ${formatBytes(goonSize).padEnd(12)} ${goonTokens}
─────────────────────────────
Size reduction: ${savings}%
Token reduction: ${tokenSavings}%
`);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
