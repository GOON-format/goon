# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.4] - 2024-12-05

### Added

- **Experimental accuracy features** (research-based):
  - `rowNumbers`: Add `1. 2. 3.` prefixes for easier counting (+2-3% accuracy, -2-4% tokens)
  - `schemaDefaults`: Schema-level defaults `{role=user}` (+3-5% tokens, mixed accuracy)
  - `footerSummaries`: Pre-computed aggregates `---[n=42,sum=3450]` (high token cost)
- **CLI `--mode` flag**: Choose `llm`, `compact`, or `balanced`
- **Detailed trade-off documentation** for all encoding options

### Changed

- **CLI now defaults to LLM mode** (was implicitly compact)
- All options now have efficiency/accuracy trade-off comments in types.ts

### Fixed

- CLI and library now have consistent defaults (both LLM mode)

## [1.0.3] - 2024-12-04

### Changed

- Updated benchmark documentation with latest results
- Token efficiency: 37.9% vs JSON, 3.1% vs TOON
- LLM accuracy: 92.5% (GOON) vs 90.1% (TOON)  
- Efficiency score: 7.9% better than TOON

## [1.0.2] - 2024-12-04

### Fixed

- **Decoder improvements**:
  - Fixed parsing of `key: value` format (with space after colon)
  - Fixed parsing of nested objects with trailing colons (`key:`)
  - Fixed parsing of tabular arrays with array length syntax (`key[N]{fields}:`)
  - Fixed minimal indent support (rows at same level as header)
- **Test suite improvements**:
  - Updated tests to match current LLM-optimized format
  - Fixed dictionary test threshold requirements
  - All 42 tests now pass

## [1.0.1] - 2024-12-04

### Added

- README files for npm packages (`@goon-format/goon`, `@goon-format/cli`)
- **Mode presets** for common use cases:
  - `llm`: Optimized for LLM accuracy (92.5% with GPT-4o-mini) - **DEFAULT**
  - `compact`: Maximum token compression
  - `balanced`: Trade-off between efficiency and readability
- **Minimal indent mode** (`minimalIndent: true`): 12% additional token savings
- **Comma delimiter default**: 14% more token-efficient than pipe
- **Auto-detect delimiter** on decode: Supports comma, pipe, and tab

### Changed

- Default mode is now `llm` for best accuracy out of the box
- Default delimiter changed from pipe (`|`) to comma (`,`)
- LLM mode disables dictionary and column references for improved accuracy
- Updated all documentation with "edging" terminology and gooning references

### Fixed

- CI workflow build order (build goon before cli)
- TypeScript type errors in CLI error handling

### Removed

- Experimental features that didn't improve accuracy

### Benchmark Results

| Dataset | GOON vs JSON | Edging TOON 🍆 |
|---------|--------------|----------------|
| Employees | 62.8% savings | **3.0% savings** |
| Orders | 41.2% savings | **8.9% savings** |
| Analytics | 60.6% savings | **3.4% savings** |
| GitHub | 38.8% savings | **25.7% savings** |
| Events | 28.5% savings | **11.7% savings** |
| Config | 33.8% savings | **10.8% savings** |

**Average: 37.9% savings vs JSON, 3.1% edging TOON**

**LLM Accuracy: 92.5%** (GOON) vs 90.1% (TOON) vs 89.2% (JSON)

**Efficiency Score: 7.9% better than TOON** (accuracy per token)

## [1.0.0] - 2024-12-04

### Added

#### Core Library (@goon-format/goon)
- `encode()` function to convert JavaScript objects to GOON format
- `decode()` function to parse GOON format back to JavaScript
- String dictionary (`$:`) for deduplicating repeated strings
- Column references (`^`) for repeated values in tabular arrays
- Single-character literals: `T` (true), `F` (false), `_` (null), `~` (empty string)
- Run-length encoding (`*N`) for repeated consecutive values
- Tabular array syntax with `{col1,col2}` headers
- Configurable encoding options:
  - `dictionary`: Enable/disable string dictionary
  - `columnRefs`: Enable/disable column references
  - `runLength`: Enable/disable run-length encoding
  - `replacer`: Filter/transform values like `JSON.stringify`
- Typed errors: `GoonEncodeError`, `GoonDecodeError`
- Security hardening:
  - Prototype pollution prevention
  - Recursion depth limit (100 levels)
  - Input size limit (10MB default)
  - RLE expansion limit (10,000 repeats)

#### CLI (@goon-format/cli)
- `goon` command for converting between JSON and GOON
- `--stats` flag for token statistics
- `--compare` flag for format comparison table
- `--validate` flag for GOON syntax validation
- `--batch` flag for processing multiple files
- Stdin/stdout support for piping
- Auto-detection of input format

#### Benchmarks
- Token efficiency benchmarks using GPT-4o tokenizer (o200k_base)
- 6 benchmark datasets
- Format comparison: JSON, JSON Compact, YAML, XML, CSV, TOON, GOON
- Feature impact analysis
- LLM accuracy benchmarks

#### Documentation
- Comprehensive README with benchmarks and API reference
- SPEC.md with complete ABNF grammar
- Migration guide from TOON
- LLM integration guide
- Example code

#### Community
- CODE_OF_CONDUCT.md
- CONTRIBUTING.md
- SECURITY.md
- GitHub issue templates
- GitHub Actions CI/CD workflows

## [Unreleased]

### Planned
- Browser support (ESM bundle)
- Streaming API improvements
- Performance optimizations

---

[1.0.2]: https://github.com/goon-format/goon/releases/tag/v1.0.2
[1.0.1]: https://github.com/goon-format/goon/releases/tag/v1.0.1
[1.0.0]: https://github.com/goon-format/goon/releases/tag/v1.0.0
[Unreleased]: https://github.com/goon-format/goon/compare/v1.0.2...HEAD
