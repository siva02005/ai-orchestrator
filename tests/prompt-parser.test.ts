import { describe, expect, it } from 'vitest';
import { createTestEngine, SAMPLE_PROMPT } from './helpers.js';
import { GameUnderstandingSchema } from '../src/types/analysis.js';

describe('Phase 1 — prompt parser (game understanding)', () => {
  const engine = createTestEngine();

  it('turns a natural-language prompt into a structured GameUnderstanding', async () => {
    const analysis = await engine.orchestrator.analyze(SAMPLE_PROMPT);
    const parsed = GameUnderstandingSchema.safeParse(analysis);
    expect(parsed.success).toBe(true);
    expect(analysis.original_prompt).toBe(SAMPLE_PROMPT);
    expect(analysis.entities_mentioned.length).toBeGreaterThan(0);
  });

  it('propagates input validation errors for empty prompts', async () => {
    await expect(engine.orchestrator.analyze('')).rejects.toThrow();
  });
});
