# Contributing to GOON

Thank you for your interest in contributing to GOON! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 8 or higher

### Development Setup

```bash
# Clone the repository
git clone https://github.com/goon-format/goon.git
cd goon

# Install dependencies
npm install

# Build all packages
npm run build --workspaces

# Run tests
npm test
```

### Repository Structure

```
goon/
├── packages/
│   ├── goon/           # Core library (@goon-format/goon)
│   │   ├── src/
│   │   │   ├── encode.ts    # Encoder implementation
│   │   │   ├── decode.ts    # Decoder implementation
│   │   │   ├── types.ts     # TypeScript types
│   │   │   └── utils.ts     # Utility functions
│   │   └── package.json
│   └── cli/            # CLI tool (@goon-format/cli)
│       ├── src/
│       │   └── cli.ts       # CLI implementation
│       └── package.json
├── benchmarks/         # Benchmark suite
│   ├── src/
│   │   ├── datasets/        # Test datasets
│   │   ├── formats/         # Format converters
│   │   └── *.ts             # Benchmark runners
│   └── results/             # Generated reports
├── docs/               # Documentation
├── examples/           # Example code
└── specs/              # Specifications
```

## Development Workflow

### Making Changes

1. **Fork the repository** and create your branch from `main`
2. **Write tests** for any new functionality
3. **Make your changes** following the code style
4. **Run tests** to ensure nothing is broken
5. **Update documentation** if needed
6. **Submit a pull request**

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch --workspace=packages/goon

# Run tests with coverage
npm test -- --coverage
```

### Running Benchmarks

```bash
# Token efficiency benchmark
npm run benchmark:tokens

# Feature impact analysis
npm run benchmark:features
```

### Code Style

- Use TypeScript for all source code
- Follow existing code patterns
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions focused and small

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add streaming encode support
fix: handle edge case in dictionary building
docs: update API reference for decode options
test: add tests for column reference parsing
perf: optimize dictionary lookup
```

## Pull Request Process

1. **Update the README.md** if you've added new features
2. **Add tests** for any new functionality
3. **Run the full test suite** and ensure it passes
4. **Update CHANGELOG.md** with your changes
5. **Request review** from maintainers

### PR Title Format

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `test:` Adding tests
- `perf:` Performance improvement
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

## Reporting Issues

### Bug Reports

Include:
- GOON version
- Node.js version
- Minimal reproduction code
- Expected vs actual behavior
- Error messages if any

### Feature Requests

Include:
- Use case description
- Proposed solution
- Example usage code
- Willingness to implement

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## License

By contributing to GOON, you agree that your contributions will be licensed under the MIT License.

## Questions?

- Open a [GitHub Discussion](https://github.com/goon-format/goon/discussions)
- Check existing [Issues](https://github.com/goon-format/goon/issues)

Thank you for contributing! 🦍


