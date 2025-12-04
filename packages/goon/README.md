# 🦍 GOON

**G**reatly **O**ptimized **O**bject **N**otation

> *"Edging the competition, one token at a time."*

A hyper-compact, LLM-optimized data serialization format. GOON achieves **37.9% token savings** vs JSON and **92.5% LLM accuracy** – beating TOON on both metrics.

## Installation

```bash
npm install @goon-format/goon
```

## Quick Start

```typescript
import { encode, decode } from '@goon-format/goon';

const data = {
  users: [
    { id: 1, name: 'Alice', role: 'admin', active: true },
    { id: 2, name: 'Bob', role: 'user', active: true },
    { id: 3, name: 'Carol', role: 'admin', active: false },
  ]
};

// Encode (defaults to LLM mode for best accuracy)
const goon = encode(data);
console.log(goon);
// users[3]{id,name,role,active}:
// 1,Alice,admin,T
// 2,Bob,user,T
// 3,Carol,admin,F

// Decode back to JavaScript
const restored = decode(goon);
```

## Mode Presets

```typescript
// 🧠 LLM Mode (default) - Best for sending to GPT/Claude
encode(data);  // or encode(data, { mode: 'llm' })

// 🍆 Compact Mode - Maximum compression
encode(data, { mode: 'compact' });

// ⚖️ Balanced Mode - Readable with compression
encode(data, { mode: 'balanced' });
```

## Key Features

- **Tabular Arrays**: Objects with same keys become CSV-like tables
- **Compact Literals**: `T`/`F`/`_`/`~` for true/false/null/empty
- **Mode Presets**: `llm`, `compact`, `balanced`
- **Optional Dictionary**: String deduplication with `$0`, `$1` refs
- **Optional Column Refs**: `^` means "same as above"

## Benchmarks

| Metric | JSON | TOON | GOON |
|--------|------|------|------|
| Token savings | - | 36.5% | **37.9%** |
| LLM Accuracy | 80.8% | 86.8% | **92.5%** |
| Efficiency Score | 11.3 | 18.0 | **22.3** |

## API

### `encode(value, options?)`

```typescript
encode(data, {
  mode: 'llm',           // 'llm' | 'compact' | 'balanced'
  dictionary: false,     // String deduplication
  columnRefs: false,     // ^ references
  minimalIndent: true,   // Remove row indentation
});
```

### `decode(input, options?)`

```typescript
decode(goonString, {
  reviver: (key, value) => value,
});
```

## Security

- Prototype pollution prevention
- Recursion depth limits (100 levels)
- Input size limits (10MB)
- RLE expansion limits (10,000)

## Links

- [GitHub](https://github.com/goon-format/goon)
- [Full Documentation](https://github.com/goon-format/goon#readme)
- [SPEC](https://github.com/goon-format/goon/blob/main/SPEC.md)

## License

MIT

