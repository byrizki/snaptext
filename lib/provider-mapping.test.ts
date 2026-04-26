import { test, describe } from 'node:test';
import assert from 'node:assert';
import { getModelId } from './provider-mapping.ts';

describe('getModelId', () => {
  test('should remove @vercel/ prefix and preserve nested path', () => {
    assert.strictEqual(getModelId('@vercel/openai/gpt-4o'), 'openai/gpt-4o');
  });

  test('should remove @cf/ prefix (including handling nested @cf/ for cloudflare)', () => {
    assert.strictEqual(getModelId('@cf/meta/llama-3-8b-instruct'), 'meta/llama-3-8b-instruct');
    assert.strictEqual(getModelId('@cf/@cf/meta/llama-3-8b-instruct'), '@cf/meta/llama-3-8b-instruct');
  });

  test('should return original string if no known prefix is present', () => {
    assert.strictEqual(getModelId('openai/gpt-4o'), 'openai/gpt-4o');
    assert.strictEqual(getModelId('anthropic/claude-3-opus'), 'anthropic/claude-3-opus');
  });

  test('should handle empty string', () => {
    assert.strictEqual(getModelId(''), '');
  });
});
