import { z } from 'zod';

/**
 * Job lifecycle types. Jobs wrap long-running operations (spec generation,
 * task planning, agent runs) so clients can poll for the result.
 */

export const JobTypeSchema = z.enum([
  'generate-specification',
  'create-task-plan',
  'run-agent',
  'execute-task-plan',
]);

export type JobType = z.infer<typeof JobTypeSchema>;

export const JobStatusSchema = z.enum(['pending', 'running', 'completed', 'failed']);

export type JobStatus = z.infer<typeof JobStatusSchema>;

export interface JobError {
  code: string;
  message: string;
  retryable: boolean;
  details?: unknown;
}

export interface Job<TInput = unknown, TOutput = unknown> {
  id: string;
  type: JobType;
  status: JobStatus;
  input: TInput;
  output?: TOutput;
  error?: JobError;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface JobLogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  scope: string;
  message: string;
  agent?: string;
  detail?: unknown;
}

/** Task plan produced by create-task-plan and executed by the task manager. */
export const TaskPrioritySchema = z.enum(['low', 'medium', 'high']);

export const TaskSchema = z.object({
  id: z.string(),
  agent: z.string().describe('Registered agent name that will execute this task'),
  title: z.string(),
  description: z.string(),
  input: z.record(z.string(), z.unknown()).describe('Input object passed to the agent (validated against the agent input schema)'),
  depends_on: z.array(z.string()).describe('Task ids that must complete before this one'),
  priority: TaskPrioritySchema,
});

export const TaskPlanSchema = z.object({
  plan_id: z.string(),
  game_name: z.string(),
  tasks: z.array(TaskSchema),
  estimated_agents: z.number(),
});

export type TaskPlan = z.infer<typeof TaskPlanSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
