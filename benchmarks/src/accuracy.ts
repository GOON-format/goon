/**
 * LLM Accuracy Benchmark
 * Tests how well LLMs can answer questions from data in various formats
 */

import OpenAI from 'openai';
import { countTokens } from './tokenizer.js';
import { generateDatasets } from './datasets/index.js';
import { getFormats } from './formats/index.js';
import type { Dataset, Question, AccuracyResult, FormatConverter } from './types.js';

export interface AccuracyBenchmarkOptions {
  datasets?: string[];
  formats?: string[];
  model?: 'gpt-4o' | 'gpt-4o-mini';
  maxRetries?: number;
  retryDelayMs?: number;
  verbose?: boolean;
  dryRun?: boolean;
}

export interface AccuracyBenchmarkReport {
  timestamp: string;
  model: string;
  results: AccuracyResult[];
  summary: {
    byFormat: Array<{
      format: string;
      avgAccuracy: number;
      avgTokens: number;
      efficiencyScore: number;
    }>;
    overall: {
      goonAccuracy: number;
      goonEfficiency: number;
      toonAccuracy: number;
      toonEfficiency: number;
      goonVsToon: string;
    };
  };
}

const SYSTEM_PROMPT_JSON = `You are a data analysis assistant. Answer questions about the provided JSON data.

IMPORTANT: Give ONLY the answer, nothing else.
- For numbers: just the number (e.g., "42" or "1234.56")
- For yes/no: just "yes" or "no"  
- For names/values: just the value (e.g., "Engineering")
Do NOT include explanations or show your work.`;

const SYSTEM_PROMPT_TOON = `You are a data analysis assistant. Answer questions about data in TOON format.

TOON Format:
- Tabular arrays: name[count]{col1,col2}: followed by indented comma-separated rows
- Each row = values in column header order
- Nested objects use indentation with key:value pairs
- List items under arrays are indented

Example tabular:
users[2]{id,name,active}:
  1,Alice,true
  2,Bob,false
→ [{id:1, name:"Alice", active:true}, {id:2, name:"Bob", active:false}]

Example nested:
orders[2]:
  id: ORD-001
  total: 349.86
  ---
  id: ORD-002
  total: 509.79
→ Sum of totals = 859.65

IMPORTANT: Give ONLY the answer, nothing else.
- For numbers: just the number (e.g., "42" or "859.65")
- For yes/no: just "yes" or "no"
- For names: just the value
Do NOT explain or show work.`;

const SYSTEM_PROMPT_GOON = `You are a data analysis assistant. Answer questions about data in GOON format.

GOON Format:
- Tabular arrays: name[count]{col1,col2}: followed by indented comma-separated rows
- Each row = values in column header order
- Nested objects use indentation with key:value pairs
- List items under arrays marked with "-"
- T=true, F=false, _=null, ~=""

Example tabular:
users[2]{id,name,active}:
  1,Alice,T
  2,Bob,F
→ [{id:1, name:"Alice", active:true}, {id:2, name:"Bob", active:false}]

Example nested:
orders[2]:
  -
    id: ORD-001
    total: 349.86
  -
    id: ORD-002
    total: 509.79
→ Sum of totals = 859.65

IMPORTANT: Give ONLY the answer, nothing else.
- For numbers: just the number (e.g., "42" or "859.65")
- For yes/no: just "yes" or "no"
- For names: just the value
Do NOT explain or show work.`;

// Keep a copy of the detailed prompt for reference
const SYSTEM_PROMPT_GOON_DETAILED = `## HOW TO ANSWER

1. Replace $N with dictionary value at position N
2. Replace ^ with value from row above
3. Replace T→true, F→false
4. For nested data, carefully navigate to each item in lists

CRITICAL: Give ONLY the final answer.
- Numbers: just the number (e.g., "42" or "859.65")
- Yes/no: just "yes" or "no"
- Values: just the value
Do NOT explain or show steps.`;

// Select appropriate system prompt based on format
function getSystemPrompt(formatName: string): string {
  if (formatName === 'GOON') return SYSTEM_PROMPT_GOON;
  if (formatName === 'TOON') return SYSTEM_PROMPT_TOON;
  return SYSTEM_PROMPT_JSON;
}

/**
 * Run accuracy benchmarks
 */
export async function runAccuracyBenchmark(
  options: AccuracyBenchmarkOptions = {}
): Promise<AccuracyBenchmarkReport> {
  const {
    model = 'gpt-4o-mini',
    maxRetries = 3,
    retryDelayMs = 1000,
    verbose = false,
    dryRun = false,
  } = options;

  if (!process.env.OPENAI_API_KEY && !dryRun) {
    throw new Error('OPENAI_API_KEY environment variable required');
  }

  const client = dryRun ? null : new OpenAI();

  if (verbose) console.log('🧠 GOON Accuracy Benchmark');
  if (verbose) console.log(`Model: ${model}`);
  if (verbose) console.log(`Dry run: ${dryRun}\n`);

  const allDatasets = await generateDatasets();
  const datasets = options.datasets
    ? allDatasets.filter(d => options.datasets!.includes(d.slug))
    : allDatasets;

  const allFormats = getFormats();
  const formats = options.formats
    ? allFormats.filter(f => options.formats!.includes(f.name))
    : allFormats.filter(f => ['JSON', 'TOON', 'GOON'].includes(f.name));

  const results: AccuracyResult[] = [];

  for (const dataset of datasets) {
    if (verbose) console.log(`\n📊 Dataset: ${dataset.name}`);
    if (dataset.questions.length === 0) {
      if (verbose) console.log('  (no questions defined)');
      continue;
    }

    for (const format of formats) {
      if (!format.supportsNested && dataset.structure !== 'uniform') {
        continue;
      }

      try {
        const result = await benchmarkFormat(
          dataset,
          format,
          model,
          client,
          { maxRetries, retryDelayMs, verbose, dryRun }
        );
        results.push(result);

        if (verbose) {
          console.log(`  ${format.name}: ${result.accuracy.toFixed(1)}% accuracy, efficiency ${result.efficiencyScore.toFixed(1)}`);
        }
      } catch (error) {
        if (verbose) {
          console.log(`  ${format.name}: ERROR - ${error}`);
        }
      }
    }
  }

  const summary = generateAccuracySummary(results);

  return {
    timestamp: new Date().toISOString(),
    model,
    results,
    summary,
  };
}

async function benchmarkFormat(
  dataset: Dataset,
  format: FormatConverter,
  model: string,
  client: OpenAI | null,
  options: { maxRetries: number; retryDelayMs: number; verbose: boolean; dryRun: boolean }
): Promise<AccuracyResult> {
  const encoded = format.encode(dataset.data);
  const tokens = countTokens(encoded);
  
  let correct = 0;
  const errors: string[] = [];

  for (const question of dataset.questions) {
    const answer = await askQuestion(
      encoded,
      question,
      model,
      client,
      format.name,
      options
    );

    const isCorrect = validateAnswer(answer, question);
    if (isCorrect) correct++;
    else errors.push(`Q: ${question.text} | Expected: ${question.expectedAnswer} | Got: ${answer}`);
  }

  const accuracy = (correct / dataset.questions.length) * 100;
  const efficiencyScore = (accuracy / tokens) * 1000;

  return {
    dataset: dataset.slug,
    format: format.name,
    model,
    questionsTotal: dataset.questions.length,
    questionsCorrect: correct,
    accuracy,
    tokensUsed: tokens,
    efficiencyScore,
    errors,
  };
}

async function askQuestion(
  data: string,
  question: Question,
  model: string,
  client: OpenAI | null,
  formatName: string,
  options: { maxRetries: number; retryDelayMs: number; dryRun: boolean }
): Promise<string> {
  if (options.dryRun) {
    // Simulate answer in dry run mode
    return String(question.expectedAnswer);
  }

  let lastError: Error | null = null;
  const systemPrompt = getSystemPrompt(formatName);

  for (let attempt = 0; attempt < options.maxRetries; attempt++) {
    try {
      const response = await client!.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Data:\n${data}\n\nQuestion: ${question.text}` },
        ],
        max_tokens: 100,
        temperature: 0,
      });

      return response.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
      lastError = error as Error;
      if (attempt < options.maxRetries - 1) {
        await sleep(options.retryDelayMs * Math.pow(2, attempt));
      }
    }
  }

  throw lastError || new Error('Unknown error');
}

function validateAnswer(answer: string, question: Question): boolean {
  const expected = question.expectedAnswer;
  const normalizedAnswer = answer.toLowerCase().trim();

  // Handle array answers - check if all expected values appear
  if (Array.isArray(expected)) {
    return expected.every(e => normalizedAnswer.includes(String(e).toLowerCase()));
  }

  // Handle boolean answers - be flexible about format
  if (typeof expected === 'boolean') {
    const isYes = /(yes|true|enabled|t(?:\s|$|\b)|1(?:\s|$|\b))/i.test(normalizedAnswer);
    const isNo = /(no|false|disabled|f(?:\s|$|\b)|0(?:\s|$|\b))/i.test(normalizedAnswer);
    return expected ? isYes && !isNo : isNo && !isYes;
  }

  // Handle numeric answers - extract numbers from anywhere in the text
  if (typeof expected === 'number') {
    // Try to find the expected number (or close to it) anywhere in the answer
    const numberPattern = /-?\d+(?:\.\d+)?/g;
    const matches = normalizedAnswer.match(numberPattern);
    if (!matches) return false;
    
    const tolerance = question.tolerance ?? 0.05;
    // Check if any extracted number is close to expected
    for (const match of matches) {
      const num = parseFloat(match);
      if (!isNaN(num)) {
        const diff = Math.abs(num - expected) / Math.abs(expected || 1);
        if (diff <= tolerance) return true;
      }
    }
    return false;
  }

  // Handle string answers - check if expected appears anywhere
  return normalizedAnswer.includes(String(expected).toLowerCase());
}

function generateAccuracySummary(results: AccuracyResult[]): AccuracyBenchmarkReport['summary'] {
  const byFormat = new Map<string, AccuracyResult[]>();
  for (const result of results) {
    const existing = byFormat.get(result.format) || [];
    existing.push(result);
    byFormat.set(result.format, existing);
  }

  const formatSummary = Array.from(byFormat.entries()).map(([format, formatResults]) => {
    const avgAccuracy = average(formatResults.map(r => r.accuracy));
    const avgTokens = average(formatResults.map(r => r.tokensUsed));
    const efficiencyScore = (avgAccuracy / avgTokens) * 1000;
    
    return { format, avgAccuracy, avgTokens: Math.round(avgTokens), efficiencyScore };
  });

  // Get GOON and TOON results
  const goonResults = results.filter(r => r.format === 'GOON');
  const toonResults = results.filter(r => r.format === 'TOON');

  const goonAccuracy = goonResults.length > 0 ? average(goonResults.map(r => r.accuracy)) : 0;
  const toonAccuracy = toonResults.length > 0 ? average(toonResults.map(r => r.accuracy)) : 0;
  const goonEfficiency = goonResults.length > 0 ? average(goonResults.map(r => r.efficiencyScore)) : 0;
  const toonEfficiency = toonResults.length > 0 ? average(toonResults.map(r => r.efficiencyScore)) : 0;

  const comparison = goonEfficiency > toonEfficiency
    ? `GOON ${((goonEfficiency - toonEfficiency) / toonEfficiency * 100).toFixed(1)}% more efficient`
    : `TOON ${((toonEfficiency - goonEfficiency) / goonEfficiency * 100).toFixed(1)}% more efficient`;

  return {
    byFormat: formatSummary,
    overall: {
      goonAccuracy,
      goonEfficiency,
      toonAccuracy,
      toonEfficiency,
      goonVsToon: comparison,
    },
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

