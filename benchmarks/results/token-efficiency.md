# Token Efficiency Benchmark Results

**Generated**: 2025-12-05T00:31:45.194Z
**Tokenizer**: gpt-4o (o200k_base)

## Summary

### Overall Results

- **GOON vs JSON**: 36.1% savings
- **GOON vs TOON**: -1.2% savings
- **GOON beats TOON on all datasets**: ❌ No

### By Format

| Format | Avg Tokens | Avg Bytes | vs JSON | vs TOON |
|--------|------------|-----------|---------|---------|
| JSON | 7,177 | 23,183 | **0.0%** | -73.4% |
| JSON Compact | 4,692 | 15,437 | **35.6%** | -11.0% |
| YAML | 5,690 | 17,379 | **21.4%** | -36.8% |
| XML | 8,295 | 26,135 | -17.5% | -105.4% |
| CSV | 2,192 | 6,395 | **64.9%** | **8.6%** |
| TOON | 4,822 | 14,075 | **36.5%** | **0.0%** |
| **GOON** | 4,839 | 13,842 | **36.1%** | -1.2% |

### By Dataset

| Dataset | Best Format | Best Tokens | Worst Format | Worst Tokens |
|---------|-------------|-------------|--------------|--------------|
| employees | CSV | 2,192 | XML | 7,418 |
| orders | JSON Compact | 5,854 | XML | 11,320 |
| analytics | TOON | 1,806 | XML | 5,524 |
| github | JSON Compact | 10,444 | XML | 16,840 |
| events | JSON Compact | 4,615 | XML | 7,740 |
| config | JSON Compact | 478 | XML | 930 |

## Detailed Results

### employees

| Format | Tokens | Bytes | vs JSON | vs TOON |
|--------|--------|-------|---------|---------|
| CSV | 2,192 | 6,395 | 64.9% | 8.6% |
| TOON | 2,397 | 6,612 | 61.6% | 0.0% |
| **GOON** | 2,497 | 6,479 | 60.0% | -4.2% |
| JSON Compact | 3,835 | 14,056 | 38.5% | -60.0% |
| YAML | 4,870 | 15,352 | 21.9% | -103.2% |
| JSON | 6,239 | 20,664 | 0.0% | -160.3% |
| XML | 7,418 | 25,195 | -18.9% | -209.5% |

### orders

| Format | Tokens | Bytes | vs JSON | vs TOON |
|--------|--------|-------|---------|---------|
| JSON Compact | 5,854 | 19,653 | 41.2% | 8.7% |
| TOON | 6,415 | 20,062 | 35.5% | 0.0% |
| **GOON** | 6,505 | 19,792 | 34.6% | -1.4% |
| YAML | 7,193 | 23,579 | 27.7% | -12.1% |
| JSON | 9,948 | 34,701 | 0.0% | -55.1% |
| XML | 11,320 | 35,795 | -13.8% | -76.5% |

### analytics

| Format | Tokens | Bytes | vs JSON | vs TOON |
|--------|--------|-------|---------|---------|
| TOON | 1,806 | 2,968 | 59.3% | 0.0% |
| **GOON** | 1,866 | 3,079 | 57.9% | -3.3% |
| JSON Compact | 2,928 | 8,648 | 33.9% | -62.1% |
| YAML | 3,705 | 9,784 | 16.4% | -105.1% |
| JSON | 4,432 | 12,616 | 0.0% | -145.4% |
| XML | 5,524 | 16,849 | -24.6% | -205.9% |

### github

| Format | Tokens | Bytes | vs JSON | vs TOON |
|--------|--------|-------|---------|---------|
| JSON Compact | 10,444 | 32,432 | 30.0% | 14.9% |
| **GOON** | 12,146 | 34,300 | 18.6% | 1.1% |
| TOON | 12,278 | 34,996 | 17.7% | 0.0% |
| YAML | 12,402 | 35,892 | 16.9% | -1.0% |
| JSON | 14,916 | 45,540 | 0.0% | -21.5% |
| XML | 16,840 | 50,624 | -12.9% | -37.2% |

### events

| Format | Tokens | Bytes | vs JSON | vs TOON |
|--------|--------|-------|---------|---------|
| JSON Compact | 4,615 | 16,121 | 31.6% | 15.5% |
| YAML | 5,391 | 17,610 | 20.1% | 1.2% |
| **GOON** | 5,449 | 17,433 | 19.3% | 0.2% |
| TOON | 5,459 | 17,773 | 19.1% | 0.0% |
| JSON | 6,748 | 22,690 | 0.0% | -23.6% |
| XML | 7,740 | 24,886 | -14.7% | -41.8% |

### config

| Format | Tokens | Bytes | vs JSON | vs TOON |
|--------|--------|-------|---------|---------|
| JSON Compact | 478 | 1,709 | 38.4% | 17.0% |
| **GOON** | 572 | 1,967 | 26.3% | 0.7% |
| TOON | 576 | 2,039 | 25.8% | 0.0% |
| YAML | 579 | 2,055 | 25.4% | -0.5% |
| JSON | 776 | 2,886 | 0.0% | -34.7% |
| XML | 930 | 3,460 | -19.8% | -61.5% |

## Methodology

- **Tokenizer**: GPT-4o tokenizer (o200k_base encoding)
- **Datasets**: 6 benchmark datasets covering uniform, nested, time-series, real-world, and config structures
- **Comparison**: Savings calculated as percentage reduction from baseline (JSON or TOON)
- **Reproducibility**: Run `npm run benchmark:tokens` to regenerate
