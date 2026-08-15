import { describe, expect, it } from 'vitest';
import { createTestEngine, SAMPLE_PROMPT } from './helpers.js';
import {
  GameConceptSchema,
  StorySectionSchema,
  CharactersSectionSchema,
  NPCSectionSchema,
  EnvironmentSectionSchema,
  WorldSectionSchema,
  UISectionSchema,
  GameplayTechnicalSectionSchema,
} from '../src/agents/schemas.js';
import { GameUnderstandingSchema } from '../src/types/analysis.js';
import { TestPlanSectionSchema } from '../src/agents/schemas.js';
import { BugFixOutputSchema } from '../src/agents/schemas.js';

describe('specialized agents run against the mock provider', () => {
  const engine = createTestEngine();

  it('runs the full design team and every output validates against its schema', async () => {
    const analysis = await engine.orchestrator.analyze(SAMPLE_PROMPT);
    expect(GameUnderstandingSchema.safeParse(analysis).success).toBe(true);

    const concept = await run('game-designer', analysis);
    expect(GameConceptSchema.safeParse(concept).success).toBe(true);

    const story = await run('story-designer', { analysis, concept });
    expect(StorySectionSchema.safeParse(story).success).toBe(true);

    const characters = await run('character-designer', { analysis, concept, story });
    expect(CharactersSectionSchema.safeParse(characters).success).toBe(true);

    const npcs = await run('npc-designer', { analysis, concept, story });
    expect(NPCSectionSchema.safeParse(npcs).success).toBe(true);

    const environment = await run('environment-designer', { analysis, concept });
    expect(EnvironmentSectionSchema.safeParse(environment).success).toBe(true);

    const world = await run('level-designer', { concept, environment });
    expect(WorldSectionSchema.safeParse(world).success).toBe(true);

    const ui = await run('ui-designer', { concept });
    expect(UISectionSchema.safeParse(ui).success).toBe(true);

    const gameplayTechnical = await run('gameplay-programmer', { analysis, concept });
    expect(GameplayTechnicalSectionSchema.safeParse(gameplayTechnical).success).toBe(true);
  });

  it('testing agent validates against a generated spec', async () => {
    const { spec } = await engine.orchestrator.generateSpec({ prompt: SAMPLE_PROMPT });
    const output = await run('testing-agent', { spec });
    expect(TestPlanSectionSchema.safeParse(output).success).toBe(true);
    expect((output as { test_plan: unknown[] }).test_plan.length).toBeGreaterThan(0);
  });

  it('bug-fix agent fixes a reported bug and preserves shape', async () => {
    const { spec } = await engine.orchestrator.generateSpec({ prompt: SAMPLE_PROMPT });
    const output = await run('bug-fix-agent', {
      original_input: { spec },
      agent_output: { spec },
      bug_report: 'Mission locations do not exist in world.areas. Fix them.',
    });
    expect(BugFixOutputSchema.safeParse(output).success).toBe(true);
    expect((output as { changes: unknown[] }).changes.length).toBeGreaterThan(0);
  });

  async function run(name: string, input: unknown): Promise<unknown> {
    const result = await engine.agentManager.runAgent(name, input);
    expect(result.status).toBe('completed');
    expect(result.error).toBeUndefined();
    return result.output;
  }
});
