import { describe, expect, it } from 'vitest';
import { decodeToon } from './toon-parser';

describe('decodeToon', () => {
  it('parses fenced JSON responses emitted instead of TOON', () => {
    const output = [
      '```json',
      '{',
      '  "invoice": {',
      '    "number": "INV-001",',
      '    "total": 42',
      '  },',
      '  "line_items": [',
      '    { "name": "Widget", "qty": 2 }',
      '  ]',
      '}',
      '```',
    ].join('\n');

    expect(decodeToon(output)).toEqual({
      invoice: { number: 'INV-001', total: 42 },
      line_items: [{ name: 'Widget', qty: 2 }],
    });
  });
});
