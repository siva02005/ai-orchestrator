import { z } from 'zod';
import { Agent } from '../base.js';
import { GameSpecSchema } from '../../types/game-spec.js';
import { TestPlanSection, TestPlanSectionSchema } from '../schemas.js';

export const TestingAgentInputSchema = z.object({
  spec: GameSpecSchema,
  focus: z
    .enum(['all', 'gameplay', 'missions', 'physics', 'ui', 'audio', 'performance'])
    .optional(),
});

export type TestingAgentInput = z.infer<typeof TestingAgentInputSchema>;

/**
 * Testing Agent — reviews the complete game specification and produces a
 * test plan, risk register and recommended automated tests for the QA and
 * engine teams.
 */
export class TestingAgent extends Agent<TestingAgentInput, TestPlanSection> {
  readonly name = 'testing-agent' as const;
  readonly title = 'Testing Agent';
  readonly description =
    'Reviews a game specification and produces a test plan, risk register and recommended automated tests.';
  readonly produces = ['test_plan', 'risks'];
  readonly dependencies = [];
  readonly inputSchema = TestingAgentInputSchema;
  readonly outputSchema = TestPlanSectionSchema;

  buildSystemPrompt(): string {
    return [
      'You are the Testing Agent on an AI game development team.',
      'Analyze the given game specification and produce a realistic test plan.',
      'Each test plan entry needs: id, focus, approach (how to test), and success_criteria.',
      'Identify risks with likelihood, impact and a concrete mitigation.',
      'List recommended automated tests that could be run in CI (unit, integration, smoke, performance).',
      'Respect the focus area if provided; otherwise cover everything.',
    ].join('\n');
  }

  buildUserPrompt(input: TestingAgentInput): string {
    return [
      'Produce a test plan for this game specification:',
      z.object({ spec: GameSpecSchema, focus: TestingAgentInputSchema.shape.focus }).parse(input),
      'Spec:',
      JSON.stringify(input.spec, null, 2),
      ...(input.focus ? [`Focus area: ${input.focus}`] : []),
    ].join('\n');
  }
}
