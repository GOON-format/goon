/**
 * YAML Format Converter
 * Uses js-yaml for encoding/decoding
 */

import yaml from 'js-yaml';
import type { FormatConverter } from '../types.js';

export const yamlFormat: FormatConverter = {
  name: 'YAML',
  extension: '.yaml',
  encode: (data: unknown): string => yaml.dump(data, {
    indent: 2,
    lineWidth: -1, // Don't wrap lines
    noRefs: true,  // Don't use anchors/aliases
  }),
  decode: (text: string): unknown => yaml.load(text),
  supportsNested: true,
};

