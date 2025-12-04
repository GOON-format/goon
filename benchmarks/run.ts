/**
 * GOON Benchmarks - Compare GOON vs JSON (and approximate TOON)
 *
 * Run with: npx tsx benchmarks/run.ts
 */

// Import from source directly for benchmarking
import { encode, decode } from '../packages/goon/src/index.js';

interface BenchmarkResult {
  name: string;
  jsonSize: number;
  goonSize: number;
  toonApproxSize: number;
  goonSavings: string;
  toonApproxSavings: string;
  goonVsToon: string;
}

// Approximate TOON encoding (simplified for comparison)
function approximateToon(data: unknown): string {
  // This is a rough approximation of TOON format
  // Real TOON would be slightly different
  const json = JSON.stringify(data);
  const parsed = JSON.parse(json);

  if (typeof parsed !== 'object' || parsed === null) {
    return String(parsed);
  }

  const lines: string[] = [];
  encodeToonValue(parsed, 0, lines);
  return lines.join('\n');
}

function encodeToonValue(value: unknown, depth: number, lines: string[]): void {
  const indent = '  '.repeat(depth);

  if (value === null) {
    lines.push(`${indent}null`);
    return;
  }

  if (typeof value !== 'object') {
    lines.push(`${indent}${value}`);
    return;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      lines.push(`${indent}[]`);
      return;
    }

    // Check if tabular
    if (
      value.every(
        (item) =>
          typeof item === 'object' &&
          item !== null &&
          !Array.isArray(item)
      )
    ) {
      const firstKeys = Object.keys(value[0] as object);
      const isTabular = value.every((item) => {
        const keys = Object.keys(item as object);
        return (
          keys.length === firstKeys.length &&
          keys.every((k) => firstKeys.includes(k)) &&
          Object.values(item as object).every(
            (v) => v === null || typeof v !== 'object'
          )
        );
      });

      if (isTabular) {
        // TOON tabular format
        lines.push(`${indent}[${value.length}]{${firstKeys.join(',')}}:`);
        for (const item of value) {
          const row = firstKeys.map((k) => {
            const v = (item as Record<string, unknown>)[k];
            if (v === null) return 'null';
            if (typeof v === 'string') return v.includes(',') ? `"${v}"` : v;
            return String(v);
          });
          lines.push(`${indent}  ${row.join(',')}`);
        }
        return;
      }
    }

    // Simple array
    for (const item of value) {
      if (typeof item !== 'object' || item === null) {
        lines.push(`${indent}- ${item}`);
      } else {
        lines.push(`${indent}-`);
        encodeToonValue(item, depth + 1, lines);
      }
    }
    return;
  }

  // Object
  for (const [key, val] of Object.entries(value)) {
    if (val === null || typeof val !== 'object') {
      lines.push(`${indent}${key}: ${val}`);
    } else {
      lines.push(`${indent}${key}:`);
      encodeToonValue(val, depth + 1, lines);
    }
  }
}

function runBenchmark(name: string, data: unknown): BenchmarkResult {
  const json = JSON.stringify(data);
  const goon = encode(data as Parameters<typeof encode>[0]);
  const toonApprox = approximateToon(data);

  const jsonSize = json.length;
  const goonSize = goon.length;
  const toonApproxSize = toonApprox.length;

  const goonSavings = ((1 - goonSize / jsonSize) * 100).toFixed(1);
  const toonApproxSavings = ((1 - toonApproxSize / jsonSize) * 100).toFixed(1);
  const goonVsToon = ((1 - goonSize / toonApproxSize) * 100).toFixed(1);

  // Verify round-trip
  const decoded = decode(goon);
  const reencoded = JSON.stringify(decoded);
  if (reencoded !== json) {
    console.warn(`⚠️  Round-trip mismatch for ${name}`);
  }

  return {
    name,
    jsonSize,
    goonSize,
    toonApproxSize,
    goonSavings: `${goonSavings}%`,
    toonApproxSavings: `${toonApproxSavings}%`,
    goonVsToon: `${goonVsToon}%`,
  };
}

// Test datasets
const datasets: { name: string; data: unknown }[] = [
  {
    name: 'Simple Users (repeated roles)',
    data: {
      users: [
        { id: 1, name: 'Alice', role: 'admin', active: true },
        { id: 2, name: 'Bob', role: 'user', active: true },
        { id: 3, name: 'Carol', role: 'admin', active: false },
        { id: 4, name: 'Dave', role: 'user', active: true },
        { id: 5, name: 'Eve', role: 'moderator', active: true },
        { id: 6, name: 'Frank', role: 'user', active: false },
        { id: 7, name: 'Grace', role: 'admin', active: true },
        { id: 8, name: 'Henry', role: 'user', active: true },
      ],
    },
  },
  {
    name: 'Sorted Data (column refs shine)',
    data: {
      orders: [
        { date: '2024-01-15', customer: 'Acme Corp', product: 'Widget', qty: 100 },
        { date: '2024-01-15', customer: 'Acme Corp', product: 'Widget', qty: 50 },
        { date: '2024-01-15', customer: 'Acme Corp', product: 'Gadget', qty: 25 },
        { date: '2024-01-15', customer: 'Beta Inc', product: 'Gadget', qty: 75 },
        { date: '2024-01-16', customer: 'Beta Inc', product: 'Gadget', qty: 30 },
        { date: '2024-01-16', customer: 'Beta Inc', product: 'Widget', qty: 60 },
      ],
    },
  },
  {
    name: 'Boolean Heavy (T/F literals)',
    data: {
      features: [
        { name: 'auth', enabled: true, beta: false, premium: false },
        { name: 'api', enabled: true, beta: true, premium: false },
        { name: 'admin', enabled: true, beta: false, premium: true },
        { name: 'export', enabled: false, beta: false, premium: true },
        { name: 'import', enabled: true, beta: true, premium: true },
      ],
    },
  },
  {
    name: 'Nested Objects',
    data: {
      config: {
        server: {
          host: 'localhost',
          port: 8080,
          ssl: true,
        },
        database: {
          host: 'localhost',
          port: 5432,
          name: 'myapp',
        },
        cache: {
          enabled: true,
          ttl: 3600,
        },
      },
    },
  },
  {
    name: 'GitHub Repositories (realistic)',
    data: {
      repositories: [
        {
          id: 28457823,
          name: 'freeCodeCamp',
          org: 'freeCodeCamp',
          stars: 430886,
          forks: 42146,
          language: 'JavaScript',
        },
        {
          id: 132750724,
          name: 'build-your-own-x',
          org: 'codecrafters-io',
          stars: 430877,
          forks: 40453,
          language: 'Markdown',
        },
        {
          id: 21737465,
          name: 'awesome',
          org: 'sindresorhus',
          stars: 410052,
          forks: 32029,
          language: 'Markdown',
        },
      ],
    },
  },
  {
    name: 'Large Array (100 items)',
    data: {
      items: Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        category: ['Electronics', 'Books', 'Clothing', 'Home'][i % 4],
        price: Math.round((10 + i * 0.5) * 100) / 100,
        inStock: i % 3 !== 0,
      })),
    },
  },
];

console.log(`
🦍 GOON Benchmark Results
════════════════════════════════════════════════════════════════════════════════

Comparing GOON (Greatly Optimized Object Notation) against:
- JSON: Standard JavaScript Object Notation
- TOON: Token-Oriented Object Notation (approximate)

Key GOON Innovations:
- String dictionary for deduplication ($0, $1, etc.)
- Column references (^) for repeated values
- Single-char literals (T/F/_/~)
- Pipe delimiters for tables

════════════════════════════════════════════════════════════════════════════════
`);

const results: BenchmarkResult[] = [];

for (const { name, data } of datasets) {
  const result = runBenchmark(name, data);
  results.push(result);

  console.log(`📊 ${result.name}`);
  console.log(`   JSON: ${result.jsonSize} bytes`);
  console.log(`   TOON: ${result.toonApproxSize} bytes (${result.toonApproxSavings} vs JSON)`);
  console.log(`   GOON: ${result.goonSize} bytes (${result.goonSavings} vs JSON)`);
  console.log(`   GOON vs TOON: ${result.goonVsToon} additional savings`);
  console.log();
}

// Summary
const totalJson = results.reduce((sum, r) => sum + r.jsonSize, 0);
const totalGoon = results.reduce((sum, r) => sum + r.goonSize, 0);
const totalToon = results.reduce((sum, r) => sum + r.toonApproxSize, 0);

console.log(`════════════════════════════════════════════════════════════════════════════════`);
console.log(`📈 TOTALS`);
console.log(`   JSON: ${totalJson} bytes`);
console.log(`   TOON: ${totalToon} bytes (${((1 - totalToon / totalJson) * 100).toFixed(1)}% savings)`);
console.log(`   GOON: ${totalGoon} bytes (${((1 - totalGoon / totalJson) * 100).toFixed(1)}% savings)`);
console.log(`   GOON beats TOON by: ${((1 - totalGoon / totalToon) * 100).toFixed(1)}%`);
console.log(`════════════════════════════════════════════════════════════════════════════════`);

