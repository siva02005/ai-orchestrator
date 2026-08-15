import { z } from 'zod';
import { Logger } from '../core/logger.js';
import { AgentInputInvalidError, AgentRunFailedError, AppError, formatZodIssues } from '../core/errors.js';
import { RetryOptions } from '../core/retry.js';
import { AIProvider } from '../ai/provider.js';
import { generateStructured } from '../ai/structured.js';
import {
  AgentMetadata,
  AnyAgentName,
  AgentRunResult,
  AgentTraceEntry,
} from '../types/agents.js';

export interface AgentRunContext {
  provider: AIProvider;
  logger?: Logger;
  /** Retry policy for transient provider failures. */
  providerRetry?: RetryOptions;
  /** Self-correction attempts for invalid LLM output (default 3). */
  maxOutputAttempts?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export interface AgentRunOptions {
  /** Optional override so callers can label runs in logs. */
  jobId?: string;
}

/**
 * =====================================================================
 * AGENT FRAMEWORK
 * =====================================================================
 * Every specialized agent extends this base and must provide:
 *   - inputSchema       (validation of inputs)
 *   - outputSchema      (validation of outputs)
 *   - buildSystemPrompt (system instructions)
 *   - buildUserPrompt   (how the input is presented to the model)
 * The base provides: input validation, structured generation with output
 * validation + self-correction retries, error handling, tracing and
 * logging. `run()` never throws — it returns an AgentRunResult so callers
 * (job system, task manager) can reason about failures explicitly.
 * =====================================================================
 */
export abstract class Agent<I = unknown, O = unknown> {
  abstract readonly name: AnyAgentName;
  abstract readonly title: string;
  abstract readonly description: string;
  abstract readonly produces: string[];
  abstract readonly dependencies: string[];
  abstract readonly inputSchema: z.ZodType<I>;
  abstract readonly outputSchema: z.ZodType<O>;

  /** System-level instructions describing this agent's role. */
  abstract buildSystemPrompt(): string;

  /** User message presenting the concrete input to the model. */
  abstract buildUserPrompt(input: I): string;

  metadata(): AgentMetadata {
    return {
      name: this.name,
      title: this.title,
      description: this.description,
      produces: this.produces,
      dependencies: this.dependencies,
    };
  }

  async run(
    input: unknown,
    ctx: AgentRunContext,
    _options?: AgentRunOptions,
  ): Promise<AgentRunResult<O>> {
    const startedAt = Date.now();
    const trace: AgentTraceEntry[] = [];
    const logger = ctx.logger ?? new Logger(this.name);
    const pushTrace = (entry: Omit<AgentTraceEntry, 'at'>): void => {
      trace.push({ ...entry, at: new Date().toISOString() });
    };

    // -------- 1. Input validation -------------------------------------
    const inputResult = this.inputSchema.safeParse(input);
    if (!inputResult.success) {
      pushTrace({ attempt: 0, action: 'validate_input', ok: false, detail: this.name });
      logger.error(`Input validation failed for agent "${this.name}"`, {
        issues: formatZodIssues(inputResult.error),
      });
      return {
        agent: this.name,
        status: 'failed',
        output: null,
        error: {
          code: 'AGENT_INPUT_INVALID',
          message: `Input for agent "${this.name}" failed validation.`,
          retryable: false,
        },
        attempts: 0,
        provider: ctx.provider.name,
        durationMs: Date.now() - startedAt,
        trace,
      };
    }
    pushTrace({ attempt: 0, action: 'validate_input', ok: true });
    logger.debug(`Agent "${this.name}": input validated`);

    // -------- 2. Structured generation with validation + retry --------
    try {
      const result = await generateStructured<O>({
        provider: ctx.provider,
        system: this.buildSystemPrompt(),
        prompt: this.buildUserPrompt(inputResult.data),
        schema: this.outputSchema,
        maxAttempts: ctx.maxOutputAttempts ?? 3,
        temperature: ctx.temperature ?? 0.2,
        signal: ctx.signal,
        providerRetry: ctx.providerRetry,
        onAttempt: ({ attempt, error }) => {
          if (error) {
            pushTrace({ attempt, action: 'retry', ok: false, detail: summarizeError(error) });
            logger.warn(`Agent "${this.name}" attempt ${attempt} failed: ${summarizeError(error)}`);
          } else {
            pushTrace({ attempt, action: 'generate', ok: true });
          }
        },
      });

      pushTrace({ attempt: result.attempts, action: 'validate_output', ok: true });
      logger.info(
        `Agent "${this.name}" completed in ${result.attempts} attempt(s) via ${result.provider}`,
        { usage: result.usage },
      );

      return {
        agent: this.name,
        status: 'completed',
        output: result.output,
        attempts: result.attempts,
        provider: result.provider,
        durationMs: Date.now() - startedAt,
        trace,
      };
    } catch (error) {
      const normalized = normalizeError(error);
      pushTrace({
        attempt: trace.filter((t) => t.attempt > 0).length + 1,
        action: 'retry',
        ok: false,
        detail: normalized.message,
      });
      logger.error(`Agent "${this.name}" failed: ${normalized.message}`, { code: normalized.code });

      return {
        agent: this.name,
        status: 'failed',
        output: null,
        error: {
          code: normalized.code,
          message: normalized.message,
          retryable: normalized.retryable,
        },
        attempts: trace.filter((t) => t.attempt > 0).length || 1,
        provider: ctx.provider.name,
        durationMs: Date.now() - startedAt,
        trace,
      };
    }
  }
}

function summarizeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function normalizeError(error: unknown): { code: string; message: string; retryable: boolean } {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message, retryable: error.retryable };
  }
  if (error instanceof z.ZodError) {
    return {
      code: 'AGENT_OUTPUT_INVALID',
      message: formatZodIssues(error).map((i) => `${(i as { path: string }).path}: ${(i as { message: string }).message}`).join('; '),
      retryable: true,
    };
  }
  return { code: 'AGENT_RUN_FAILED', message: String(error), retryable: true };
}

export { AgentInputInvalidError, AgentRunFailedError };
