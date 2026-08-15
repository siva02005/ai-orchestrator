import { randomUUID } from 'node:crypto';
import { Logger } from '../core/logger.js';
import { AppError, NotFoundError } from '../core/errors.js';
import { isRetryable, sleep } from '../core/retry.js';
import { Job, JobError, JobLogEntry, JobType } from '../types/jobs.js';

export interface JobContext {
  jobId: string;
  logger: Logger;
}

export type JobHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  ctx: JobContext,
) => Promise<TOutput>;

export interface JobManagerOptions {
  /** Job-level retries on retryable handler failures. Default 1 (no retry). */
  maxJobAttempts?: number;
  baseRetryDelayMs?: number;
}

/**
 * =====================================================================
 * JOB MANAGER
 * =====================================================================
 * In-memory job lifecycle for long-running operations (spec generation,
 * task planning, agent runs). Each job keeps a structured log that can be
 * fetched via GET /api/ai/logs/{job_id}.
 *
 * NOTE: this is an in-process store. For horizontal scaling, replace it
 * with a JobStore implementation backed by Redis/DB — the API surface
 * (submit/get/logs/waitFor) stays the same.
 * =====================================================================
 */
export class JobManager {
  private readonly jobs = new Map<string, Job>();
  private readonly logs = new Map<string, JobLogEntry[]>();
  private readonly completions = new Map<string, Promise<Job>>();
  private readonly maxJobAttempts: number;
  private readonly baseRetryDelayMs: number;

  constructor(options: JobManagerOptions = {}) {
    this.maxJobAttempts = options.maxJobAttempts ?? 1;
    this.baseRetryDelayMs = options.baseRetryDelayMs ?? 500;
  }

  submit<TInput, TOutput>(
    type: JobType,
    input: TInput,
    handler: JobHandler<TInput, TOutput>,
  ): Job<TInput, TOutput> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const job: Job<TInput, TOutput> = {
      id,
      type,
      status: 'pending',
      input,
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(id, job as Job);
    this.completions.set(
      id,
      this.execute(type, input, handler, job as Job),
    );
    return job;
  }

  private async execute<TInput, TOutput>(
    type: JobType,
    input: TInput,
    handler: JobHandler<TInput, TOutput>,
    job: Job,
  ): Promise<Job> {
    for (let attempt = 1; attempt <= this.maxJobAttempts; attempt += 1) {
      job.attempts = attempt;
      job.status = 'running';
      job.startedAt = new Date().toISOString();
      job.updatedAt = job.startedAt;

      const logger = new Logger(`job:${type}:${job.id}`);
      logger.info(`Job started (attempt ${attempt}/${this.maxJobAttempts}).`);

      try {
        const output = await handler(input, { jobId: job.id, logger });
        job.output = output;
        job.status = 'completed';
        job.error = undefined;
        job.finishedAt = new Date().toISOString();
        job.updatedAt = job.finishedAt;
        logger.info(`Job completed.`);
        this.logs.set(job.id, logger.entries());
        return job;
      } catch (error) {
        const jobError = toJobError(error);
        logger.error(`Job failed: ${jobError.message}`, jobError);
        this.logs.set(job.id, logger.entries());

        if (jobError.retryable && attempt < this.maxJobAttempts) {
          job.error = jobError;
          job.updatedAt = new Date().toISOString();
          logger.warn(`Retrying job (attempt ${attempt + 1}/${this.maxJobAttempts})...`);
          await sleep(this.baseRetryDelayMs * attempt);
          continue;
        }

        job.status = 'failed';
        job.error = jobError;
        job.finishedAt = new Date().toISOString();
        job.updatedAt = job.finishedAt;
        return job;
      }
    }
    return job;
  }

  getJob(id: string): Job {
    const job = this.jobs.get(id);
    if (!job) throw new NotFoundError(`Job "${id}" not found.`);
    return job;
  }

  getLogs(id: string): JobLogEntry[] {
    if (!this.jobs.has(id)) throw new NotFoundError(`Job "${id}" not found.`);
    return this.logs.get(id) ?? [];
  }

  /** Resolves when the job finishes (completed or failed). */
  async waitFor(id: string): Promise<Job> {
    const completion = this.completions.get(id);
    if (!completion) throw new NotFoundError(`Job "${id}" not found.`);
    return completion;
  }

  listJobs(): Job[] {
    return [...this.jobs.values()];
  }
}

export function toJobError(error: unknown): JobError {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      ...(error.details !== undefined ? { details: error.details } : {}),
    };
  }
  return {
    code: 'JOB_RUN_FAILED',
    message: error instanceof Error ? error.message : String(error),
    retryable: isRetryable(error),
  };
}
