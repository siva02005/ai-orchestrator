import { AgentManager } from '../manager/agent-manager.js';
import { AppError } from '../core/errors.js';
import { GameUnderstanding } from '../types/analysis.js';

export interface AnalyzeOptions {
  provider?: string;
  signal?: AbortSignal;
  maxOutputAttempts?: number;
}

/**
 * Phase 1 — Prompt Understanding.
 * Thin wrapper over the prompt-analyzer agent that turns a
 * natural-language prompt into a structured GameUnderstanding.
 */
export class PromptParser {
  constructor(private readonly agents: AgentManager) {}

  async analyze(prompt: string, options: AnalyzeOptions = {}): Promise<GameUnderstanding> {
    const result = await this.agents.runAgent('prompt-analyzer', { prompt }, options);
    if (result.status === 'failed') {
      throw new AppError({
        code: 'AGENT_RUN_FAILED',
        message: `Prompt analysis failed: ${result.error?.message ?? 'unknown error'}`,
        retryable: result.error?.retryable ?? true,
        statusCode: 502,
      });
    }
    const output = result.output as GameUnderstanding;
    output.original_prompt = prompt;
    return output;
  }
}
