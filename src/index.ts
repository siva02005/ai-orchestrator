/**
 * ai-orchestrator — public library surface.
 * Teams integrate via `buildEngine()` + the HTTP API, or by importing the
 * schemas and classes directly (no frontend/game-engine coupling).
 */

export { buildEngine, BuildEngineOptions, AIEngineInstance } from './engine.js';
export { buildServer, AIEngine } from './api/routes.js';
export { loadConfig, AppConfig } from './config.js';

// Providers
export { AIProvider, GenerateParams, GenerateResult, Usage, zodToJson, extractJson } from './ai/provider.js';
export { ProviderRegistry, ProviderRegistryConfig } from './ai/registry.js';
export { OpenAIProvider, OpenAIProviderConfig } from './ai/providers/openai.js';
export { AnthropicProvider, AnthropicProviderConfig } from './ai/providers/anthropic.js';
export { MockProvider } from './ai/providers/mock.js';
export { generateStructured, StructuredGenerateOptions } from './ai/structured.js';

// Pipeline
export { Orchestrator, OrchestratorOptions } from './pipeline/orchestrator.js';
export { PromptParser } from './pipeline/prompt-parser.js';
export { SpecGenerator, GenerateSpecInput, GenerateSpecResult } from './pipeline/spec-generator.js';
export { assembleGameSpec, SpecSections } from './pipeline/spec-assembler.js';
export { TaskPlanner } from './pipeline/task-planner.js';

// Agents
export { Agent, AgentRunContext } from './agents/base.js';
export { AgentRegistry } from './agents/registry.js';
export {
  GameConceptSchema,
  StorySectionSchema,
  CharactersSectionSchema,
  NPCSectionSchema,
  EnvironmentSectionSchema,
  WorldSectionSchema,
  UISectionSchema,
  GameplayTechnicalSectionSchema,
  TestPlanSectionSchema,
  BugFixOutputSchema,
} from './agents/schemas.js';
export { PromptAnalyzerAgent } from './agents/definitions/prompt-analyzer.js';

// Managers
export { AgentManager, RunAgentOptions } from './manager/agent-manager.js';
export { TaskManager, TaskExecutionResult } from './manager/task-manager.js';
export { JobManager, JobContext, JobHandler } from './manager/job-manager.js';
export { validate, ValidationResult, ValidationIssue } from './manager/validation.js';

// Types & schemas
export { GameUnderstandingSchema, GameUnderstanding } from './types/analysis.js';
export {
  GameSpecSchema,
  GameSpec,
  GAME_SPEC_SCHEMA_VERSION,
} from './types/game-spec.js';
export {
  AGENT_NAMES,
  INTERNAL_AGENT_NAMES,
  AgentName,
  AgentMetadata,
  AgentRunResult,
  AgentTraceEntry,
} from './types/agents.js';
export {
  Job,
  JobType,
  JobStatus,
  JobError,
  JobLogEntry,
  TaskPlan,
  Task,
  TaskPlanSchema,
  TaskSchema,
} from './types/jobs.js';

// Core
export {
  AppError,
  ValidationError,
  BadRequestError,
  NotFoundError,
  AgentNotFoundError,
  ProviderError,
  ProviderRateLimitError,
  InvalidLLMOutputError,
  AgentRunFailedError,
  formatZodIssues,
} from './core/errors.js';
export { Logger } from './core/logger.js';
export { retry, RetryOptions, RetryResult, isRetryable, backoffDelay } from './core/retry.js';
