import { z } from 'zod';
import { GameUnderstandingSchema } from '../types/analysis.js';
import { GameSpecSchema } from '../types/game-spec.js';
import { AgentNameSchema } from '../types/agents.js';
import { TaskPlanSchema } from '../types/jobs.js';

/** POST /api/ai/analyze-prompt */
export const AnalyzePromptRequestSchema = z.object({
  prompt: z.string().min(1, 'prompt is required'),
  provider: z.string().optional(),
});

/** POST /api/ai/generate-specification */
export const GenerateSpecRequestSchema = z
  .object({
    prompt: z.string().min(1).optional(),
    analysis: GameUnderstandingSchema.optional(),
    provider: z.string().optional(),
    /** When true the endpoint blocks until the job finishes. */
    wait: z.boolean().optional(),
  })
  .refine((d) => d.prompt || d.analysis, {
    message: 'Either "prompt" or "analysis" must be provided.',
    path: ['prompt'],
  });

/** POST /api/ai/create-task-plan */
export const CreateTaskPlanRequestSchema = z.object({
  spec: GameSpecSchema,
  wait: z.boolean().optional(),
});

/** POST /api/ai/run-agent */
export const RunAgentRequestSchema = z.object({
  agent: AgentNameSchema,
  input: z.record(z.string(), z.unknown()),
  provider: z.string().optional(),
  wait: z.boolean().optional(),
  maxOutputAttempts: z.number().int().min(1).max(10).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

/** POST /api/ai/execute-task-plan */
export const ExecuteTaskPlanRequestSchema = z.object({
  plan: TaskPlanSchema,
  wait: z.boolean().optional(),
});
