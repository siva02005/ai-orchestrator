import { describe, expect, it } from 'vitest';
import { createTestEngine, SAMPLE_PROMPT } from './helpers.js';
import { TaskManager } from '../src/manager/task-manager.js';

describe('Task manager (plan execution)', () => {
  const engine = createTestEngine();

  it('orders tasks topologically (dependencies first)', () => {
    const ordered = TaskManager.orderTasks([
      { id: 'c', agent: 'ui-designer', title: '', description: '', input: {}, depends_on: ['a'], priority: 'low' },
      { id: 'a', agent: 'game-designer', title: '', description: '', input: {}, depends_on: [], priority: 'high' },
      { id: 'b', agent: 'game-designer', title: '', description: '', input: {}, depends_on: ['a'], priority: 'high' },
    ]);
    const ids = ordered.map((t) => t.id);
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'));
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('c'));
  });

  it('throws on dependency cycles', () => {
    expect(() =>
      TaskManager.orderTasks([
        { id: 'a', agent: 'game-designer', title: '', description: '', input: {}, depends_on: ['b'], priority: 'high' },
        { id: 'b', agent: 'game-designer', title: '', description: '', input: {}, depends_on: ['a'], priority: 'high' },
      ]),
    ).toThrow(/cycle/i);
  });

  it('throws on unknown dependencies', () => {
    expect(() =>
      TaskManager.orderTasks([
        { id: 'a', agent: 'game-designer', title: '', description: '', input: {}, depends_on: ['ghost'], priority: 'high' },
      ]),
    ).toThrow(/unknown task/i);
  });

  it('executes a plan end to end with the mock provider', async () => {
    const { spec } = await engine.orchestrator.generateSpec({ prompt: SAMPLE_PROMPT });
    const plan = engine.orchestrator.createTaskPlan(spec);
    const taskManager = new TaskManager({ agentManager: engine.agentManager });
    const results = await taskManager.executePlan(plan);

    expect(results.length).toBe(plan.tasks.length);
    for (const r of results) {
      expect(['completed', 'failed', 'skipped']).toContain(r.status);
    }
    // With a deterministic mock provider, everything should complete.
    const completed = results.filter((r) => r.status === 'completed');
    expect(completed.length).toBe(plan.tasks.length);
  });

  it('marks dependents as skipped when a dependency fails', async () => {
    const taskManager = new TaskManager({ agentManager: engine.agentManager });
    const results = await taskManager.executePlan({
      plan_id: 'p1',
      game_name: 'test',
      estimated_agents: 1,
      tasks: [
        {
          id: 'a',
          agent: 'game-designer',
          title: '',
          description: '',
          input: { bad: 'shape' },
          depends_on: [],
          priority: 'high',
        },
        {
          id: 'b',
          agent: 'game-designer',
          title: '',
          description: '',
          input: { intent: 'x', suggested_name: 'x', entities_mentioned: [], requested_features: [], constraints: [], missing_information: [], confidence: 1, original_prompt: 'x' },
          depends_on: ['a'],
          priority: 'high',
        },
      ],
    });
    expect(results[0]!.status).toBe('failed');
    expect(results[1]!.status).toBe('skipped');
    expect(results[1]!.error?.code).toBe('DEPENDENCY_FAILED');
  });
});
