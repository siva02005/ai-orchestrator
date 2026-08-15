import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { MockProvider } from '../src/ai/providers/mock.js';
import { ProviderRegistry } from '../src/ai/registry.js';
import { generateStructured } from '../src/ai/structured.js';
import { InvalidLLMOutputError } from '../src/core/errors.js';

const SmallSchema = z.object({ name: z.string(), count: z.number() });

function registryWithScripted(scripted: string[]): ProviderRegistry {
  return new ProviderRegistry({ default: 'mock' });
}

describe('structured generation', () => {
  it('returns validated output on a valid response', async () => {
    const provider = new MockProvider({ scripted: ['{"name":"n","count":1}'] });
    const result = await generateStructured({
      provider,
      system: 's',
      prompt: 'p',
      schema: SmallSchema,
    });
    expect(result.output).toEqual({ name: 'n', count: 1 });
    expect(result.attempts).toBe(1);
    expect(result.provider).toBe('mock');
  });

  it('self-corrects invalid JSON by feeding errors back', async () => {
    const provider = new MockProvider({
      scripted: ['not valid json at all', '{"name":"n","count":2}'],
    });
    const result = await generateStructured({
      provider,
      system: 's',
      prompt: 'p',
      schema: SmallSchema,
      maxAttempts: 3,
    });
    expect(result.output).toEqual({ name: 'n', count: 2 });
    expect(result.attempts).toBe(2);
  });

  it('self-corrects schema-invalid output (wrong types)', async () => {
    const provider = new MockProvider({
      scripted: ['{"name":123,"count":"x"}', '{"name":"ok","count":3}'],
    });
    const result = await generateStructured({
      provider,
      system: 's',
      prompt: 'p',
      schema: SmallSchema,
      maxAttempts: 3,
    });
    expect(result.output).toEqual({ name: 'ok', count: 3 });
    expect(result.attempts).toBe(2);
  });

  it('throws InvalidLLMOutputError when output never becomes valid', async () => {
    const provider = new MockProvider({
      scripted: ['bad', 'bad', 'bad', 'bad'],
    });
    await expect(
      generateStructured({
        provider,
        system: 's',
        prompt: 'p',
        schema: SmallSchema,
        maxAttempts: 3,
      }),
    ).rejects.toBeInstanceOf(InvalidLLMOutputError);
  });

  it('returns a valid sample for an arbitrary schema via fake generator', async () => {
    const provider = new MockProvider();
    const result = await generateStructured({
      provider,
      system: 's',
      prompt: 'p',
      schema: SmallSchema,
    });
    expect(SmallSchema.safeParse(result.output).success).toBe(true);
  });

  it('works through the provider registry', async () => {
    void registryWithScripted(['{"name":"n","count":1}']);
    const registry = new ProviderRegistry({ default: 'mock' });
    const result = await generateStructured({
      provider: registry.get('mock'),
      system: 's',
      prompt: 'p',
      schema: SmallSchema,
    });
    expect(SmallSchema.safeParse(result.output).success).toBe(true);
  });
});
