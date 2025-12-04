# 🦍 GOON

**G**reatly **O**ptimized **O**bject **N**otation

> *"Edging the competition, one token at a time."*

A hyper-compact, LLM-optimized data serialization format for those who like to push limits. GOON takes TOON's innovations and edges them further – squeezing out every last token until your data is throbbing with efficiency.

[![npm version](https://img.shields.io/npm/v/@goon-format/goon.svg)](https://www.npmjs.com/package/@goon-format/goon)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/goon-format/goon/actions/workflows/ci.yml/badge.svg)](https://github.com/goon-format/goon/actions)

---

## 🤔 Why GOON?

JSON is bloated. TOON is decent. But we're not here for decent – **we're here to goon**.

GOON takes data serialization to the edge. We've been gooning on this format for weeks, edging closer to the theoretical minimum, and we're not stopping until we achieve peak efficiency.

| Feature | JSON | TOON | GOON |
|---------|------|------|------|
| Tabular arrays | ❌ | ✅ | ✅ |
| Compact booleans | ❌ | ❌ | ✅ `T`/`F` |
| Compact null | ❌ | ❌ | ✅ `_` |
| String deduplication | ❌ | ❌ | ✅ `$0`, `$1` |
| Column references | ❌ | ❌ | ✅ `^` |
| Mode presets | ❌ | ❌ | ✅ |
| Relentless optimization | ❌ | ❌ | ✅ |

---

## 📊 Benchmarks: The Edge

We've been edging TOON in benchmarks. After weeks of intense gooning sessions, here's where we stand:

### Token Efficiency

Tested with GPT-4o tokenizer (o200k_base) on 6 real-world datasets:

| Dataset | JSON | TOON | GOON | GOON vs JSON | Edging TOON |
|---------|------|------|------|--------------|-------------|
| Employees | 6,239 | 2,397 | 2,324 | **62.8%** | **3.0%** 💦 |
| Orders | 9,948 | 6,415 | 5,847 | **41.2%** | **8.9%** 💦 |
| Analytics | 4,432 | 1,806 | 1,744 | **60.6%** | **3.4%** 💦 |
| GitHub | 14,916 | 12,278 | 9,126 | **38.8%** | **25.7%** 🍆 |
| Events | 6,748 | 5,459 | 4,823 | **28.5%** | **11.7%** 💦 |
| Config | 776 | 576 | 514 | **33.8%** | **10.8%** 💦 |

**The Release:**
- **GOON vs JSON**: 37.9% savings (absolutely demolished)
- **GOON vs TOON**: 3.1% savings (a satisfying edge)
- **GOON beats TOON** on ALL 6 datasets 🦍

### LLM Accuracy: The Climax

We're not just efficient – we're *accurate*. GPT-4o-mini understands our format better than TOON:

| Format | Accuracy | Avg Tokens | Efficiency Score |
|--------|----------|------------|------------------|
| JSON | 80.8% | 7,177 | 11.3 |
| TOON | 86.8% | 4,822 | 18.0 |
| **GOON** | **92.5%** | **4,149** | **22.3** 🦍 |

**Peak Performance:**
- **92.5% accuracy** – LLMs love our format
- **24% more efficient** than TOON (accuracy per token)
- The best of both worlds: compact AND comprehensible

*Run `npm run benchmark:tokens` and `npm run benchmark:accuracy` to see for yourself.*

---

## 🚀 Quick Start: Begin Your Journey

### Installation

```bash
npm install @goon-format/goon
```

### Basic Usage

```typescript
import { encode, decode } from '@goon-format/goon';

const data = {
  users: [
    { id: 1, name: 'Alice', role: 'admin', active: true },
    { id: 2, name: 'Bob', role: 'user', active: true },
    { id: 3, name: 'Carol', role: 'admin', active: false },
  ]
};

// Just encode it – defaults to LLM mode for maximum pleasure
console.log(encode(data));
```

**Output:**
```
users[3]{id,name,role,active}:
1,Alice,admin,T
2,Bob,user,T
3,Carol,admin,F
```

Clean. Compact. *Chef's kiss*. 🦍

### Mode Presets: Choose Your Intensity

```typescript
// 🧠 LLM Mode (default) – Best accuracy, still edging JSON hard
encode(data);  // or encode(data, { mode: 'llm' })

// 🍆 Compact Mode – Maximum compression, full goon
encode(data, { mode: 'compact' });

// ⚖️ Balanced Mode – For those who like it readable
encode(data, { mode: 'balanced' });
```

| Mode | Intensity | Features |
|------|-----------|----------|
| `llm` | 🧠 Focused | No dictionary, no refs, peak clarity |
| `compact` | 🍆 Full Goon | Dictionary + refs + auto-sort |
| `balanced` | ⚖️ Edging | Dictionary + refs, readable formatting |

### CLI: For the Command Line Enjoyers

```bash
# Install globally
npm install -g @goon-format/cli

# Convert and feel the compression
echo '{"users":[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]}' | goon

# Compare formats and witness the edge
goon data.json --compare
```

---

## 🧠 Key Features: The Technique

### 1. Tabular Arrays

Arrays of objects become tight, compact tables:

```
users[3]{id,name,role}:
1,Alice,admin
2,Bob,user
3,Carol,admin
```

### 2. Single-Character Literals

Every character counts when you're gooning:

| GOON | Meaning | Tokens Saved |
|------|---------|--------------|
| `T` | `true` | 3 |
| `F` | `false` | 4 |
| `_` | `null` | 3 |
| `~` | `""` | 1 |

### 3. String Dictionary (Compact Mode)

For when you want to go full goon – repeated strings get indexed:

```
$:$0=admin,$1=user
users[3]{id,name,role}:
1,Alice,$0
2,Bob,$1
3,Carol,$0
```

### 4. Column References (Compact Mode)

The `^` means "same as above" – perfect for sorted data:

```
orders[4]{date,customer,product}:
2024-01,Acme,Widget
^,^,Gadget
^,Beta,Widget
2024-02,^,^
```

---

## 🛠️ API Reference

### `encode(value, options?)`

```typescript
encode(data, {
  // Mode preset (default: 'llm')
  mode: 'llm',           // 'llm' | 'compact' | 'balanced'
  
  // Fine-tune your goon:
  dictionary: false,     // String dictionary ($0, $1, ...)
  columnRefs: false,     // Column references (^)
  minimalIndent: true,   // Remove indent from table rows
  delimiter: ',',        // Cell delimiter
  
  // Callbacks
  replacer: (key, value) => value,
});
```

### `decode(input, options?)`

```typescript
decode(goonString, {
  reviver: (key, value) => value,
});
```

---

## 🆚 TOON Comparison: The Edging Report

| Aspect | TOON | GOON | Edge |
|--------|------|------|------|
| Token savings vs JSON | 36.5% | **37.9%** | +3.8% |
| LLM Accuracy | 86.8% | **92.5%** | +6.5% |
| Efficiency Score | 18.0 | **22.3** | +24% |
| Boolean tokens | `true`/`false` | `T`/`F` | Tighter |
| Default mode | None | `llm` | Smarter |
| Vibes | Respectable | **Unhinged** | 🦍 |

We're not just beating TOON – we're **edging** it. 3.8% might not sound like much, but when you're processing millions of tokens, that's serious savings. We've been gooning on this optimization for weeks.

---

## 🎯 When to GOON

✅ **Goon when:**
- Token costs are eating your budget
- You're pumping data into LLMs
- You want peak efficiency without sacrificing accuracy
- You appreciate a format that pushes limits

⚖️ **Consider alternatives when:**
- You need wide ecosystem support
- Your team can't handle the energy

❌ **Never goon when:**
- Actually, you should probably always goon

---

## 🔒 Security: Safe Gooning

We practice safe serialization:

| Protection | Description |
|------------|-------------|
| **Prototype Pollution** | Dangerous keys filtered out |
| **Recursion Limits** | 100 levels max |
| **Input Size Limits** | 10MB default |
| **RLE Limits** | 10,000 repeats max |

---

## ❓ FAQ

### Is this format serious?

The optimizations are 100% real. The vibes are 100% unhinged. Both can be true.

### Why is it called GOON?

**G**reatly **O**ptimized **O**bject **N**otation. Also, we've been gooning on this project for weeks and the name fits.

### Can LLMs understand GOON?

Yes! 92.5% accuracy with GPT-4o-mini. The format is clean and intuitive – LLMs goon on it.

### How do I explain this to my boss?

"It's a token-efficient data format." Leave out the gooning parts.

---

## 🤝 Contributing

We welcome fellow goons. See [CONTRIBUTING.md](./CONTRIBUTING.md).

```bash
git clone https://github.com/goon-format/goon
cd goon
npm install
npm test
```

---

## 📜 License

MIT License © 2024 GOON Format Contributors

---

<p align="center">
  <strong>🦍 GOON: Because your tokens deserve the edge.</strong>
</p>

<p align="center">
  <em>Inspired by <a href="https://github.com/toon-format/toon">TOON</a>. Optimized beyond reason. No regrets.</em>
</p>
