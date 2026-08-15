import { AgentManager } from '../manager/agent-manager.js';
import { PromptParser } from './prompt-parser.js';
import { AppError } from '../core/errors.js';
import { GameUnderstanding } from '../types/analysis.js';
import { GameSpec } from '../types/game-spec.js';
import { AgentRunResult } from '../types/agents.js';
import {
  GameConcept,
  StorySection,
  CharactersSection,
  NPCSection,
  EnvironmentSection,
  WorldSection,
  UISection,
  GameplayTechnicalSection,
} from '../agents/schemas.js';
import { assembleGameSpec } from './spec-assembler.js';

export interface GenerateSpecInput {
  /** Raw user prompt. Ignored when `analysis` is provided. */
  prompt?: string;
  /** Pre-computed analysis (avoids re-running the prompt analyzer). */
  analysis?: GameUnderstanding;
  provider?: string;
  signal?: AbortSignal;
}

export interface GenerateSpecResult {
  spec: GameSpec;
  /** Every agent run performed, keyed by agent name, for observability. */
  agentResults: Record<string, AgentRunResult>;
}

/**
 * =====================================================================
 * GAME SPECIFICATION GENERATOR (Phase 2)
 * =====================================================================
 * Runs the specialized design agents in dependency order and assembles
 * their outputs into a validated GameSpec. If any agent fails, the whole
 * generation fails with a retryable error naming the failing agent.
 * =====================================================================
 */
export class SpecGenerator {
  constructor(
    private readonly agents: AgentManager,
    private readonly promptParser: PromptParser,
  ) {}

  async generate(input: GenerateSpecInput): Promise<GenerateSpecResult> {
    const analysis = input.analysis ?? (await this.ensurePrompt(input.prompt));
    const agentResults: Record<string, AgentRunResult> = {};
    const runOptions = { provider: input.provider, signal: input.signal };

    const run = async <T>(name: string, agentInput: unknown): Promise<T> => {
      const result = await this.agents.runAgent(name, agentInput, runOptions);
      agentResults[name] = result;
      if (result.status === 'failed' || result.output === null) {
        throw new AppError({
          code: 'AGENT_RUN_FAILED',
          message: `Spec generation failed at agent "${name}": ${result.error?.message ?? 'no output'}`,
          retryable: result.error?.retryable ?? true,
          statusCode: 502,
        });
      }
      return result.output as T;
    };

    const concept = await run<GameConcept>('game-designer', analysis);
    const story = await run<StorySection>('story-designer', { analysis, concept });
    const characters = await run<CharactersSection>('character-designer', {
      analysis,
      concept,
      story,
    });
    const npcs = await run<NPCSection>('npc-designer', { analysis, concept, story });
    const environment = await run<EnvironmentSection>('environment-designer', {
      analysis,
      concept,
    });
    const world = await run<WorldSection>('level-designer', { concept, environment });
    const ui = await run<UISection>('ui-designer', { concept });
    const gameplayTechnical = await run<GameplayTechnicalSection>('gameplay-programmer', {
      analysis,
      concept,
    });

    const spec = assembleGameSpec({
      concept,
      story,
      characters,
      npcs,
      environment,
      world,
      ui,
      gameplayTechnical,
    });

    return { spec, agentResults };
  }

  private async ensurePrompt(prompt?: string): Promise<GameUnderstanding> {
    if (!prompt || prompt.trim().length === 0) {
      throw new AppError({
        code: 'BAD_REQUEST',
        message: 'Either "prompt" or "analysis" must be provided.',
        statusCode: 400,
      });
    }
    return this.promptParser.analyze(prompt);
  }
}
