import { describe, expect, it } from 'vitest';
import { createTestEngine, SAMPLE_PROMPT } from './helpers.js';
import { GameSpecSchema } from '../src/types/game-spec.js';

describe('Phase 2 — game specification generator', () => {
  const engine = createTestEngine();

  it('generates a full valid GameSpec from a prompt', async () => {
    const { spec, agentResults } = await engine.orchestrator.generateSpec({ prompt: SAMPLE_PROMPT });

    const parsed = GameSpecSchema.safeParse(spec);
    expect(parsed.success).toBe(true);
    expect(spec.schema_version).toBeTruthy();
    expect(spec.game_name.length).toBeGreaterThan(0);
    expect(spec.genre.length).toBeGreaterThan(0);
    expect(spec.missions.length).toBeGreaterThan(0);
    expect(spec.characters.length).toBeGreaterThan(0);
    expect(spec.npcs.length).toBeGreaterThan(0);
    expect(spec.world.areas.length).toBeGreaterThan(0);
    expect(spec.technical_requirements.engine.length).toBeGreaterThan(0);

    // All eight design agents should have run successfully.
    for (const agent of [
      'game-designer',
      'story-designer',
      'character-designer',
      'npc-designer',
      'environment-designer',
      'level-designer',
      'ui-designer',
      'gameplay-programmer',
    ]) {
      expect(agentResults[agent]?.status).toBe('completed');
    }
  });

  it('accepts a pre-computed analysis without re-analyzing', async () => {
    const analysis = await engine.orchestrator.analyze(SAMPLE_PROMPT);
    const { spec } = await engine.orchestrator.generateSpec({ analysis });
    expect(GameSpecSchema.safeParse(spec).success).toBe(true);
  });

  it('fails clearly when neither prompt nor analysis is given', async () => {
    await expect(engine.orchestrator.generateSpec({})).rejects.toThrow(/prompt|analysis/);
  });
});
