/**
 * GOON + OpenAI Integration Example
 * 
 * Prerequisites:
 *   npm install openai
 *   export OPENAI_API_KEY=your-key
 * 
 * Run with: npx tsx examples/llm/openai.ts
 */

import { encode, decode, GoonDecodeError } from '@goon-format/goon';

// Check for OpenAI
let OpenAI: typeof import('openai').default;
try {
  OpenAI = (await import('openai')).default;
} catch {
  console.log('OpenAI SDK not installed. Run: npm install openai');
  console.log('\nThis example shows the code structure without making API calls.\n');
  showExampleCode();
  process.exit(0);
}

// Check for API key
if (!process.env.OPENAI_API_KEY) {
  console.log('OPENAI_API_KEY not set. Export it to run this example.');
  console.log('\nShowing example code structure instead:\n');
  showExampleCode();
  process.exit(0);
}

const client = new OpenAI();

// Example data
const salesData = {
  company: 'Acme Corp',
  quarter: 'Q4 2024',
  orders: [
    { id: 1, customer: 'Alpha Inc', product: 'Widget', qty: 100, total: 999.00, status: 'shipped' },
    { id: 2, customer: 'Beta LLC', product: 'Widget', qty: 50, total: 499.50, status: 'shipped' },
    { id: 3, customer: 'Gamma Co', product: 'Gadget', qty: 25, total: 374.75, status: 'pending' },
    { id: 4, customer: 'Alpha Inc', product: 'Gadget', qty: 75, total: 1124.25, status: 'shipped' },
    { id: 5, customer: 'Delta Corp', product: 'Widget', qty: 200, total: 1998.00, status: 'shipped' },
  ],
};

async function analyzeWithGoon() {
  console.log('=== GOON Format Data (LLM Mode) ===');
  // Use LLM mode for best accuracy with language models
  const goonData = encode(salesData, { mode: 'llm' });
  console.log(goonData);
  console.log();

  // Show token savings
  const jsonData = JSON.stringify(salesData, null, 2);
  console.log(`JSON size: ${jsonData.length} chars`);
  console.log(`GOON size: ${goonData.length} chars`);
  console.log(`Savings: ${((1 - goonData.length / jsonData.length) * 100).toFixed(1)}%`);
  console.log();

  console.log('=== Querying GPT-4o ===');
  
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You analyze sales data in GOON format.
GOON is a compact data format:
- T/F = true/false
- _ = null
- ~ = empty string
- Tables: name[count]{columns}: then comma-separated rows`,
      },
      {
        role: 'user',
        content: `Analyze this sales data and provide insights:\n\n${goonData}`,
      },
    ],
    max_tokens: 500,
  });

  console.log('GPT-4o Analysis:');
  console.log(response.choices[0].message.content);
  console.log();

  // Usage stats
  console.log('Token Usage:');
  console.log(`  Prompt: ${response.usage?.prompt_tokens}`);
  console.log(`  Completion: ${response.usage?.completion_tokens}`);
  console.log(`  Total: ${response.usage?.total_tokens}`);
}

async function generateWithGoon() {
  console.log('\n=== Generate GOON from GPT-4o ===');

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Output data in GOON format:
- Tables: name[count]{col1,col2,col3}: then rows
- Rows: comma-separated values
- T/F for booleans, _ for null`,
      },
      {
        role: 'user',
        content: 'Generate 5 product entries with: id, name, category, price, inStock (boolean)',
      },
    ],
    max_tokens: 300,
  });

  const goonOutput = response.choices[0].message.content || '';
  console.log('Generated GOON:');
  console.log(goonOutput);
  console.log();

  // Try to parse the generated GOON
  try {
    const parsed = decode(goonOutput);
    console.log('Parsed successfully:');
    console.log(JSON.stringify(parsed, null, 2));
  } catch (e) {
    if (e instanceof GoonDecodeError) {
      console.log(`Parse error: ${e.message}`);
      console.log('(LLMs may produce slightly invalid GOON - add validation in production)');
    }
  }
}

// Run examples
try {
  await analyzeWithGoon();
  await generateWithGoon();
} catch (error) {
  console.error('Error:', error);
}

function showExampleCode() {
  console.log(`
// Example code structure for GOON + OpenAI integration:

import { encode, decode } from '@goon-format/goon';
import OpenAI from 'openai';

const client = new OpenAI();

// 1. Encode your data in GOON format (LLM mode for best accuracy)
const data = {
  users: [
    { id: 1, name: 'Alice', role: 'admin', active: true },
    { id: 2, name: 'Bob', role: 'admin', active: true },
  ]
};
const goonData = encode(data, { mode: 'llm' });
// Output:
// users[2]{id,name,role,active}:
// 1,Alice,admin,T
// 2,Bob,admin,T

// 2. Send to OpenAI with brief format explanation
const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    {
      role: 'system',
      content: 'Data is in GOON format. T/F=true/false, _=null, ~=empty string.'
    },
    {
      role: 'user',
      content: \`Analyze:\\n\\n\${goonData}\`
    }
  ]
});

// 3. Optionally parse GOON output from LLM
try {
  const parsed = decode(llmOutput);
} catch (e) {
  // Handle parse errors gracefully
}
`);
}
