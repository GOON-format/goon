/**
 * XML Format Converter
 * Uses fast-xml-parser for encoding/decoding
 */

import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import type { FormatConverter } from '../types.js';

const xmlBuilder = new XMLBuilder({
  format: true,
  indentBy: '  ',
  ignoreAttributes: false,
  suppressEmptyNode: false,
});

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseAttributeValue: true,
  parseTagValue: true,
});

export const xmlFormat: FormatConverter = {
  name: 'XML',
  extension: '.xml',
  encode: (data: unknown): string => {
    // Wrap in a root element
    const wrapped = { root: data };
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlBuilder.build(wrapped);
  },
  decode: (text: string): unknown => {
    const parsed = xmlParser.parse(text);
    return parsed.root;
  },
  supportsNested: true,
};

