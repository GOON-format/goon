# Improving LLM data format accuracy without model training

The key to boosting GOON's aggregation accuracy from 92.5% to 95%+ lies not in better compression but in **eliminating the need for LLMs to resolve references entirely**. Research reveals that dictionary-based approaches ($0, $1) fail because LLMs process numbers digit-by-digit and have fundamentally weak second-hop reasoning—meaning even perfect lookup can't rescue aggregation tasks that require holding resolved values in working memory. The most promising path forward combines positional encoding (where structure implies meaning), inline redundancy (explicit counts LLMs can verify), and format patterns that make aggregation targets visually obvious.

## Why reference-based compression destroys aggregation accuracy

The 60% accuracy drop with dictionary references is predictable based on how transformer architectures process numerical data. Recent research by Levy & Geva (2024) demonstrates that LLMs represent numbers **digit-by-digit in base 10**, achieving 91-92% accuracy on digit reconstruction but essentially 0% on direct numeric value classification. This explains why aggregation errors appear "scattered" (e.g., 833 misread as 633 or 823) rather than following arithmetic logic.

Multi-hop reasoning research from ACL 2024 confirms the second critical limitation: while LLMs show strong evidence of first-hop reasoning (>80%), second-hop performance is moderate at best and shows **no improvement with model scale**. Dictionary references demand exactly this: hop 1 (resolve $0 to "Engineering") then hop 2 (use "Engineering" in a count). The weak second hop explains why lookup accuracy stays high (single-hop) while aggregation collapses (multi-hop plus arithmetic).

Attention mechanisms compound the problem for counting tasks. Unlike extraction where specific tokens matter most, aggregation requires **equal attention to all items**—something attention wasn't designed for. Studies show LLM counting performance degrades with list length and exhibits extreme sensitivity to trivial formatting changes. The architecture fundamentally lacks built-in capability to maintain accurate counts during sequential processing.

## Positional encoding outperforms reference-based compression

The most significant finding comes from TOON format benchmarks: a positional encoding approach actually **improves** LLM accuracy to 73.9% (vs JSON's 69.7%) while simultaneously reducing tokens by 30-60%. This challenges the assumption that there's an inherent accuracy-efficiency tradeoff.

TOON's core insight is declaring structure once then streaming values where **position itself becomes the reference**:

```
// JSON: 47 tokens, repeated keys create noise
[{"id":1,"name":"Alice","role":"admin"},{"id":2,"name":"Bob","role":"user"}]

// TOON-style: 23 tokens, position implies field
users[2]{id,name,role}:
1,Alice,admin
2,Bob,user
```

GOON already uses this pattern. The improvement opportunity lies in strengthening how position conveys meaning while adding verification redundancy. When LLMs encounter `users[2]{id,name,role}:`, they receive explicit signals about both array length and field order. The `[2]` count enables self-verification during aggregation—a form of redundancy that actually helps rather than wastes tokens.

For deeply nested data where GOON's tabular approach struggles, the research suggests a hybrid: flatten paths using dot notation (`data.users.metadata.count=42`) rather than requiring LLMs to navigate JSON hierarchy. This preserves explicitness while compressing structure.

## Inline techniques that compress without indirection

Several compression patterns work without lookup tables because they're **self-describing inline**:

**Run-length encoding with explicit syntax** replaces repeated values using universally understood notation. Instead of `null,null,null,null,null`, write `null×5` or `_×5` using GOON's compact null. The multiplication sign communicates meaning instantly without requiring dictionary lookup. For repeated structured data: `role:admin×47,user×203,guest×12` encodes 262 records in one line. LLMs parse this naturally because the pattern (value × count) is widespread in mathematics and programming.

**Delta encoding for numeric sequences** represents differences inline: `[100,+2,+3,+5,+5]` instead of `[100,102,105,110,115]`. The leading value establishes baseline; subsequent values use explicit `+` or `-` prefixes. This achieves compression for time-series, sequential IDs, and incrementing data while keeping every value computable from visible context. No backward scanning required.

**Default value declarations** eliminate repetition at the schema level: `users[1000]{id,name,role=user,active=T}:` specifies that `role` defaults to "user" and `active` to true unless overridden. Individual rows only include non-default values. This compresses without references because the default is declared upfront and never requires resolution—the LLM holds one static fact rather than maintaining a lookup table.

**Range notation** collapses sequential integers: `ids:1..50` instead of listing all 50 values. Combined with filtering syntax: `status[1..20]:active, status[21..50]:pending` describes 50 items in one line while remaining completely explicit about what each ID maps to.

## Tokenizer-specific optimizations for o200k_base

Beyond format design, character-level choices impact efficiency. The o200k_base tokenizer handles different patterns with measurable token cost differences:

**Delimiters**: Tab characters tokenize as single tokens and rarely appear in data, making them ideal separators. Pipes (`|`) also single-token efficiently. Commas work but require escaping when data contains them. The TOON benchmarks found tab-delimited variants most efficient.

**Structural markers**: Every brace, bracket, and quote costs one token. GOON's approach of using indentation-based nesting (like Python) instead of JSON braces saves two tokens per nested object. For arrays, `[n]` syntax costs 3-4 tokens but provides verification value that may improve accuracy enough to justify the cost.

**Numbers**: Plain integers tokenize efficiently; scientific notation splits into more tokens. Avoid leading zeros and unnecessary decimal precision. For booleans, GOON's T/F/_ literals are optimal—each single character is one token versus `true` (1-2 tokens) or `"true"` (3 tokens with quotes).

**Strings**: Unquoted strings save 2 tokens per value. Quote only when structurally necessary: values containing delimiters, leading/trailing whitespace, or literals that could be misinterpreted. Unicode and emoji work fine unquoted.

**Case matters**: Lowercase generally tokenizes more efficiently than uppercase due to training data distribution. `ADMIN` may split where `admin` doesn't.

## Format features that specifically improve aggregation

Aggregation accuracy improves with format patterns that make quantity explicit and verifiable:

**Explicit count headers** like `users[42]:` tell the LLM exactly how many items to expect. Research shows this helps validation and prevents hallucinated items. The count creates a verification checkpoint: if an LLM miscounts, the declared count provides ground truth to self-correct.

**Footer summaries** pre-compute aggregates: `---[n=42, sum=3450, avg=82.1]`. This seems counterintuitive—why have LLMs aggregate if we provide answers? But the footer serves as verification. For queries where the answer isn't pre-computed, the LLM has practiced the pattern of checking footer aggregates, improving attention to aggregate-relevant tokens.

**Row numbers for enumeration**: Adding explicit `1. 2. 3.` prefixes makes counting trivial—the LLM just reads the last number. For summation, the enumeration creates visual anchors that help track which values have been processed.

**Vertical alignment** in numeric columns aids pattern recognition. When all numbers in a column align to the same position, attention mechanisms more reliably identify them as related quantities to aggregate. The visual "column" creates implicit grouping.

**Grouping related items adjacently** reduces working memory load. If aggregating department totals, format all Engineering entries together before Sales entries. This lets the LLM complete one subtotal before context shifts.

## Cross-domain patterns worth adopting

Several formats from other domains offer applicable patterns:

**SQL result formatting** uses header-once structure with pipe separators and critically includes row count footers (`42 rows returned`). The footer pattern directly addresses aggregation verification.

**Logfmt** from structured logging achieves remarkable compactness: `id=1 name=Alice score=85` uses space-separated key=value pairs with minimal quoting. For flat records, this can be 35%+ more efficient than JSON while remaining human-readable. The format works because it eliminates structural characters (no braces, no commas within structure, quotes only when values contain spaces).

**Markdown tables** provide header row, separator line, then data rows—a three-part structure LLMs understand from training data. The separator (`|---|---|`) explicitly signals "header above, data below." For tabular data intended for aggregation, Markdown table format achieved **60.7% accuracy** in one benchmark versus 44.3% for CSV.

**Diff format prefix markers** (`+` for addition, `-` for deletion) demonstrate that single-character prefixes can convey record status efficiently. For data with status fields, consider: `+Alice (active)` vs `-Bob (inactive)` instead of separate status columns.

## Recommended implementation priorities

For GOON to reach 95%+ aggregation accuracy while improving token efficiency, implement in this order:

**Phase 1 - Verification redundancy** (highest accuracy impact): Add explicit count declarations `[n]` to all arrays and optional footer summaries for common aggregation targets. The token cost is minimal; the accuracy improvement from LLM self-verification is substantial.

**Phase 2 - Inline RLE** (compression without indirection): Implement `value×count` notation for repeated values. Start with simple cases (repeated nulls, repeated string values) before extending to complex patterns. This directly replaces the failed dictionary approach while maintaining explicitness.

**Phase 3 - Default values** (schema-level compression): Allow field defaults in headers `{field=default}`. This eliminates repetition without references—defaults are declared once and never resolved.

**Phase 4 - Delta encoding** (numeric sequence compression): For sequential numeric data, support `base,+d1,+d2` notation. Most effective for timestamps, sequential IDs, and incrementing counters.

**Phase 5 - Hybrid format selection** (query-aware optimization): Different query types have different optimal representations. Consider automatic format selection: tabular GOON for aggregation-heavy queries, compact GOON with more compression for extraction queries where references don't hurt accuracy.

The path to 95%+ accuracy requires accepting that aggregation demands format features JSON and compressed variants don't provide: explicit counts, verification opportunities, and complete elimination of indirection. The research strongly suggests that positional encoding combined with verification redundancy can simultaneously improve accuracy AND efficiency—the tradeoff assumed in GOON's original design may be a false dichotomy.