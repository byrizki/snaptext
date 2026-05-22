import { test, describe } from 'node:test';
import assert from 'node:assert';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { resolveModel } from './model-resolution';

describe('resolveModel', () => {
  test('should resolve Flux model by name case-insensitively', async () => {
    const model = await resolveModel('flux');
    assert.ok(model);
    assert.strictEqual(model.name, 'Flux');
  });

  test('should resolve Spark model by exact modelId', async () => {
    const model = await resolveModel('@vercel/google/gemini-2.5-flash-lite-preview-09-2025');
    assert.ok(model);
    assert.strictEqual(model.name, 'Spark');
  });

  test('should resolve Zenith model by stripped modelId', async () => {
    const model = await resolveModel('moonshotai/kimi-k2.5');
    assert.ok(model);
    assert.strictEqual(model.name, 'Zenith');
  });

  test('should resolve Flux model by exact UUID', async () => {
    const model = await resolveModel('5a233ea8-e21a-4bc5-8473-511c312275a5');
    assert.ok(model);
    assert.strictEqual(model.name, 'Flux');
  });

  test('should return undefined for non-existent model name', async () => {
    const model = await resolveModel('non-existent-model');
    assert.strictEqual(model, undefined);
  });

  test('should return undefined for null/undefined/empty input', async () => {
    assert.strictEqual(await resolveModel(null), undefined);
    assert.strictEqual(await resolveModel(undefined), undefined);
    assert.strictEqual(await resolveModel(''), undefined);
  });
});
