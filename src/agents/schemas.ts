import { z } from 'zod';
import {
  ArtStyleSchema,
  CameraSchema,
  PlatformSchema,
  EnvironmentSchema,
  AudioSchema,
  WorldSchema,
  MissionSchema,
  CharacterSchema,
  NPCSchema,
  UISchema,
  ControlsSchema,
  PhysicsSchema,
  TechnicalRequirementsSchema,
} from '../types/game-spec.js';

/**
 * =====================================================================
 * AGENT OUTPUT SCHEMAS
 * =====================================================================
 * Every agent produces one of these structured outputs. They are built
 * from the shared game-spec sub-schemas so the final GameSpec assembly
 * validates cleanly.
 * =====================================================================
 */

export const GameConceptSchema = z.object({
  game_name: z.string(),
  genre: z.string(),
  vision: z.string().describe('Creative vision for the game in a few sentences'),
  design_directives: z.array(z.string()).describe('Concrete directives other designers must follow'),
  art_style: ArtStyleSchema,
  camera: CameraSchema,
  platform: PlatformSchema,
  gameplay: z.object({
    core_loop: z.array(z.string()).describe('The main gameplay loop as steps'),
    objectives: z.array(z.string()).describe('High-level objectives'),
    suggested_mechanics: z.array(z.string()).describe('Mechanics the programmer should implement'),
  }),
});
export type GameConcept = z.infer<typeof GameConceptSchema>;

export const StorySectionSchema = z.object({
  premise: z.string(),
  tone: z.string(),
  protagonist_summary: z.string(),
  missions: z.array(MissionSchema),
});
export type StorySection = z.infer<typeof StorySectionSchema>;

export const CharactersSectionSchema = z.object({
  characters: z.array(CharacterSchema),
});
export type CharactersSection = z.infer<typeof CharactersSectionSchema>;

export const NPCSectionSchema = z.object({
  npcs: z.array(NPCSchema),
});
export type NPCSection = z.infer<typeof NPCSectionSchema>;

export const EnvironmentSectionSchema = z.object({
  environment: EnvironmentSchema,
  audio: AudioSchema,
});
export type EnvironmentSection = z.infer<typeof EnvironmentSectionSchema>;

export const WorldSectionSchema = z.object({
  world: WorldSchema,
});
export type WorldSection = z.infer<typeof WorldSectionSchema>;

export const UISectionSchema = z.object({
  ui: UISchema,
  controls: ControlsSchema,
});
export type UISection = z.infer<typeof UISectionSchema>;

export const GameplayTechnicalSectionSchema = z.object({
  gameplay: z.object({
    mechanics: z.array(z.string()),
    progression: z.string(),
    difficulty: z.enum(['easy', 'normal', 'hard', 'adaptive']),
  }),
  physics: PhysicsSchema,
  technical_requirements: TechnicalRequirementsSchema,
});
export type GameplayTechnicalSection = z.infer<typeof GameplayTechnicalSectionSchema>;

export const TestPlanSectionSchema = z.object({
  test_plan: z.array(
    z.object({
      id: z.string(),
      focus: z.string(),
      approach: z.string(),
      success_criteria: z.array(z.string()),
    }),
  ),
  risks: z.array(
    z.object({
      risk: z.string(),
      likelihood: z.enum(['low', 'medium', 'high']),
      impact: z.enum(['low', 'medium', 'high']),
      mitigation: z.string(),
    }),
  ),
  recommended_tests: z.array(z.string()),
});
export type TestPlanSection = z.infer<typeof TestPlanSectionSchema>;

export const BugFixOutputSchema = z.object({
  fixed_output: z.record(z.string(), z.unknown()).describe('The corrected artifact (same shape as the agent output that had the bug)'),
  root_cause: z.string(),
  changes: z.array(z.string()).describe('List of changes applied'),
  regression_check: z.string().describe('How to verify the fix did not break other parts'),
});
export type BugFixOutput = z.infer<typeof BugFixOutputSchema>;
