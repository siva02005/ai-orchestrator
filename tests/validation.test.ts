import { describe, expect, it } from 'vitest';
import { validate } from '../src/manager/validation.js';
import { z } from 'zod';
import { ValidationError, AppError } from '../src/core/errors.js';

const Person = z.object({ name: z.string(), age: z.number().min(0) });

describe('Validation system', () => {
  it('accepts valid values and returns parsed data', () => {
    const result = validate(Person, { name: 'Kai', age: 30 });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: 'Kai', age: 30 });
  });

  it('reports structured issues with paths for invalid values', () => {
    const result = validate(Person, { name: 42, age: -1 });
    expect(result.success).toBe(false);
    expect(result.issues).toBeDefined();
    const paths = result.issues!.map((i) => i.path);
    expect(paths).toContain('name');
    expect(paths).toContain('age');
  });

  it('detects missing required fields', () => {
    const result = validate(Person, { name: 'x' });
    expect(result.success).toBe(false);
    expect(result.issues!.some((i) => i.path === 'age')).toBe(true);
  });

  it('produces AppError-compatible metadata', () => {
    const err = new ValidationError('bad', [{ path: 'x', message: 'nope', code: 'invalid_type' }]);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.statusCode).toBe(400);
    expect(err.retryable).toBe(false);
    expect(err.toJSON().code).toBe('VALIDATION_ERROR');
  });
});
