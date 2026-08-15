import { describe, expect, it } from 'vitest';
import {
  extractJson,
  zodToJson,
} from '../src/ai/provider.js';
import { GameUnderstandingSchema } from '../src/types/analysis.js';
import { fakeFromJsonSchema } from '../src/ai/json-fake.js';

describe('extractJson', () => {
  it('parses plain JSON', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('parses JSON inside markdown fences', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('parses JSON surrounded by prose', () => {
    expect(extractJson('Here you go: {"a":1} hope that helps')).toEqual({ a: 1 });
  });

  it('throws on non-JSON output', () => {
    expect(() => extractJson('this is not json at all')).toThrow();
  });

  it('throws on empty output', () => {
    expect(() => extractJson('   ')).toThrow();
  });
});

describe('zodToJson + fakeFromJsonSchema', () => {
  it('produces a JSON Schema from a Zod schema', () => {
    const json = zodToJson(GameUnderstandingSchema);
    expect(json.type).toBe('object');
    expect(json.properties).toBeDefined();
    expect((json.properties as Record<string, unknown>).intent).toBeDefined();
  });

  it('fake generator produces values valid against the original schema', () => {
    const json = zodToJson(GameUnderstandingSchema);
    const fake = fakeFromJsonSchema(json);
    const parsed = GameUnderstandingSchema.safeParse(fake);
    expect(parsed.success).toBe(true);
  });

  it('fake generator picks a valid enum value', async () => {
    const { z } = await import('zod');
    const difficulty = z.enum(['easy', 'normal', 'hard']);
    const json = zodToJson(difficulty);
    const fake = fakeFromJsonSchema(json);
    expect(['easy', 'normal', 'hard']).toContain(fake);
  });
});
