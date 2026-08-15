import { describe, expect, it } from 'vitest';
import { createTestEngine, SAMPLE_PROMPT } from './helpers.js';
import { NotFoundError } from '../src/core/errors.js';
import { GameSpecSchema } from '../src/types/game-spec.js';
import { JobManager } from '../src/manager/job-manager.js';

describe('Job manager', () => {
  it('runs a job and stores structured logs', async () => {
    const engine = createTestEngine();
    const job = engine.jobManager.submit(
      'generate-specification',
      { prompt: SAMPLE_PROMPT },
      async (input) => {
        const result = await engine.orchestrator.generateSpec(input);
        return result;
      },
    );

    const finished = await engine.jobManager.waitFor(job.id);
    expect(finished.status).toBe('completed');
    expect(finished.attempts).toBe(1);
    expect(GameSpecSchema.safeParse(finished.output.spec).success).toBe(true);
    expect(finished.finishedAt).toBeTruthy();
    expect(finished.startedAt).toBeTruthy();

    const logs = engine.jobManager.getLogs(job.id);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.some((l) => l.message.includes('completed'))).toBe(true);
  });

  it('returns the same job via getJob', async () => {
    const engine = createTestEngine();
    const job = engine.jobManager.submit('run-agent', { agent: 'ui-designer', input: { concept: { game_name: 'x' } } }, async () => ({ ok: true }));
    await engine.jobManager.waitFor(job.id);
    expect(engine.jobManager.getJob(job.id).id).toBe(job.id);
  });

  it('marks jobs as failed when the handler throws', async () => {
    const jobManager = new JobManager({ maxJobAttempts: 1 });
    const job = jobManager.submit('run-agent', {}, async () => {
      throw new Error('handler blew up');
    });
    const finished = await jobManager.waitFor(job.id);
    expect(finished.status).toBe('failed');
    expect(finished.error?.code).toBe('JOB_RUN_FAILED');
    expect(finished.error?.retryable).toBe(false);
  });

  it('retries retryable job failures up to maxJobAttempts', async () => {
    const jobManager = new JobManager({ maxJobAttempts: 3, baseRetryDelayMs: 1 });
    let calls = 0;
    const job = jobManager.submit('run-agent', {}, async () => {
      calls += 1;
      if (calls < 3) throw new Error('fetch failed: transient');
      return { ok: true };
    });
    const finished = await jobManager.waitFor(job.id);
    expect(finished.status).toBe('completed');
    expect(calls).toBe(3);
    expect(finished.attempts).toBe(3);
  });

  it('throws NotFoundError for unknown jobs and logs', async () => {
    const engine = createTestEngine();
    expect(() => engine.jobManager.getJob('nope')).toThrow(NotFoundError);
    expect(() => engine.jobManager.getLogs('nope')).toThrow(NotFoundError);
  });
});
