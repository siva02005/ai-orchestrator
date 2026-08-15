import { z } from 'zod';

/**
 * Error hierarchy for the orchestrator. Every error exposed through the
 * HTTP API is serialized as `{ code, message, retryable, details }`.
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'PROVIDER_ERROR'
  | 'PROVIDER_RATE_LIMIT'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'INVALID_LLM_OUTPUT'
  | 'AGENT_NOT_FOUND'
  | 'AGENT_INPUT_INVALID'
  | 'AGENT_OUTPUT_INVALID'
  | 'AGENT_RUN_FAILED'
  | 'JOB_NOT_FOUND'
  | 'JOB_RUN_FAILED'
  | 'BAD_REQUEST'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly details?: unknown;
  readonly statusCode: number;

  constructor(opts: {
    code: ErrorCode;
    message: string;
    retryable?: boolean;
    details?: unknown;
    statusCode?: number;
    cause?: unknown;
  }) {
    super(opts.message, { cause: opts.cause });
    this.name = 'AppError';
    this.code = opts.code;
    this.retryable = opts.retryable ?? false;
    this.details = opts.details;
    this.statusCode = opts.statusCode ?? 500;
  }

  toJSON(): { code: ErrorCode; message: string; retryable: boolean; details?: unknown } {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      ...(this.details !== undefined ? { details: this.details } : {}),
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super({ code: 'VALIDATION_ERROR', message, details, statusCode: 400 });
    this.name = 'ValidationError';
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super({ code: 'BAD_REQUEST', message, details, statusCode: 400 });
    this.name = 'BadRequestError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super({ code: 'JOB_NOT_FOUND', message, details, statusCode: 404 });
    this.name = 'NotFoundError';
  }
}

export class AgentNotFoundError extends AppError {
  constructor(agentName: string) {
    super({
      code: 'AGENT_NOT_FOUND',
      message: `Unknown agent "${agentName}".`,
      statusCode: 404,
    });
    this.name = 'AgentNotFoundError';
  }
}

export class ProviderError extends AppError {
  constructor(
    message: string,
    opts: { retryable?: boolean; statusCode?: number; details?: unknown; cause?: unknown } = {},
  ) {
    super({ code: 'PROVIDER_ERROR', message, ...opts, statusCode: opts.statusCode ?? 502 });
    this.name = 'ProviderError';
  }
}

export class ProviderRateLimitError extends ProviderError {
  constructor(
    message: string,
    opts: { retryAfterMs?: number; details?: unknown; cause?: unknown } = {},
  ) {
    super(message, {
      retryable: true,
      statusCode: 429,
      details: {
        retryAfterMs: opts.retryAfterMs,
        ...(opts.details ? { upstream: opts.details } : {}),
      },
      cause: opts.cause,
    });
    this.name = 'ProviderRateLimitError';
  }
}

export class InvalidLLMOutputError extends AppError {
  constructor(message: string, details?: unknown) {
    super({ code: 'INVALID_LLM_OUTPUT', message, retryable: true, details });
    this.name = 'InvalidLLMOutputError';
  }
}

export class AgentInputInvalidError extends AppError {
  constructor(agentName: string, issue: z.ZodError) {
    super({
      code: 'AGENT_INPUT_INVALID',
      message: `Input for agent "${agentName}" failed validation.`,
      details: formatZodIssues(issue),
      statusCode: 400,
    });
    this.name = 'AgentInputInvalidError';
  }
}

export class AgentOutputInvalidError extends AppError {
  constructor(agentName: string, issue: z.ZodError, attempts: number) {
    super({
      code: 'AGENT_OUTPUT_INVALID',
      message: `Agent "${agentName}" produced output that failed validation after ${attempts} attempt(s).`,
      retryable: true,
      details: formatZodIssues(issue),
    });
    this.name = 'AgentOutputInvalidError';
  }
}

export class AgentRunFailedError extends AppError {
  constructor(agentName: string, cause: unknown) {
    super({
      code: 'AGENT_RUN_FAILED',
      message: `Agent "${agentName}" failed to run.`,
      retryable: true,
      cause,
    });
    this.name = 'AgentRunFailedError';
  }
}

export function formatZodIssues(issue: z.ZodError): unknown[] {
  return issue.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message,
    code: i.code,
  }));
}
