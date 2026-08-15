import { AgentManager } from './agent-manager.js';
import { Logger } from '../core/logger.js';
import { AppError } from '../core/errors.js';
import { TaskPlan, Task } from '../types/jobs.js';
import { AgentRunResult } from '../types/agents.js';

export interface TaskExecutionResult {
  task: Task;
  status: 'completed' | 'failed' | 'skipped';
  result?: AgentRunResult;
  error?: { code: string; message: string; retryable: boolean };
}

export interface TaskManagerOptions {
  agentManager: AgentManager;
  logger?: Logger;
}

/**
 * =====================================================================
 * TASK MANAGER
 * =====================================================================
 * Executes a TaskPlan (from create-task-plan) honoring dependency order.
 * Tasks whose dependencies failed are marked `skipped` (they cannot run
 * meaningfully). Execution is sequential; a plan can be re-run and will
 * resume from failed/skipped tasks.
 * =====================================================================
 */
export class TaskManager {
  private readonly agentManager: AgentManager;
  private readonly logger: Logger;

  constructor(options: TaskManagerOptions) {
    this.agentManager = options.agentManager;
    this.logger = options.logger ?? new Logger('task-manager');
  }

  /** Topologically order tasks: dependencies before dependents. */
  static orderTasks(tasks: Task[]): Task[] {
    const byId = new Map(tasks.map((t) => [t.id, t]));
    const state = new Map<string, 'visiting' | 'done'>();
    const ordered: Task[] = [];

    const visit = (task: Task, stack: string[]): void => {
      const s = state.get(task.id);
      if (s === 'done') return;
      if (s === 'visiting') {
        throw new AppError({
          code: 'BAD_REQUEST',
          message: `Task plan contains a dependency cycle involving "${task.id}".`,
          statusCode: 400,
        });
      }
      state.set(task.id, 'visiting');
      for (const depId of task.depends_on ?? []) {
        const dep = byId.get(depId);
        if (dep) visit(dep, [...stack, task.id]);
        else if (!stack.includes(depId)) {
          throw new AppError({
            code: 'BAD_REQUEST',
            message: `Task "${task.id}" depends on unknown task "${depId}".`,
            statusCode: 400,
          });
        }
      }
      state.set(task.id, 'done');
      ordered.push(task);
    };

    for (const task of tasks) visit(task, []);
    return ordered;
  }

  async executePlan(plan: TaskPlan): Promise<TaskExecutionResult[]> {
    const ordered = TaskManager.orderTasks(plan.tasks);
    const results = new Map<string, TaskExecutionResult>();
    const execution: TaskExecutionResult[] = [];

    this.logger.info(`Executing plan "${plan.plan_id}" with ${ordered.length} task(s)`);

    for (const task of ordered) {
      const depFailures = (task.depends_on ?? [])
        .map((id) => results.get(id))
        .filter((r): r is TaskExecutionResult => r !== undefined)
        .filter((r) => r.status !== 'completed');

      if (depFailures.length > 0) {
        this.logger.warn(`Skipping task "${task.id}" because a dependency failed.`);
        const entry: TaskExecutionResult = {
          task,
          status: 'skipped',
          error: {
            code: 'DEPENDENCY_FAILED',
            message: `Skipped because dependency "${depFailures[0]!.task.id}" did not complete.`,
            retryable: true,
          },
        };
        results.set(task.id, entry);
        execution.push(entry);
        continue;
      }

      const result = await this.agentManager.runAgent(task.agent, task.input);
      const entry: TaskExecutionResult = {
        task,
        status: result.status,
        ...(result.status === 'completed'
          ? { result }
          : {
              error: {
                code: result.error?.code ?? 'AGENT_RUN_FAILED',
                message: result.error?.message ?? 'Agent failed.',
                retryable: result.error?.retryable ?? true,
              },
            }),
      };
      results.set(task.id, entry);
      execution.push(entry);
    }

    return execution;
  }
}
