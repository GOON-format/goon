# 🦍 GOON CLI

Command-line interface for [GOON](https://www.npmjs.com/package/@goon-format/goon) (Greatly Optimized Object Notation).

## Installation

```bash
npm install -g @goon-format/cli
```

## Usage

```bash
# Convert JSON to GOON
echo '{"users":[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]}' | goon

# Convert a file
goon data.json

# Compare formats (shows token savings)
goon data.json --compare

# Validate GOON syntax
goon data.goon --validate

# Show token statistics
goon data.json --stats

# Process multiple files
goon --batch file1.json file2.json file3.json
```

## Output Example

```bash
$ echo '{"users":[{"id":1,"name":"Alice","active":true},{"id":2,"name":"Bob","active":false}]}' | goon

users[2]{id,name,active}:
1,Alice,T
2,Bob,F
```

## Compare Mode

```bash
$ goon data.json --compare

┌─────────┬────────┬─────────┐
│ Format  │ Tokens │ Savings │
├─────────┼────────┼─────────┤
│ JSON    │ 156    │ -       │
│ GOON    │ 98     │ 37.2%   │
└─────────┴────────┴─────────┘
```

## Links

- [@goon-format/goon](https://www.npmjs.com/package/@goon-format/goon) - Core library
- [GitHub](https://github.com/goon-format/goon)
- [Documentation](https://github.com/goon-format/goon#readme)

## License

MIT


