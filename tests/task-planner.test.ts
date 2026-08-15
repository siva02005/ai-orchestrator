import { describe, expect, it } from 'vitest';
import { createTestEngine, SAMPLE_PROMPT } from './helpers.js';
import { TaskPlanner } from '../src/pipeline/task-planner.js';
import { TaskPlanSchema } from '../src/types/jobs.js';

describe('Phase 3 — task planner', () => {
  const engine = createTestEngine();

  it('creates a valid task plan from a generated spec', async () => {
    const { spec } = await engine.orchestrator.generateSpec({ prompt: SAMPLE_PROMPT });
    const plan = engine.orchestrator.createTaskPlan(spec);

    const parsed = TaskPlanSchema.safeParse(plan);
    expect(parsed.success).toBe(true);
    expect(plan.game_name).toBe(spec.game_name);
    expect(plan.tasks.length).toBeGreaterThanOrEqual(8);
    expect(plan.estimated_agents).toBeGreaterThanOrEqual(8);
  });

  it('every task references a registered agent', async () => {
    const { spec } = await engine.orchestrator.generateSpec({ prompt: SAMPLE_PROMPT });
    const plan = engine.orchestrator.createTaskPlan(spec);
    for (const task of plan.tasks) {
      expect(engine.agentManager.getAgent(task.agent)).toBeDefined();
    }
  });

  it('dependency references point at existing tasks', async () => {
    const { spec } = await engine.orchestrator.generateSpec({ prompt: SAMPLE_PROMPT });
    const plan = engine.orchestrator.createTaskPlan(spec);
    const ids = new Set(plan.tasks.map((t) => t.id));
    for (const task of plan.tasks) {
      for (const dep of task.depends_on) expect(ids.has(dep)).toBe(true);
    }
  });

  it('produces a deterministic plan for the same spec', () => {
    const planner = new TaskPlanner();
    const fakeSpec = {
      game_name: 'x',
      genre: 'adventure',
      art_style: { style: 's', palette: ['a'], rendering: 'r' },
      camera: { mode: 'm', perspective: 'third_person', follow_target: 'player' },
      platform: ['pc'],
      world: { setting: 's', scale: 'small', areas: [] },
      characters: [],
      npcs: [],
      environment: { terrain: 't', weather: [], time_of_day: 'day', props: [] },
      missions: [],
      gameplay: { core_loop: [], mechanics: [], progression: 'p', difficulty: 'normal' },
      physics: { engine: 'e', gravity: 9.8, collision: 'c', character_movement: 'm' },
      ui: { hud: [], menus: [], minimap: true, language: 'en' },
      audio: { music_style: 'm', sound_effects: [], voice: 'none' },
      controls: { input: ['keyboard'], mappings: [] },
      technical_requirements: {
        engine: 'e',
        language: 'ts',
        target_fps: 60,
        min_specs: { gpu: 'g', cpu: 'c', ram_gb: 4 },
        build_targets: ['web'],
      },
    };
    const p1 = planner.createPlan(fakeSpec as never);
    const p2 = planner.createPlan(fakeSpec as never);
    expect(p1.tasks.map((t) => t.id)).toEqual(p2.tasks.map((t) => t.id));
  });
});
