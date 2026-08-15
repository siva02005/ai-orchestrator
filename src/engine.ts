import { ProviderRegistry } from './ai/registry.js';
import { AgentRegistry } from './agents/registry.js';
import { AgentManager } from './manager/agent-manager.js';
import { JobManager } from './manager/job-manager.js';
import { Orchestrator } from './pipeline/orchestrator.js';
import { AppConfig, loadConfig } from './config.js';
import { RetryOptions } from './core/retry.js';

export interface BuildEngineOptions {
  config?: AppConfig;
  providers?: ProviderRegistry;
  agentRegistry?: AgentRegistry;
  retry?: RetryOptions;
  maxJobAttempts?: number;
}

/**
 * Assemble the full AI engine: providers, agent registry, managers and
 * the orchestrator pipeline. This is the single entry point for tests and
 * integrations.
 */
export function buildEngine(options: BuildEngineOptions = {}) {
  const config = options.config ?? loadConfig();
  const providers =
    options.providers ??
    new ProviderRegistry({
      openai: config.providers.openai,
      anthropic: config.providers.anthropic,
      default: config.providers.default,
    });
  const agentRegistry = options.agentRegistry ?? new AgentRegistry();
  const agentManager = new AgentManager({
    agentRegistry,
    providerRegistry: providers,
    providerRetry: options.retry ?? config.retry,
  });
  const jobManager = new JobManager({
    maxJobAttempts: options.maxJobAttempts ?? config.job.maxJobAttempts,
  });
  const orchestrator = new Orchestrator({ agents: agentManager });

  return { orchestrator, agentManager, jobManager, providers, agentRegistry };
}

export type AIEngineInstance = ReturnType<typeof buildEngine>;
