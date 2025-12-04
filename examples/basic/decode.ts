/**
 * Basic GOON Decoding Example
 * 
 * Run with: npx tsx examples/basic/decode.ts
 */

import { decode, GoonDecodeError } from '@goon-format/goon';

// Simple object
const simpleGoon = `
config:
  server:
    host: localhost
    port: 8080
  debug: T
`;

console.log('=== Simple Object ===');
console.log(JSON.stringify(decode(simpleGoon), null, 2));
console.log();

// Tabular array (LLM mode output - no dictionary)
const usersGoonLLM = `
users[4]{id,name,role,active}:
1,Alice,admin,T
2,Bob,admin,T
3,Carol,user,F
4,Dave,admin,T
`;

console.log('=== Users (LLM Mode - no dictionary) ===');
console.log(JSON.stringify(decode(usersGoonLLM), null, 2));
console.log();

// Tabular array with dictionary (compact mode output)
const usersGoonCompact = `
$:$0=admin,$1=user
users[4]{id,name,role,active}:
1,Alice,$0,T
2,Bob,$0,T
3,Carol,$1,F
4,Dave,$0,T
`;

console.log('=== Users (Compact Mode - with dictionary) ===');
console.log(JSON.stringify(decode(usersGoonCompact), null, 2));
console.log();

// Column references (compact mode)
const ordersGoon = `
orders[5]{date,customer,product,qty}:
2024-01,Acme,Widget,10
^,^,^,5
^,^,Gadget,3
2024-02,Beta,Widget,8
^,^,^,12
`;

console.log('=== Orders (with Column References) ===');
console.log(JSON.stringify(decode(ordersGoon), null, 2));
console.log();

// Mixed array
const mixedGoon = `
items[5]:
  - Hello
  - 42
  - T
  - _
  -
    nested: value
`;

console.log('=== Mixed Array ===');
console.log(JSON.stringify(decode(mixedGoon), null, 2));
console.log();

// Error handling
console.log('=== Error Handling ===');
const invalidGoon = `
users[2]{id,name}:
1,Alice
2,Bob,extra_column
`;

try {
  decode(invalidGoon);
} catch (e) {
  if (e instanceof GoonDecodeError) {
    console.log(`Caught GoonDecodeError:`);
    console.log(`  Message: ${e.message}`);
  }
}
console.log();

// With reviver function
const dataWithDates = `
events[2]{id,name,date}:
1,Launch,2024-01-15
2,Update,2024-03-20
`;

console.log('=== With Reviver (parse dates) ===');
const parsed = decode(dataWithDates, {
  reviver: (key, value) => {
    if (key === 'date' && typeof value === 'string') {
      return new Date(value);
    }
    return value;
  },
});
console.log(parsed);
console.log(`First event date: ${(parsed as any).events[0].date.toISOString()}`);
