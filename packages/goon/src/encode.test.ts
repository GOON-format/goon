import { describe, it, expect } from 'vitest';
import {
  encode,
  decode,
  GoonEncodeError,
  GoonDecodeError,
  MAX_RECURSION_DEPTH,
} from './index.js';

describe('GOON Encode/Decode', () => {
  describe('primitives', () => {
    it('encodes booleans as T/F', () => {
      const goon = encode({ active: true, deleted: false });
      expect(goon).toContain('active:T');
      expect(goon).toContain('deleted:F');
    });

    it('encodes null as _', () => {
      const goon = encode({ value: null });
      expect(goon).toContain('value:_');
    });

    it('encodes empty string as ~', () => {
      const goon = encode({ name: '' });
      expect(goon).toContain('name:~');
    });

    it('encodes numbers', () => {
      const goon = encode({ count: 42, price: 19.99 });
      expect(goon).toContain('count:42');
      expect(goon).toContain('price:19.99');
    });

    it('handles Infinity and NaN as null', () => {
      const goon = encode({ inf: Infinity, nan: NaN });
      expect(goon).toContain('inf:_');
      expect(goon).toContain('nan:_');
    });
  });

  describe('string dictionary', () => {
    it('creates dictionary for repeated strings', () => {
      const data = {
        users: [
          { id: 1, role: 'admin' },
          { id: 2, role: 'user' },
          { id: 3, role: 'admin' },
        ],
      };
      const goon = encode(data);
      expect(goon).toMatch(/^\$:admin/); // Dictionary starts with admin
      expect(goon).toContain('$0'); // Reference to dictionary
    });

    it('does not create dictionary when disabled', () => {
      const data = {
        users: [
          { id: 1, role: 'admin' },
          { id: 2, role: 'admin' },
        ],
      };
      const goon = encode(data, { dictionary: false });
      expect(goon).not.toContain('$:');
      expect(goon).toContain('admin');
    });
  });

  describe('tabular arrays', () => {
    it('encodes uniform arrays in tabular format', () => {
      const data = {
        items: [
          { id: 1, name: 'Alpha' },
          { id: 2, name: 'Beta' },
        ],
      };
      const goon = encode(data);
      expect(goon).toContain('{id|name}');
      expect(goon).toContain('1|Alpha');
      expect(goon).toContain('2|Beta');
    });

    it('uses column references for repeated values', () => {
      const data = {
        orders: [
          { date: '2024-01', customer: 'Acme' },
          { date: '2024-01', customer: 'Acme' },
          { date: '2024-02', customer: 'Acme' },
        ],
      };
      const goon = encode(data);
      expect(goon).toContain('^'); // Column reference
    });
  });

  describe('escape sequences', () => {
    it('handles newlines in strings', () => {
      const data = { text: 'line1\nline2' };
      const goon = encode(data);
      const decoded = decode(goon);
      expect(decoded).toEqual(data);
    });

    it('handles tabs in strings', () => {
      const data = { text: 'col1\tcol2' };
      const goon = encode(data);
      const decoded = decode(goon);
      expect(decoded).toEqual(data);
    });

    it('handles quotes in strings', () => {
      const data = { text: 'He said "hello"' };
      const goon = encode(data);
      const decoded = decode(goon);
      expect(decoded).toEqual(data);
    });

    it('handles backslashes in strings', () => {
      const data = { path: 'C:\\Users\\test' };
      const goon = encode(data);
      const decoded = decode(goon);
      expect(decoded).toEqual(data);
    });
  });

  describe('round-trip', () => {
    const testCases = [
      { name: 'simple object', data: { a: 1, b: 'hello', c: true } },
      { name: 'nested object', data: { outer: { inner: { deep: 42 } } } },
      { name: 'array of primitives', data: { nums: [1, 2, 3] } },
      {
        name: 'tabular array',
        data: {
          users: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
          ],
        },
      },
      {
        name: 'with nulls and booleans',
        data: {
          items: [
            { id: 1, active: true, deleted: null },
            { id: 2, active: false, deleted: null },
          ],
        },
      },
      { name: 'empty string', data: { name: '', title: 'Hello' } },
      { name: 'empty object', data: { config: {} } },
      { name: 'empty array', data: { items: [] } },
    ];

    for (const { name, data } of testCases) {
      it(`round-trips ${name}`, () => {
        const goon = encode(data);
        const decoded = decode(goon);
        expect(decoded).toEqual(data);
      });
    }
  });

  describe('edge cases', () => {
    it('handles strings that look like references', () => {
      const data = { value: '$0' };
      const goon = encode(data);
      const decoded = decode(goon);
      expect(decoded).toEqual(data);
    });

    it('handles strings that look like booleans', () => {
      const data = { value: 'T' };
      const goon = encode(data);
      const decoded = decode(goon);
      expect(decoded).toEqual(data);
    });

    it('handles pipe character in strings', () => {
      const data = { cmd: 'cat file | grep foo' };
      const goon = encode(data);
      const decoded = decode(goon);
      expect(decoded).toEqual(data);
    });

    it('handles asterisk that looks like RLE', () => {
      const data = { value: 'test*5' };
      const goon = encode(data);
      const decoded = decode(goon);
      expect(decoded).toEqual(data);
    });
  });

  describe('security', () => {
    it('filters __proto__ keys on encode', () => {
      const data = { normal: 1, __proto__: { evil: true } };
      const goon = encode(data as any);
      expect(goon).not.toContain('__proto__');
      expect(goon).not.toContain('evil');
    });

    it('filters constructor keys on encode', () => {
      const data = { normal: 1, constructor: { evil: true } };
      const goon = encode(data as any);
      expect(goon).not.toContain('constructor');
    });

    it('filters prototype keys on encode', () => {
      const data = { normal: 1, prototype: { evil: true } };
      const goon = encode(data as any);
      expect(goon).not.toContain('prototype');
    });

    it('filters dangerous keys on decode', () => {
      const malicious = `__proto__:evil\nconstructor:bad\nnormal:good`;
      const decoded = decode(malicious) as Record<string, unknown>;
      expect(decoded).not.toHaveProperty('__proto__');
      expect(decoded).not.toHaveProperty('constructor');
      expect(decoded).toHaveProperty('normal', 'good');
    });

    it('does not pollute Object prototype', () => {
      const original = Object.prototype.toString;
      const malicious = `__proto__
  toString:hacked`;
      decode(malicious);
      expect(Object.prototype.toString).toBe(original);
    });

    it('limits recursion depth on encode', () => {
      // Create deeply nested object - needs to exceed MAX_RECURSION_DEPTH (100)
      // Build from inside out
      let deep: any = { value: 1 };
      for (let i = 0; i < 150; i++) {
        deep = { nested: deep };
      }
      // The structure is 150 levels deep, should exceed limit
      expect(() => encode(deep)).toThrow(GoonEncodeError);
      expect(() => encode(deep)).toThrow('Maximum recursion depth');
    });

    it('limits recursion depth on decode', () => {
      // Create deeply nested GOON using a loop
      const lines: string[] = [];
      for (let i = 0; i < MAX_RECURSION_DEPTH + 50; i++) {
        lines.push('  '.repeat(i) + 'nested');
      }
      lines.push('  '.repeat(MAX_RECURSION_DEPTH + 50) + 'value:1');
      const goon = lines.join('\n');
      expect(() => decode(goon)).toThrow(GoonDecodeError);
    });

    it('limits repeat count to prevent memory exhaustion', () => {
      // items[] is a simple array, the row after it defines values
      const malicious = `items[]:1*999999999`;
      const decoded = decode(malicious) as Record<string, unknown[]>;
      // Should be capped at MAX_REPEAT_COUNT (10000)
      expect(decoded.items.length).toBeLessThanOrEqual(10000);
    });
  });

  describe('error handling', () => {
    it('throws GoonEncodeError for invalid indent option', () => {
      expect(() => encode({}, { indent: 123 as any })).toThrow(GoonEncodeError);
    });

    it('throws GoonDecodeError with line numbers', () => {
      // Create deeply nested structure that exceeds limit
      let goon = 'value:1';
      for (let i = 0; i < MAX_RECURSION_DEPTH + 10; i++) {
        goon = `nested\n  ${goon.split('\n').join('\n  ')}`;
      }
      try {
        decode(goon);
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(GoonDecodeError);
        expect((e as GoonDecodeError).message).toContain('Line');
      }
    });
  });

  describe('replacer and reviver', () => {
    it('supports replacer function', () => {
      const data = { password: 'secret', name: 'Alice' };
      const goon = encode(data, {
        replacer: (key, value) => (key === 'password' ? undefined : value),
      });
      expect(goon).not.toContain('password');
      expect(goon).not.toContain('secret');
      expect(goon).toContain('name:Alice');
    });

    it('supports reviver function', () => {
      const goon = `count:5`;
      const decoded = decode(goon, {
        reviver: (key, value) =>
          key === 'count' && typeof value === 'number' ? value * 2 : value,
      });
      expect(decoded).toEqual({ count: 10 });
    });
  });
});
