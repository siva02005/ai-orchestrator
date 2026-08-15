import { AgentRegistry } from '../agents/registry.js';
import { Agent } from '../agents/base.js';
import { ProviderRegistry } from '../ai/registry.js';
import { Logger } from '../core/logger.js';
import { RetryOptions } from '../core/retry.js';
import { AgentRunResult } from '../types/agents.js';
import { AgentMetadata } from '../types/agents.js';

export interface AgentManagerOptions {
  agentRegistry: AgentRegistry;
  providerRegistry: ProviderRegistry;
  logger?: Logger;
  providerRetry?: RetryOptions;
}

export interface RunAgentOptions {
  provider?: string;
  maxOutputAttempts?: number;
  temperature?: number;
  signal?: AbortSignal;
  jobId?: string;
}

/**
 * =====================================================================
 * AGENT MANAGER (Phase 4)
 * =====================================================================
 * Coordinates agent execution: resolves the agent and the AI provider,
 * attaches logging, and returns a structured AgentRunResult. It never
 * throws for agent failures — the result carries the error so callers can
 * decide (retry, fail the job, route to the bug-fix agent).
 * =====================================================================
 */
export class AgentManager {
  private readonly registry: AgentRegistry;
  private readonly providers: ProviderRegistry;
  private readonly logger: Logger;
  private readonly providerRetry?: RetryOptions;

  constructor(options: AgentManagerOptions) {
    this.registry = options.agentRegistry;
    this.providers = options.providerRegistry;
    this.logger = options.logger ?? new Logger('agent-manager');
    this.providerRetry = options.providerRetry;
  }

  getAgent(name: string): Agent {
    return this.registry.get(name);
  }

  listAgents(): AgentMetadata[] {
    return this.registry.metadata();
  }

  async runAgent(name: string, input: unknown, options: RunAgentOptions = {}): Promise<AgentRunResult> {
    const agent = this.registry.get(name);
    const provider = this.providers.get(options.provider);
    const logger = new Logger(`agent:${name}${options.jobId ? `#${options.jobId}` : ''}`);

    this.logger.info(`Running agent "${name}" with provider "${provider.name}"`, { jobId: options.jobId });

    const result = await agent.run(input, {
      provider,
      logger,
      providerRetry: this.providerRetry,
      maxOutputAttempts: options.maxOutputAttempts,
      temperature: options.temperature,
      signal: options.signal,
    });

    this.logger.info(`Agent "${name}" finished with status "${result.status}"`, {
      jobId: options.jobId,
      attempts: result.attempts,
      durationMs: result.durationMs,
    });

    return result;
  }
}
