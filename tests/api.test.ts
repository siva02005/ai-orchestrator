import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createTestEngine, SAMPLE_PROMPT } from './helpers.js';
import { buildServer, AIEngine } from '../src/api/routes.js';
import type { FastifyInstance } from 'fastify';
import { GameSpecSchema } from '../src/types/game-spec.js';
import { GameUnderstandingSchema } from '../src/types/analysis.js';
import { TaskPlanSchema } from '../src/types/jobs.js';

describe('HTTP API', () => {
  let engine: AIEngine;
  let app: FastifyInstance;

  beforeAll(async () => {
    engine = createTestEngine();
    app = await buildServer(engine);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns service info', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.providers).toContain('mock');
  });

  it('POST /api/ai/analyze-prompt returns structured understanding', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/analyze-prompt',
      payload: { prompt: SAMPLE_PROMPT },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(GameUnderstandingSchema.safeParse(body.analysis).success).toBe(true);
  });

  it('POST /api/ai/analyze-prompt rejects missing prompt with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/analyze-prompt',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/ai/generate-specification (wait=true) returns a completed job', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/generate-specification',
      payload: { prompt: SAMPLE_PROMPT, wait: true },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.job.status).toBe('completed');
    expect(GameSpecSchema.safeParse(body.job.output.spec).success).toBe(true);
  });

  it('POST /api/ai/generate-specification (no wait) returns a pending job that completes', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/generate-specification',
      payload: { prompt: SAMPLE_PROMPT },
    });
    const job = res.json().job;
    expect(res.statusCode).toBe(200);
    expect(job.id).toBeTruthy();
    expect(['pending', 'running', 'completed']).toContain(job.status);

    const finished = await engine.jobManager.waitFor(job.id);
    expect(finished.status).toBe('completed');
    expect(GameSpecSchema.safeParse(finished.output.spec).success).toBe(true);
  });

  it('POST /api/ai/generate-specification rejects when no prompt or analysis', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/generate-specification',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.details[0].path).toBe('prompt');
  });

  it('POST /api/ai/create-task-plan returns a plan', async () => {
    const spec = await generateSpec();
    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/create-task-plan',
      payload: { spec, wait: true },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.job.status).toBe('completed');
    expect(TaskPlanSchema.safeParse(body.job.output).success).toBe(true);
  });

  it('POST /api/ai/run-agent runs a named agent and returns its result', async () => {
    const analysis = await engine.orchestrator.analyze(SAMPLE_PROMPT);
    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/run-agent',
      payload: { agent: 'game-designer', input: analysis, wait: true },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.job.status).toBe('completed');
    expect(body.job.output.status).toBe('completed');
    expect(body.job.output.agent).toBe('game-designer');
  });

  it('POST /api/ai/run-agent rejects unknown agents', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/run-agent',
      payload: { agent: 'faker', input: {} },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/ai/execute-task-plan runs the full plan', async () => {
    const spec = await generateSpec();
    const plan = engine.orchestrator.createTaskPlan(spec);
    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/execute-task-plan',
      payload: { plan, wait: true },
    });
    expect(res.statusCode).toBe(200);
    const results = res.json().job.output.results;
    expect(results.length).toBe(plan.tasks.length);
    expect(results.every((r: { status: string }) => r.status === 'completed')).toBe(true);
  });

  it('GET /api/ai/jobs/{id} returns a stored job', async () => {
    const jobId = await createGenerateJob();
    const res = await app.inject({ method: 'GET', url: `/api/ai/jobs/${jobId}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().job.id).toBe(jobId);
  });

  it('GET /api/ai/logs/{id} returns job logs', async () => {
    const jobId = await createGenerateJob();
    await engine.jobManager.waitFor(jobId);
    const res = await app.inject({ method: 'GET', url: `/api/ai/logs/${jobId}` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.job_id).toBe(jobId);
    expect(Array.isArray(body.logs)).toBe(true);
    expect(body.logs.length).toBeGreaterThan(0);
  });

  it('GET /api/ai/jobs/{id} returns 404 for unknown jobs', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/ai/jobs/does-not-exist' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('JOB_NOT_FOUND');
  });

  it('GET /api/ai/agents lists all agents with metadata', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/ai/agents' });
    expect(res.statusCode).toBe(200);
    const agents = res.json().agents;
    expect(agents.length).toBeGreaterThanOrEqual(11);
    expect(agents[0]).toHaveProperty('name');
    expect(agents[0]).toHaveProperty('title');
    expect(agents[0]).toHaveProperty('produces');
  });

  // ---------------------------------------------------------------- helpers
  async function generateSpec(): Promise<unknown> {
    const result = await engine.orchestrator.generateSpec({ prompt: SAMPLE_PROMPT });
    return result.spec;
  }

  async function createGenerateJob(): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/generate-specification',
      payload: { prompt: SAMPLE_PROMPT },
    });
    return res.json().job.id;
  }
});
