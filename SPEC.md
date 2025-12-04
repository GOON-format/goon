# GOON Specification v1.0.0

**GOON** = **G**reatly **O**ptimized **O**bject **N**otation

A hyper-compact, LLM-optimized data format that builds upon TOON with additional token-saving techniques.

## Design Philosophy

GOON takes TOON's innovations and cranks them to 11:

1. **Every character counts** - No decorative syntax
2. **Exploit redundancy** - Repeated values should cost nothing
3. **Schema-aware compression** - Headers define structure, rows contain only data
4. **Human-readable** - Still readable without tools (but tools help)
5. **LLM-friendly** - Mode presets optimize for language model comprehension

## Encoding Modes

GOON provides three encoding modes:

| Mode | Use Case | Features |
|------|----------|----------|
| `llm` | LLM prompts | No dictionary, no refs, minimal indent |
| `compact` | Storage/transfer | All compression features enabled |
| `balanced` | General use | Dictionary + refs with readable formatting |

## Key Innovations Over TOON

### 1. Single-Character Literals

| GOON | Meaning |
|------|---------|
| `T`  | true    |
| `F`  | false   |
| `_`  | null    |
| `~`  | empty string |

```goon
users[3]{id,active,verified,bio}:
1,T,F,~
2,F,_,Hello
3,T,T,World
```

### 2. String Dictionary (`$refs`) - Optional

Store repeated strings once at the document start, reference by index:

```goon
$:$0=admin,$1=user,$2=moderator
users[4]{id,name,role}:
1,Alice,$0
2,Bob,$1
3,Carol,$0
4,Dave,$2
```

**Savings**: Each repeated string costs 2 chars (`$N`) instead of full length.

**Note**: Disabled in `llm` mode for better LLM comprehension.

### 3. Column Reference (`^`) - Optional

When a cell equals the cell directly above it:

```goon
orders[4]{date,customer,product,qty}:
2024-01,Acme,Widget,5
^,^,Gadget,3
^,Beta,Widget,2
2024-02,^,^,7
```

**Savings**: Sorted/grouped data compresses dramatically.

**Note**: Disabled in `llm` mode for better LLM comprehension.

### 4. Comma Delimiter

Comma (`,`) is **14% more token-efficient** than pipe (`|`) in GPT-4o tokenization:

```goon
items[3]{id,name,price}:
1,Widget,9.99
2,Gadget,14.50
3,Gizmo,7.25
```

### 5. Explicit Array Length

Array count helps LLMs with aggregation tasks:

```goon
items[100]{id,name}:
1,Alpha
2,Beta
...
```

### 6. Run-Length Encoding

For repeated consecutive values in tabular array cells:

```goon
flags[8]{enabled}:
T*5
F*3
```

Expands to 8 rows: 5 × `{enabled: true}`, 3 × `{enabled: false}`.

### 7. Minimal Indent Mode

Removes indentation from table rows for maximum token efficiency:

```goon
employees[3]{id,name,dept}:
1,Alice,Engineering
2,Bob,Sales
3,Carol,Engineering
```

---

## Grammar (ABNF)

The complete ABNF grammar for GOON format.

### Core Rules

```abnf
; Document structure
document        = [dictionary LF] root-value

; Dictionary for string deduplication
dictionary      = "$:" dict-entries
dict-entries    = dict-entry *("," dict-entry)
dict-entry      = "$" 1*DIGIT "=" string-value

; Root value can be object, array, or primitive
root-value      = object / tabular-array / list-array / primitive

; Objects (YAML-style indentation)
object          = object-key [object-value] LF [INDENT object-body DEDENT]
object-body     = 1*object-field
object-field    = INDENT-MARK object-key [object-value] LF [INDENT object-body DEDENT]
object-key      = identifier / quoted-string
object-value    = ":" (primitive / inline-object)
inline-object   = "{" [inline-fields] "}"
inline-fields   = inline-field *("," inline-field)
inline-field    = object-key ":" value

; Tabular arrays (records with uniform schema)
tabular-array   = [array-name] array-length "{" column-list "}" ":" LF tabular-body
array-name      = identifier
array-length    = "[" [1*DIGIT] "]"
column-list     = column-name *("," column-name)
column-name     = identifier
tabular-body    = 1*tabular-row
tabular-row     = [INDENT-MARK] cell *("," cell) LF

; List arrays (mixed values)
list-array      = [array-name] "[]" [":" inline-list] LF [INDENT list-body DEDENT]
inline-list     = cell *("," cell)
list-body       = 1*list-item
list-item       = INDENT-MARK "-" [" " value] LF

; Cells in tabular arrays
cell            = cell-value [repeat-marker]
cell-value      = reference / literal / primitive-value / column-ref
reference       = "$" 1*DIGIT
literal         = "T" / "F" / "_" / "~"
column-ref      = "^"
repeat-marker   = "*" 1*DIGIT

; Primitive values
primitive       = string-value / number / boolean / null-literal
primitive-value = string-value / number
string-value    = quoted-string / unquoted-string
quoted-string   = DQUOTE *(escape-seq / safe-char) DQUOTE
unquoted-string = 1*(ALPHA / DIGIT / safe-punct) 
escape-seq      = "\" (DQUOTE / "\" / "n" / "r" / "t" / "b" / "f" / unicode-escape)
unicode-escape  = "u" 4HEXDIG
number          = ["-"] int [frac] [exp]
int             = "0" / (DIGIT1-9 *DIGIT)
frac            = "." 1*DIGIT
exp             = ("e" / "E") ["+" / "-"] 1*DIGIT
boolean         = "true" / "false"
null-literal    = "null"

; Identifiers and safe characters
identifier      = (ALPHA / "_") *(ALPHA / DIGIT / "_" / "-")
safe-char       = %x20-21 / %x23-5B / %x5D-10FFFF  ; exclude " and \
safe-punct      = "-" / "_" / "." / "@" / "/" / "+"
```

### Structural Rules

```abnf
; Whitespace and structure
LF              = %x0A                    ; Line feed
INDENT          = 2*WSP                   ; Two spaces per level
DEDENT          = *""                     ; Logical dedent
INDENT-MARK     = *WSP                    ; Current indentation
WSP             = SP / HTAB               ; Whitespace
SP              = %x20                    ; Space
HTAB            = %x09                    ; Tab
DQUOTE          = %x22                    ; "
ALPHA           = %x41-5A / %x61-7A       ; A-Z / a-z
DIGIT           = %x30-39                 ; 0-9
DIGIT1-9        = %x31-39                 ; 1-9
HEXDIG          = DIGIT / "A"-"F" / "a"-"f"
```

---

## Encoding Rules

### 1. Mode Selection

Choose encoding mode based on use case:

```typescript
encode(data, { mode: 'llm' });      // For LLM prompts
encode(data, { mode: 'compact' });  // For storage
encode(data, { mode: 'balanced' }); // Default
```

| Mode | dictionary | columnRefs | minimalIndent | autoSort |
|------|------------|------------|---------------|----------|
| `llm` | false | false | true | false |
| `compact` | true | true | true | true |
| `balanced` | true | true | false | false |

### 2. Dictionary Building (when enabled)

**When to use dictionary:**
- String value appears 2+ times in the document
- String length > 2 characters
- `dictionary: true` option

**Algorithm:**
1. Scan all string values in source data
2. Count occurrences of each string
3. Filter by minimum length and occurrence thresholds
4. Sort by savings (most beneficial first)
5. Assign indices ($0, $1, $2, ...)
6. Output dictionary line: `$:$0=string1,$1=string2,...`

**Example:**
```javascript
// Input
{ users: [{ role: "admin" }, { role: "admin" }, { role: "user" }] }

// Dictionary (if enabled)
$:$0=admin,$1=user

// Output with references
users[3]{role}:
$0
$0
$1
```

### 3. Tabular Array Detection

**When to use tabular format:**
- Array of objects with identical keys
- All objects have same key set in same order
- Array length > 0

**Header format:** `name[N]{key1,key2,key3}:`

**Row format:** `value1,value2,value3`

### 4. Column Reference (`^`) - when enabled

**When to emit `^`:**
- Cell value equals the cell directly above in the same column
- Not the first row of the tabular array
- `columnRefs: true` option

### 5. Run-Length Encoding (`*N`)

**When to use:**
- Same value repeated N consecutive times in a column
- N >= 2
- `runLength: true` option

**Format:** `value*count`

### 6. Literal Substitution

| JSON | GOON |
|------|------|
| `true` | `T` |
| `false` | `F` |
| `null` | `_` |
| `""` | `~` |

**Always applied** - no option to disable.

### 7. String Quoting

**Quote strings when they:**
- Contain `,` (delimiter)
- Contain `\n` or `\r` (newlines)
- Start with `$` (dictionary reference pattern)
- Start with `^` (column reference)
- Start with digit (number pattern)
- Equal `T`, `F`, `_`, `~` (literals)
- Contain `:` (key-value separator)
- Are empty (use `~` instead)

### 8. Indentation

Default mode:
- Use 2 spaces per nesting level
- Tabular array rows are indented

Minimal mode (`minimalIndent: true`):
- Tabular array rows start at column 0
- Saves ~12% tokens

---

## Decoding Rules

### 1. Parse Dictionary

If document starts with `$:`, parse dictionary entries:

```
$:$0=admin,$1=user,$2=moderator
```

Creates mapping: `$0` → "admin", `$1` → "user", `$2` → "moderator"

### 2. Resolve Dictionary References

Replace all `$N` with dictionary entry at index N.

**Error handling:**
- `$N` where N >= dictionary length: throw `GoonDecodeError`
- `$` followed by non-digit: treat as literal string

### 3. Resolve Column References

For each `^` in tabular array:
1. Look up value from same column in previous row
2. If first row contains `^`: throw `GoonDecodeError`
3. Replace `^` with resolved value

### 4. Expand Run-Length Encoding

For cells containing `*N`:
1. Parse value before `*`
2. Parse count N after `*`
3. Repeat the value N times
4. Each repeat creates a new row/object

**Limits:**
- Max repeat count: 10,000 (configurable via `MAX_REPEAT_COUNT`)
- Exceeding limit: throw `GoonDecodeError`

### 5. Convert Literals

| GOON | JavaScript |
|------|------------|
| `T` | `true` |
| `F` | `false` |
| `_` | `null` |
| `~` | `""` |

### 6. Parse Numbers

Standard JSON number parsing:
- Integer: `42`, `-17`
- Float: `3.14`, `-0.5`
- Scientific: `1.5e10`, `2E-3`

### 7. Parse Strings

**Quoted strings:** Standard JSON string parsing with escape sequences
**Unquoted strings:** Read until delimiter (`,`, newline, `:`)

---

## Conformance Requirements

### Level 1: Minimal Conformance

A GOON implementation MUST:
1. Correctly parse and produce valid GOON syntax
2. Support literal substitution (T/F/_/~)
3. Support tabular array syntax
4. Achieve 100% round-trip fidelity for all JSON-compatible values

### Level 2: Standard Conformance

A GOON implementation SHOULD:
1. Support string dictionary encoding/decoding
2. Support column references (^)
3. Support run-length encoding (*N)
4. Support nested objects with indentation
5. Support mode presets (llm, compact, balanced)

### Level 3: Full Conformance

A GOON implementation MAY:
1. Support streaming encode/decode
2. Support custom delimiters (`,`, `|`, `\t`)
3. Support replacer/reviver functions
4. Implement security limits (recursion, input size, RLE expansion)

### Security Requirements

Implementations MUST:
1. Reject `__proto__`, `constructor`, `prototype` as object keys
2. Limit recursion depth (recommend: 100 levels)
3. Limit input size (recommend: 10MB)
4. Limit RLE expansion (recommend: 10,000 repeats)

Implementations SHOULD:
1. Use `Object.create(null)` for decoded objects
2. Provide typed error classes with line numbers
3. Validate dictionary references are in bounds

---

## Comparison

| Feature | JSON | TOON | GOON |
|---------|------|------|------|
| String deduplication | ❌ | ❌ | ✅ (optional) |
| Column references | ❌ | ❌ | ✅ (optional) |
| Run-length encoding | ❌ | ❌ | ✅ |
| Tabular arrays | ❌ | ✅ | ✅ |
| Compact booleans | ❌ | ❌ | ✅ |
| Mode presets | ❌ | ❌ | ✅ |
| Human-readable | ✅ | ✅ | ✅ |

---

## Media Type

`application/goon`

## File Extension

`.goon`

## License

MIT License

---

## References

- [TOON Specification](https://github.com/toon-format/toon)
- [JSON Specification (RFC 8259)](https://datatracker.ietf.org/doc/html/rfc8259)
- [YAML Specification](https://yaml.org/spec/)
