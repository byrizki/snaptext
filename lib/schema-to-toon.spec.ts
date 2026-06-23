import { describe, it, expect } from 'vitest';
import { jsonSchemaToToon } from './schema-to-toon';

describe('jsonSchemaToToon', () => {
  it('should return empty string for null or non-object schema', () => {
    expect(jsonSchemaToToon(null as any)).toBe('');
    expect(jsonSchemaToToon('string' as any)).toBe('');
  });

  it('should format simple string property', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' }
      }
    };
    expect(jsonSchemaToToon(schema)).toBe('name: <string>');
  });

  it('should add comments for formatting, enums, limits, etc.', () => {
    const schema = {
      type: 'object',
      properties: {
        age: {
          type: 'number',
          minimum: 0,
          maximum: 120,
          description: 'Age of the person'
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
          description: 'Current status'
        },
        email: {
          type: 'string',
          format: 'email',
          pattern: '^.*@.*$'
        }
      }
    };
    const result = jsonSchemaToToon(schema);
    expect(result).toContain('age: <number> # min:0, max:120, Age of the person');
    expect(result).toContain('status: <string> # enum:active|inactive, Current status');
    expect(result).toContain('email: <string> # format:email, pattern:^.*@.*$');
  });

  it('should format nested object property', () => {
    const schema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          }
        }
      }
    };
    const expected = `user:\n  id: <string>`;
    expect(jsonSchemaToToon(schema)).toBe(expected);
  });

  it('should format array of simple items', () => {
    const schema = {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of tags'
        }
      }
    };
    const expected = `tags[N]: # item_type:string List of tags`;
    expect(jsonSchemaToToon(schema)).toBe(expected);
  });

  it('should format array of object items as table', () => {
    const schema = {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          description: 'List of users',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              age: { type: 'number', nullable: true }
            }
          }
        }
      }
    };
    const expected = `users[N]{id,age}: # List of users, {id:<"string">, age:<number|null>}`;
    expect(jsonSchemaToToon(schema)).toBe(expected);
  });

  it('should format REQUIRED constraints correctly', () => {
    const schema = {
      type: 'object',
      required: ['name', 'users'],
      properties: {
        name: { type: 'string' },
        users: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id'],
            properties: {
              id: { type: 'string' },
              age: { type: 'number' }
            }
          }
        }
      }
    };
    const result = jsonSchemaToToon(schema);
    expect(result).toContain('name: <string> # REQUIRED');
    expect(result).toContain('users[N]{id,age}: # REQUIRED, {id:<"string"> REQUIRED, age:<number>}');
  });

  it('should handle nullable field properties', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: ['string', 'null'] },
        age: { type: 'number', nullable: true }
      }
    };
    const result = jsonSchemaToToon(schema);
    expect(result).toContain('name: <string|null>');
    expect(result).toContain('age: <number|null>');
  });

  it('should handle root array schema', () => {
    const schema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      }
    };
    expect(jsonSchemaToToon(schema)).toBe('items[N]{id}: # {id:<"string">}');
  });
});
