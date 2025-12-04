# Migrating from TOON to GOON

This guide helps you migrate from [TOON (Token-Oriented Object Notation)](https://github.com/toon-format/toon) to GOON.

## Why Migrate?

GOON builds on TOON's foundations while adding:

- **Mode Presets**: `llm`, `compact`, `balanced` for different use cases
- **Better LLM Accuracy**: 92.5% vs TOON's 86.8%
- **Compact Literals**: `T`/`F`/`_`/`~` instead of `true`/`false`/`null`/`""`
- **Optional Features**: String dictionary, column references, run-length encoding

## Syntax Comparison

### Booleans and Null

**TOON:**
```toon
user:
  active: true
  verified: false
  bio: null
```

**GOON:**
```goon
user:
  active: T
  verified: F
  bio: _
```

### Empty Strings

**TOON:**
```toon
user:
  name: Alice
  nickname: ""
```

**GOON:**
```goon
user:
  name: Alice
  nickname: ~
```

### Tabular Arrays

**TOON:**
```toon
users[3]{id,name,role}
  1,Alice,admin
  2,Bob,admin
  3,Carol,user
```

**GOON (with mode presets):**
```goon
# LLM mode - best for sending to GPT/Claude
users[3]{id,name,role}:
1,Alice,admin
2,Bob,admin
3,Carol,user

# Compact mode - maximum compression
$:$0=admin,$1=user
users[3]{id,name,role}:
1,Alice,$0
2,Bob,$0
3,Carol,$1
```

## Code Migration

### Package Replacement

```bash
# Remove TOON
npm uninstall @toon-format/toon

# Install GOON
npm install @goon-format/goon
```

### Import Changes

**Before:**
```typescript
import { encode, decode } from '@toon-format/toon';
```

**After:**
```typescript
import { encode, decode } from '@goon-format/goon';
```

### Using Mode Presets

GOON introduces mode presets for different use cases:

```typescript
import { encode } from '@goon-format/goon';

// For LLM prompts - best accuracy
const forLLM = encode(data, { mode: 'llm' });

// For storage/transfer - maximum compression
const forStorage = encode(data, { mode: 'compact' });

// For general use - balanced (default)
const general = encode(data, { mode: 'balanced' });
```

### API Compatibility

GOON's `encode()` and `decode()` are compatible with TOON:

```typescript
// Basic usage works the same
const encoded = encode(data);
const decoded = decode(encoded);
```

### New Options

GOON adds encoding options:

```typescript
encode(data, {
  // Mode preset (recommended)
  mode: 'llm',             // 'llm' | 'compact' | 'balanced'
  
  // Or fine-tune individually
  dictionary: false,       // String deduplication
  columnRefs: false,       // ^ references
  runLength: true,         // *N encoding
  minimalIndent: true,     // Remove row indentation
  delimiter: ',',          // Cell delimiter
});
```

### Error Handling

GOON provides typed errors:

```typescript
import { GoonEncodeError, GoonDecodeError } from '@goon-format/goon';

try {
  decode(input);
} catch (e) {
  if (e instanceof GoonDecodeError) {
    console.error(`Parse error: ${e.message}`);
  }
}
```

## Feature Comparison

| Feature | TOON | GOON | Notes |
|---------|------|------|-------|
| Tabular arrays | ✅ | ✅ | Same syntax |
| Nested objects | ✅ | ✅ | Same syntax |
| Simple arrays | ✅ | ✅ | Same syntax |
| Mixed arrays | ✅ | ✅ | Same syntax |
| Mode presets | ❌ | ✅ | `llm`, `compact`, `balanced` |
| Compact literals | ❌ | ✅ | `T`/`F`/`_`/`~` |
| String dictionary | ❌ | ✅ | Optional, disabled in LLM mode |
| Column references | ❌ | ✅ | Optional, disabled in LLM mode |

## Benchmark Comparison

| Metric | TOON | GOON |
|--------|------|------|
| Token savings vs JSON | 36.5% | **37.9%** |
| LLM Accuracy | 86.8% | **92.5%** |
| Efficiency Score | 18.0 | **22.3** |

## When to Stay with TOON

Consider staying with TOON if:

- You need browser support (GOON is Node.js only for now)
- Your tooling depends on TOON-specific features
- You're already integrated and don't need the extra features

## Gradual Migration

You can migrate gradually since the formats are similar:

```typescript
import { encode as goonEncode } from '@goon-format/goon';
import { encode as toonEncode } from '@toon-format/toon';

// Start with new code using GOON
const newData = goonEncode(data, { mode: 'llm' });

// Existing code can continue using TOON
const legacyData = toonEncode(oldData);
```

## Getting Help

- [GOON GitHub Issues](https://github.com/goon-format/goon/issues)
- [GOON Documentation](https://github.com/goon-format/goon#readme)
