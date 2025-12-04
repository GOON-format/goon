# LLM Integration Guide

This guide covers best practices for using GOON with Large Language Models (LLMs) like GPT-4, Claude, and Gemini.

## Why GOON for LLMs?

LLMs are billed per token, and context windows have limits. GOON reduces token count by 35-60% vs JSON, meaning:

- **Lower costs**: Fewer tokens = lower API bills
- **More context**: Fit more data in the context window
- **Faster responses**: Less to process = faster generation

## Quick Start

### Use LLM Mode

GOON provides a dedicated `llm` mode optimized for language model comprehension:

```typescript
import { encode } from '@goon-format/goon';

const data = {
  users: [
    { id: 1, name: 'Alice', role: 'admin', active: true },
    { id: 2, name: 'Bob', role: 'admin', active: true },
    { id: 3, name: 'Carol', role: 'user', active: false },
  ]
};

// Use LLM mode for best accuracy
const goonData = encode(data, { mode: 'llm' });
```

**Output:**
```
users[3]{id,name,role,active}:
1,Alice,admin,T
2,Bob,admin,T
3,Carol,user,F
```

LLM mode:
- Disables dictionary references (`$0`, `$1`) that can confuse models
- Disables column references (`^`) for clearer data
- Uses minimal whitespace for token efficiency
- Keeps explicit values for better comprehension

### System Prompt

A brief format explanation helps, but isn't strictly necessary:

```
You will receive data in GOON format.
- T/F = true/false
- _ = null
- ~ = empty string
- Data in tables: name[count]{columns}: then rows
```

### Full Example with OpenAI

```typescript
import { encode } from '@goon-format/goon';
import OpenAI from 'openai';

const client = new OpenAI();

const data = {
  employees: [
    { id: 1, name: 'Alice', dept: 'Engineering', salary: 95000 },
    { id: 2, name: 'Bob', dept: 'Sales', salary: 82000 },
    { id: 3, name: 'Carol', dept: 'Engineering', salary: 98000 },
  ]
};

// Encode with LLM mode for best accuracy
const goonData = encode(data, { mode: 'llm' });

const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    {
      role: 'system',
      content: `You analyze employee data in GOON format.
T/F = true/false, _ = null, ~ = empty string.
Tables show: name[count]{columns}: then comma-separated rows.`
    },
    {
      role: 'user',
      content: `What is the average salary in Engineering?\n\n${goonData}`
    }
  ]
});

console.log(response.choices[0].message.content);
// "The average salary in Engineering is $96,500."
```

## Best Practices

### 1. Always Use LLM Mode for Prompts

```typescript
// ✅ Good - LLM mode is optimized for accuracy
encode(data, { mode: 'llm' });

// ❌ Avoid - compact mode can confuse LLMs
encode(data, { mode: 'compact' });
```

### 2. Keep Format Explanation Simple

LLMs understand GOON quickly with minimal explanation:

```
Data is in GOON format:
- T/F = true/false
- _ = null  
- Tables: name[count]{col1,col2}: then rows
```

### 3. Validate LLM Output

When parsing LLM-generated GOON, handle errors gracefully:

```typescript
import { decode, GoonDecodeError } from '@goon-format/goon';

function parseGoonFromLLM(content: string) {
  try {
    return { data: decode(content), error: null };
  } catch (e) {
    if (e instanceof GoonDecodeError) {
      return { data: null, error: `Parse error: ${e.message}` };
    }
    return { data: null, error: 'Unknown error' };
  }
}
```

### 4. Embed in Code Blocks

For mixed content, use code blocks:

````markdown
Here's the user data:

```goon
users[3]{id,name,role}:
1,Alice,admin
2,Bob,user
3,Carol,admin
```

The admin users are Alice and Carol.
````

### 5. Check Token Savings

Use the CLI to verify savings:

```bash
goon data.json --compare
```

## Example: RAG with GOON

Retrieval-Augmented Generation with compact data:

```typescript
import { encode } from '@goon-format/goon';

// Retrieve relevant records
const records = await vectorStore.search(query, { limit: 100 });

// Encode compactly for LLM
const context = encode({ records }, { mode: 'llm' });

const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    {
      role: 'system',
      content: 'Answer using the provided data. Format: T/F=true/false, _=null.'
    },
    {
      role: 'user',
      content: `Data:\n${context}\n\nQuestion: ${query}`
    }
  ]
});
```

## Example: Structured Output

Ask LLMs to output GOON format:

```typescript
const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    {
      role: 'system',
      content: `Extract entities and output as GOON table:
entities[N]{type,name,confidence}:
type,name,0.95`
    },
    {
      role: 'user',
      content: 'Extract: "Apple CEO Tim Cook announced new MacBook Pro in Cupertino."'
    }
  ]
});

// Parse response
const { entities } = decode(response.choices[0].message.content);
```

## Token Savings Examples

| Data Type | JSON Tokens | GOON Tokens | Savings |
|-----------|-------------|-------------|---------|
| 100 user records | 6,239 | 2,324 | 63% |
| 50 orders (nested) | 9,948 | 5,847 | 41% |
| 75 log events | 6,748 | 4,823 | 29% |
| App config | 776 | 514 | 34% |

## Troubleshooting

### LLM Gives Wrong Answers

Try these steps:
1. Make sure you're using `mode: 'llm'`
2. Add a brief format explanation to the system prompt
3. For complex queries, use explicit column names in your question

### Parse Errors from LLM Output

LLMs may produce invalid GOON. Implement fallback:

```typescript
try {
  return decode(llmOutput);
} catch {
  // Fallback: try JSON
  try {
    return JSON.parse(llmOutput);
  } catch {
    throw new Error('Could not parse LLM output');
  }
}
```

## See Also

- [GOON Format Specification](../SPEC.md)
- [API Reference](../README.md#-api-reference)
- [Examples](../examples/)
