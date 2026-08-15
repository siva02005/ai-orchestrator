import { AgentManager } from '../manager/agent-manager.js';
import { PromptParser, AnalyzeOptions } from './prompt-parser.js';
import { SpecGenerator, GenerateSpecInput, GenerateSpecResult } from './spec-generator.js';
import { TaskPlanner } from './task-planner.js';
import { GameSpec } from '../types/game-spec.js';
import { GameUnderstanding } from '../types/analysis.js';
import { TaskPlan } from '../types/jobs.js';

export interface OrchestratorOptions {
  agents: AgentManager;
  taskPlanner?: TaskPlanner;
}

/**
 * =====================================================================
 * ORCHESTRATOR
 * =====================================================================
 * Top-level entry point of the AI engine. Composes the full pipeline:
 *   User prompt → Game Understanding → Specification → Task Plan
 * It is used by the HTTP API and by integrations, and never depends on
 * frontend or game-engine code.
 * =====================================================================
 */
export class Orchestrator {
  readonly promptParser: PromptParser;
  readonly specGenerator: SpecGenerator;
  readonly taskPlanner: TaskPlanner;

  constructor(options: OrchestratorOptions) {
    this.promptParser = new PromptParser(options.agents);
    this.specGenerator = new SpecGenerator(options.agents, this.promptParser);
    this.taskPlanner = options.taskPlanner ?? new TaskPlanner();
  }

  /** Phase 1 — analyze a user prompt into structured game understanding. */
  analyze(prompt: string, options?: AnalyzeOptions): Promise<GameUnderstanding> {
    return this.promptParser.analyze(prompt, options);
  }

  /** Phase 2 — generate a full validated game specification. */
  generateSpec(input: GenerateSpecInput): Promise<GenerateSpecResult> {
    return this.specGenerator.generate(input);
  }

  /** Phase 3 — turn a specification into an ordered task plan. */
  createTaskPlan(spec: GameSpec): TaskPlan {
    return this.taskPlanner.createPlan(spec);
  }
}
