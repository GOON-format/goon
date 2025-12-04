/**
 * Tokenizer wrapper for GPT-4o (o200k_base encoding)
 * Matches TOON benchmark methodology for fair comparison
 */

import { encode } from 'gpt-tokenizer/model/gpt-4o';

export const TOKENIZER_MODEL = 'gpt-4o';
export const TOKENIZER_ENCODING = 'o200k_base';

/**
 * Count tokens in a text string using GPT-4o tokenizer
 */
export function countTokens(text: string): number {
  return encode(text).length;
}

/**
 * Count tokens with additional metadata
 */
export function countTokensDetailed(text: string): {
  tokens: number;
  bytes: number;
  charsPerToken: number;
} {
  const tokens = encode(text);
  const bytes = Buffer.byteLength(text, 'utf8');
  return {
    tokens: tokens.length,
    bytes,
    charsPerToken: tokens.length > 0 ? text.length / tokens.length : 0,
  };
}

/**
 * Get token IDs for a text string (for debugging)
 */
export function getTokenIds(text: string): number[] {
  return encode(text);
}

