# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Security Features

GOON includes several built-in security protections:

### Prototype Pollution Prevention

The decoder filters dangerous object keys:
- `__proto__`
- `constructor`
- `prototype`

### Resource Limits

| Limit | Default | Constant |
|-------|---------|----------|
| Recursion depth | 100 | `MAX_RECURSION_DEPTH` |
| Input size | 10 MB | `MAX_INPUT_SIZE` |
| RLE repeat count | 10,000 | `MAX_REPEAT_COUNT` |

### Safe Object Creation

Decoded objects use `Object.create(null)` to prevent prototype chain attacks.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them by emailing [INSERT EMAIL].

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 7 days
- **Resolution timeline**: Depends on severity

### Severity Levels

| Level | Response Time | Example |
|-------|--------------|---------|
| Critical | 24 hours | Remote code execution |
| High | 7 days | Prototype pollution bypass |
| Medium | 30 days | DoS via resource exhaustion |
| Low | 90 days | Information disclosure |

## Security Best Practices

When using GOON with untrusted input:

```typescript
import { decode, GoonDecodeError, MAX_INPUT_SIZE } from '@goon-format/goon';

function safeDecodeGoon(input: string) {
  // Check input size
  if (input.length > MAX_INPUT_SIZE) {
    throw new Error('Input too large');
  }

  try {
    return decode(input);
  } catch (e) {
    if (e instanceof GoonDecodeError) {
      // Handle parse error safely
      console.error(`Parse error: ${e.message}`);
      return null;
    }
    throw e;
  }
}
```

## Acknowledgments

We thank the following researchers for responsibly disclosing vulnerabilities:

*None yet - be the first!*

