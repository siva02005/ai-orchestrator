import { randomUUID } from 'node:crypto';
import { GameSpec } from '../types/game-spec.js';
import { TaskPlan, Task } from '../types/jobs.js';
import {
  GameConcept,
  StorySection,
  GameplayTechnicalSection,
} from '../agents/schemas.js';
import { GameUnderstanding } from '../types/analysis.js';

/**
 * =====================================================================
 * TASK PLANNER (Phase 3)
 * =====================================================================
 * Converts a validated GameSpec into an ordered TaskPlan assigned to the
 * specialized agents. Task inputs are deterministic projections of the
 * spec so agents can be run standalone (e.g. "expand the NPCs") or as a
 * full pipeline via the Task Manager.
 * =====================================================================
 */
export class TaskPlanner {
  createPlan(spec: GameSpec): TaskPlan {
    const analysis = deriveAnalysis(spec);
    const concept = deriveConcept(spec);
    const story = deriveStory(spec);
    const gameplayTechnical = deriveGameplayTechnical(spec);

    const tasks: Task[] = [
      {
        id: 't1-concept-review',
        agent: 'game-designer',
        title: 'Review core concept',
        description: 'Re-validate and refine the core game concept against the specification.',
        input: analysis,
        depends_on: [],
        priority: 'high',
      },
      {
        id: 't2-story-expansion',
        agent: 'story-designer',
        title: 'Expand story and missions',
        description: 'Turn the mission list into a fully detailed narrative and quest design.',
        input: { analysis, concept },
        depends_on: ['t1-concept-review'],
        priority: 'high',
      },
      {
        id: 't3-character-expansion',
        agent: 'character-designer',
        title: 'Expand characters',
        description: 'Flesh out playable characters into full character sheets.',
        input: { analysis, concept, story },
        depends_on: ['t2-story-expansion'],
        priority: 'medium',
      },
      {
        id: 't4-npc-expansion',
        agent: 'npc-designer',
        title: 'Expand NPCs',
        description: 'Flesh out NPC behaviors and dialogue topics.',
        input: { analysis, concept, story },
        depends_on: ['t2-story-expansion'],
        priority: 'medium',
      },
      {
        id: 't5-environment-assets',
        agent: 'environment-designer',
        title: 'Design environment and audio',
        description: 'Produce the asset/environment and audio direction.',
        input: { analysis, concept },
        depends_on: ['t1-concept-review'],
        priority: 'medium',
      },
      {
        id: 't6-level-layout',
        agent: 'level-designer',
        title: 'Design level layout',
        description: 'Refine the world areas and their connections.',
        input: { concept, environment: deriveEnvironment(spec) },
        depends_on: ['t5-environment-assets'],
        priority: 'medium',
      },
      {
        id: 't7-gameplay-implementation',
        agent: 'gameplay-programmer',
        title: 'Define gameplay systems and tech requirements',
        description: 'Detail mechanics, physics and technical requirements for the engine team.',
        input: { analysis, concept },
        depends_on: ['t1-concept-review'],
        priority: 'high',
      },
      {
        id: 't8-ui-design',
        agent: 'ui-designer',
        title: 'Design UI and controls',
        description: 'Produce the HUD, menus and control mappings.',
        input: { concept },
        depends_on: ['t1-concept-review'],
        priority: 'low',
      },
      {
        id: 't9-qa-plan',
        agent: 'testing-agent',
        title: 'Create test plan and risk register',
        description: 'Review the full specification and produce a QA plan.',
        input: { spec },
        depends_on: [
          't2-story-expansion',
          't3-character-expansion',
          't4-npc-expansion',
          't5-environment-assets',
          't7-gameplay-implementation',
          't8-ui-design',
        ],
        priority: 'high',
      },
      {
        id: 't10-consistency-review',
        agent: 'bug-fix-agent',
        title: 'Consistency review of the specification',
        description:
          'Review the assembled specification for inconsistencies (missions vs areas vs NPCs) and fix them.',
        input: {
          original_input: spec,
          agent_output: { spec },
          bug_report:
            'Run a consistency review of this game specification. Check that every mission location exists in world.areas, every character/NPC id is unique and referenced correctly, and controls map to the platform list. Fix any inconsistency found.',
        },
        depends_on: ['t9-qa-plan'],
        priority: 'medium',
      },
    ];

    return {
      plan_id: randomUUID(),
      game_name: spec.game_name,
      tasks,
      estimated_agents: new Set(tasks.map((t) => t.agent)).size,
    };
  }
}

/** Deterministic projections from a spec into agent input shapes. */

export function deriveAnalysis(spec: GameSpec): GameUnderstanding {
  return {
    intent: `Build a ${spec.genre} game called "${spec.game_name}".`,
    suggested_name: spec.game_name,
    genre: spec.genre,
    art_style: spec.art_style.style,
    platform: spec.platform,
    camera: spec.camera.perspective,
    entities_mentioned: [
      ...spec.characters.map((c) => c.name),
      ...spec.npcs.map((n) => n.name),
      ...spec.world.areas.map((a) => a.name),
      ...spec.missions.map((m) => m.title),
    ],
    requested_features: spec.gameplay.mechanics,
    constraints: [],
    missing_information: [],
    confidence: 1,
    original_prompt: `Specification for "${spec.game_name}"`,
  };
}

export function deriveConcept(spec: GameSpec): GameConcept {
  return {
    game_name: spec.game_name,
    genre: spec.genre,
    vision: spec.world.setting,
    design_directives: [
      `Art style must follow: ${spec.art_style.style} (${spec.art_style.rendering}).`,
      `Camera: ${spec.camera.perspective} following ${spec.camera.follow_target}.`,
      `Target platforms: ${spec.platform.join(', ')}.`,
    ],
    art_style: spec.art_style,
    camera: spec.camera,
    platform: spec.platform,
    gameplay: {
      core_loop: spec.gameplay.core_loop,
      objectives: spec.missions.map((m) => m.objective),
      suggested_mechanics: spec.gameplay.mechanics,
    },
  };
}

export function deriveStory(spec: GameSpec): StorySection {
  return {
    premise: spec.world.setting,
    tone: toneForDifficulty(spec.gameplay.difficulty),
    protagonist_summary:
      spec.characters[0]?.description ??
      'The player character. Details refined during story expansion.',
    missions: spec.missions,
  };
}

/** Map a gameplay difficulty into a narrative tone descriptor. */
function toneForDifficulty(difficulty: GameSpec['gameplay']['difficulty']): string {
  switch (difficulty) {
    case 'easy':
      return 'light-hearted, low-stakes and welcoming';
    case 'hard':
      return 'gritty, tense and punishing';
    case 'adaptive':
      return 'flexible, matching the player\'s growing skill';
    default:
      return 'balanced and approachable';
  }
}

export function deriveEnvironment(spec: GameSpec): {
  environment: GameSpec['environment'];
  audio: GameSpec['audio'];
} {
  return { environment: spec.environment, audio: spec.audio };
}

export function deriveGameplayTechnical(spec: GameSpec): GameplayTechnicalSection {
  return {
    gameplay: {
      mechanics: spec.gameplay.mechanics,
      progression: spec.gameplay.progression,
      difficulty: spec.gameplay.difficulty,
    },
    physics: spec.physics,
    technical_requirements: spec.technical_requirements,
  };
}
