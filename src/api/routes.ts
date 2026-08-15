import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Orchestrator } from '../pipeline/orchestrator.js';
import { AgentManager } from '../manager/agent-manager.js';
import { JobManager } from '../manager/job-manager.js';
import { ProviderRegistry } from '../ai/registry.js';
import { AppError, ValidationError } from '../core/errors.js';
import { toValidationIssues } from '../manager/validation.js';
import {
  AnalyzePromptRequestSchema,
  CreateTaskPlanRequestSchema,
  ExecuteTaskPlanRequestSchema,
  GenerateSpecRequestSchema,
  RunAgentRequestSchema,
} from './schemas.js';

/**
 * =====================================================================
 * AI ENGINE — dependency wiring + HTTP routes
 * =====================================================================
 * Exposes the API contract:
 *   POST /api/ai/analyze-prompt
 *   POST /api/ai/generate-specification
 *   POST /api/ai/create-task-plan
 *   POST /api/ai/run-agent
 *   GET  /api/ai/jobs/{job_id}
 *   GET  /api/ai/logs/{job_id}
 * plus discovery helpers and a health check.
 * =====================================================================
 */
export interface AIEngine {
  orchestrator: Orchestrator;
  agentManager: AgentManager;
  jobManager: JobManager;
  providers: ProviderRegistry;
}

export async function buildServer(engine: AIEngine): Promise<FastifyInstance> {
  const { default: Fastify } = await import('fastify');
  const app = Fastify({ logger: false });

  // ---------------------------------------------------------------- health
  app.get('/health', async () => ({
    ok: true,
    service: 'ai-orchestrator',
    providers: engine.providers.list(),
    defaultProvider: engine.providers.defaultProviderName,
    agents: engine.agentManager.listAgents().length,
    jobs: engine.jobManager.listJobs().length,
  }));

  // ------------------------------------------------------- agent discovery
  app.get('/api/ai/agents', async () => ({
    ok: true,
    agents: engine.agentManager.listAgents(),
  }));

  app.get('/api/ai/providers', async () => ({
    ok: true,
    providers: engine.providers.list(),
    defaultProvider: engine.providers.defaultProviderName,
  }));

  // ------------------------------------------- POST /api/ai/analyze-prompt
  app.post('/api/ai/analyze-prompt', async (req, reply) => {
    const body = parseBody(AnalyzePromptRequestSchema, req.body);
    const analysis = await engine.orchestrator.analyze(body.prompt, {
      provider: body.provider,
    });
    return reply.send({ ok: true, analysis });
  });

  // ---------------------------------- POST /api/ai/generate-specification
  app.post('/api/ai/generate-specification', async (req, reply) => {
    const body = parseBody(GenerateSpecRequestSchema, req.body);
    const job = engine.jobManager.submit(
      'generate-specification',
      { prompt: body.prompt, analysis: body.analysis, provider: body.provider },
      async (input) => {
        const result = await engine.orchestrator.generateSpec(input);
        return result;
      },
    );
    return reply.send({ ok: true, job: await maybeWait(engine, job.id, body.wait) });
  });

  // -------------------------------------- POST /api/ai/create-task-plan
  app.post('/api/ai/create-task-plan', async (req, reply) => {
    const body = parseBody(CreateTaskPlanRequestSchema, req.body);
    const job = engine.jobManager.submit(
      'create-task-plan',
      { spec: body.spec },
      async (input) => engine.orchestrator.createTaskPlan(input.spec),
    );
    return reply.send({ ok: true, job: await maybeWait(engine, job.id, body.wait) });
  });

  // -------------------------------------------- POST /api/ai/run-agent
  app.post('/api/ai/run-agent', async (req, reply) => {
    const body = parseBody(RunAgentRequestSchema, req.body);
    const job = engine.jobManager.submit(
      'run-agent',
      body,
      async (input) =>
        engine.agentManager.runAgent(input.agent, input.input, {
          provider: input.provider,
          maxOutputAttempts: input.maxOutputAttempts,
          temperature: input.temperature,
        }),
    );
    return reply.send({ ok: true, job: await maybeWait(engine, job.id, body.wait) });
  });

  // ------------------------------------- POST /api/ai/execute-task-plan
  app.post('/api/ai/execute-task-plan', async (req, reply) => {
    const body = parseBody(ExecuteTaskPlanRequestSchema, req.body);
    const { TaskManager } = await import('../manager/task-manager.js');
    const taskManager = new TaskManager({ agentManager: engine.agentManager });
    const job = engine.jobManager.submit('execute-task-plan', { plan: body.plan }, async (input) => {
      const results = await taskManager.executePlan(input.plan);
      return { results };
    });
    return reply.send({ ok: true, job: await maybeWait(engine, job.id, body.wait) });
  });

  // ---------------------------------------------- GET /api/ai/jobs/{job_id}
  app.get('/api/ai/jobs/:jobId', async (req, reply) => {
    const { jobId } = req.params as { jobId: string };
    const job = engine.jobManager.getJob(jobId);
    return reply.send({ ok: true, job });
  });

  // --------------------------------------------- GET /api/ai/logs/{job_id}
  app.get('/api/ai/logs/:jobId', async (req, reply) => {
    const { jobId } = req.params as { jobId: string };
    const logs = engine.jobManager.getLogs(jobId);
    return reply.send({ ok: true, job_id: jobId, logs });
  });

  // ------------------------------------------------------------ errors
  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request failed validation.',
          retryable: false,
          details: toValidationIssues(error),
        },
      });
    }
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ ok: false, error: error.toJSON() });
    }
    const status =
      typeof (error as { statusCode?: number }).statusCode === 'number'
        ? (error as { statusCode: number }).statusCode
        : 500;
    return reply.status(status).send({
      ok: false,
      error: {
        code: status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : String(error),
        retryable: false,
      },
    });
  });

  return app;
}

function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Request failed validation.', toValidationIssues(result.error));
  }
  return result.data;
}

async function maybeWait(engine: AIEngine, jobId: string, wait?: boolean): Promise<unknown> {
  if (wait === true) {
    const finished = await engine.jobManager.waitFor(jobId);
    return finished;
  }
  return engine.jobManager.getJob(jobId);
}
