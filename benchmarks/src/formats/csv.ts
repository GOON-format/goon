/**
 * CSV Format Converter
 * Uses papaparse - only supports flat arrays of objects
 */

import Papa from 'papaparse';
import type { FormatConverter } from '../types.js';

export const csvFormat: FormatConverter = {
  name: 'CSV',
  extension: '.csv',
  encode: (data: unknown): string => {
    // Extract the first array property from the data
    const obj = data as Record<string, unknown>;
    const arrayKey = Object.keys(obj).find(k => Array.isArray(obj[k]));
    
    if (!arrayKey) {
      throw new Error('CSV requires data with an array property');
    }
    
    const array = obj[arrayKey] as Record<string, unknown>[];
    
    // Flatten nested objects for CSV
    const flattened = array.map(item => flattenObject(item));
    
    return Papa.unparse(flattened, {
      header: true,
      newline: '\n',
    });
  },
  decode: (text: string): unknown => {
    const result = Papa.parse(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    });
    return { data: result.data };
  },
  supportsNested: false,
};

/**
 * Flatten nested objects into dot-notation keys
 */
function flattenObject(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else if (Array.isArray(value)) {
      // Convert arrays to JSON string for CSV
      result[newKey] = JSON.stringify(value);
    } else {
      result[newKey] = value;
    }
  }
  
  return result;
}

