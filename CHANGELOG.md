# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-12-04

### Added

- **Mode presets** for common use cases:
  - `llm`: Optimized for LLM accuracy (92.5% with GPT-4o-mini)
  - `compact`: Maximum token compression
  - `balanced`: Default trade-off
- **Minimal indent mode** (`minimalIndent: true`): 12% additional token savings
- **Comma delimiter default**: 14% more token-efficient than pipe
- **Auto-detect delimiter** on decode: Supports comma, pipe, and tab

### Changed

- **Default mode is now `llm`** for best accuracy out of the box
- Default delimiter changed from pipe (`|`) to comma (`,`) for better token efficiency
- LLM mode disables dictionary and column references for improved accuracy
- Updated all documentation to reflect new mode presets
- Improved benchmark accuracy to 92.5% (up from 86.8%)

### Removed

- Removed experimental features that didn't improve accuracy:
  - `dictionaryAtEnd` option
  - `dictionaryAnchors` option
  - `semanticRefs` option
  - `selfDescribing` option

### Benchmark Results (v1.1.0)

| Dataset | GOON vs JSON | GOON vs TOON |
|---------|--------------|--------------|
| Employees | 62.8% savings | **3.0% savings** |
| Orders | 41.2% savings | **8.9% savings** |
| Analytics | 60.6% savings | **3.4% savings** |
| GitHub | 38.8% savings | **25.7% savings** |
| Events | 28.5% savings | **11.7% savings** |
| Config | 33.8% savings | **10.8% savings** |

**Average: 37.9% savings vs JSON, 3.1% savings vs TOON**

**LLM Accuracy: 92.5%** (GOON) vs 86.8% (TOON) vs 80.8% (JSON)

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
- 6 benchmark datasets:
  - Employees (100 uniform records)
  - Orders (50 nested records)
  - Analytics (60 days time-series)
  - GitHub (100 real repositories)
  - Events (75 log entries)
  - Config (deeply nested)
- Format comparison: JSON, JSON Compact, YAML, XML, CSV, TOON, GOON
- Feature impact analysis (dictionary, column refs, literals)
- LLM accuracy benchmarks

#### Documentation
- Comprehensive README with benchmarks and API reference
- SPEC.md with complete ABNF grammar
- Migration guide from TOON
- LLM integration guide
- Example code (encode, decode, OpenAI)

#### Community
- CODE_OF_CONDUCT.md (Contributor Covenant v2.1)
- CONTRIBUTING.md with development guide
- SECURITY.md with vulnerability reporting
- GitHub issue templates
- GitHub Actions CI/CD workflows

## [Unreleased]

### Planned
- Browser support (ESM bundle)
- Streaming API improvements
- Performance optimizations

---

[1.1.0]: https://github.com/goon-format/goon/releases/tag/v1.1.0
[1.0.0]: https://github.com/goon-format/goon/releases/tag/v1.0.0
[Unreleased]: https://github.com/goon-format/goon/compare/v1.1.0...HEAD
