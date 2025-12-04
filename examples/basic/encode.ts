/**
 * Basic GOON Encoding Example
 * 
 * Run with: npx tsx examples/basic/encode.ts
 */

import { encode } from '@goon-format/goon';

// Simple object
const config = {
  server: {
    host: 'localhost',
    port: 8080,
  },
  debug: true,
  version: '1.0.0',
};

console.log('=== Simple Object ===');
console.log(encode(config, { mode: 'llm' }));
console.log();

// Array of users
const users = {
  users: [
    { id: 1, name: 'Alice', role: 'admin', active: true },
    { id: 2, name: 'Bob', role: 'admin', active: true },
    { id: 3, name: 'Carol', role: 'user', active: false },
    { id: 4, name: 'Dave', role: 'admin', active: true },
  ],
};

// LLM mode - best for sending to GPT/Claude
console.log('=== LLM Mode (recommended for LLM prompts) ===');
console.log(encode(users, { mode: 'llm' }));
console.log();

// Compact mode - maximum compression
console.log('=== Compact Mode (maximum compression) ===');
console.log(encode(users, { mode: 'compact' }));
console.log();

// Balanced mode - default, readable with some compression
console.log('=== Balanced Mode (default) ===');
console.log(encode(users, { mode: 'balanced' }));
console.log();

// Sorted data demonstrates column references in compact mode
const sortedOrders = {
  orders: [
    { date: '2024-01', customer: 'Acme', product: 'Widget', qty: 10 },
    { date: '2024-01', customer: 'Acme', product: 'Widget', qty: 5 },
    { date: '2024-01', customer: 'Acme', product: 'Gadget', qty: 3 },
    { date: '2024-02', customer: 'Beta', product: 'Widget', qty: 8 },
    { date: '2024-02', customer: 'Beta', product: 'Widget', qty: 12 },
  ],
};

console.log('=== Sorted Orders (Compact Mode with Column References) ===');
console.log(encode(sortedOrders, { mode: 'compact' }));
console.log();

// Using replacer function
const sensitiveData = {
  user: {
    name: 'Alice',
    email: 'alice@example.com',
    password: 'secret123',
    apiKey: 'sk-xxx',
  },
};

console.log('=== With Replacer (filtering sensitive fields) ===');
console.log(
  encode(sensitiveData, {
    mode: 'llm',
    replacer: (key, value) => {
      if (key === 'password' || key === 'apiKey') {
        return undefined; // Omit these fields
      }
      return value;
    },
  })
);
