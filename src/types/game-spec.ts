import { z } from 'zod';

/**
 * =====================================================================
 * GAME SPECIFICATION JSON SCHEMA
 * =====================================================================
 * This is the canonical contract consumed by ALL downstream teams
 * (backend, game engine, frontend). Keep it backward-compatible.
 *
 * Zod is the source of truth. `zodToJsonSchema` derives the JSON Schema
 * that is shipped in the API responses and in /docs/SCHEMAS.md.
 * =====================================================================
 */

export const ArtStyleSchema = z.object({
  style: z.string().describe('Visual art style, e.g. low-poly, stylized, realistic'),
  palette: z.array(z.string()).describe('Suggested color palette (CSS color names or hex)'),
  rendering: z
    .string()
    .describe('Rendering approach, e.g. PBR, cel-shaded, toon, flat-shaded'),
});

export const CameraSchema = z.object({
  mode: z.string().describe('Camera behaviour description'),
  perspective: z.enum([
    'first_person',
    'third_person',
    'top_down',
    'side_scroll',
    'isometric',
    'cinematic',
    'orbit',
  ]),
  follow_target: z.string().describe('What the camera follows, e.g. player, vehicle'),
});

export const PlatformSchema = z.array(
  z.enum(['pc', 'mobile', 'web', 'console', 'vr', 'ar']),
);

export const AreaSchema = z.object({
  name: z.string(),
  description: z.string(),
  type: z.enum(['town', 'wilderness', 'dungeon', 'indoor', 'sky', 'underwater', 'hub', 'arena']),
  connections: z.array(z.string()).describe('Names of areas reachable from this one'),
});

export const WorldSchema = z.object({
  setting: z.string().describe('World setting summary'),
  scale: z.string().describe('Scale description, e.g. small village, open world'),
  areas: z.array(AreaSchema),
});

export const CharacterSchema = z.object({
  id: z.string().describe('Stable identifier, snake_case'),
  name: z.string(),
  role: z.string().describe('Player role, e.g. protagonist, guardian'),
  description: z.string(),
  abilities: z.array(z.string()),
  traits: z.array(z.string()).optional(),
});

export const NPCSchema = z.object({
  id: z.string().describe('Stable identifier, snake_case'),
  name: z.string(),
  role: z.string().describe('NPC role, e.g. quest giver, vendor, guard'),
  behavior: z.string().describe('How the NPC behaves / reacts to the player'),
  dialogue_topics: z.array(z.string()).describe('Topics the NPC can talk about'),
});

export const EnvironmentSchema = z.object({
  terrain: z.string().describe('Terrain type, e.g. rolling hills, coastal cliffs'),
  weather: z.array(z.string()),
  time_of_day: z.string().describe('Default time of day, e.g. day, night, dynamic'),
  props: z.array(z.string()).describe('Reusable environment props/objects'),
});

export const MissionSchema = z.object({
  id: z.string().describe('Stable identifier, snake_case'),
  title: z.string(),
  objective: z.string(),
  description: z.string(),
  rewards: z.array(z.string()),
  next_mission: z.string().nullable().describe('id of the next mission, or null'),
  location: z.string().optional().describe('Area/level where the mission takes place'),
});

export const GameplaySchema = z.object({
  core_loop: z.array(z.string()).describe('The main gameplay loop as steps'),
  mechanics: z.array(z.string()).describe('Core mechanics'),
  progression: z.string().describe('How the player progresses, e.g. levels, unlocks'),
  difficulty: z.enum(['easy', 'normal', 'hard', 'adaptive']),
});

export const PhysicsSchema = z.object({
  engine: z.string().describe('Physics engine to use, e.g. bullet, physx, builtin'),
  gravity: z.number().describe('Gravity magnitude in m/s^2'),
  collision: z.string().describe('Collision approach, e.g. AABB, mesh, capsule'),
  character_movement: z.string().describe('Movement model, e.g. kinematic controller'),
});

export const UISchema = z.object({
  hud: z.array(z.string()).describe('HUD elements'),
  menus: z.array(z.string()).describe('Menus and screens'),
  minimap: z.boolean(),
  language: z.string().describe('Primary UI language'),
});

export const AudioSchema = z.object({
  music_style: z.string(),
  sound_effects: z.array(z.string()),
  voice: z.string().describe('Voice acting approach, e.g. none, dialogue only, full'),
});

export const ControlInputSchema = z.enum(['keyboard', 'mouse', 'gamepad', 'touch']);

export const ControlsSchema = z.object({
  input: z.array(ControlInputSchema),
  mappings: z
    .array(
      z.object({
        action: z.string(),
        keys: z.array(z.string()).describe('Keys/buttons bound to this action'),
      }),
    )
    .describe('Suggested default key bindings'),
});

export const TechnicalRequirementsSchema = z.object({
  engine: z.string().describe('Recommended game engine, e.g. Godot, Unity, Three.js'),
  language: z.string().describe('Implementation language'),
  target_fps: z.number(),
  min_specs: z.object({
    gpu: z.string(),
    cpu: z.string(),
    ram_gb: z.number(),
  }),
  build_targets: z.array(z.string()).describe('Export targets, e.g. web, desktop, mobile'),
});

/**
 * The complete Game Specification. This is the artifact every downstream
 * team consumes.
 */
export const GameSpecSchema = z
  .object({
    schema_version: z.string().describe('Schema version of this specification'),
    game_name: z.string(),
    genre: z.string(),
    art_style: ArtStyleSchema,
    camera: CameraSchema,
    platform: PlatformSchema,
    world: WorldSchema,
    characters: z.array(CharacterSchema),
    npcs: z.array(NPCSchema),
    environment: EnvironmentSchema,
    missions: z.array(MissionSchema),
    gameplay: GameplaySchema,
    physics: PhysicsSchema,
    ui: UISchema,
    audio: AudioSchema,
    controls: ControlsSchema,
    technical_requirements: TechnicalRequirementsSchema,
  })
  .describe('Complete game specification produced by the AI orchestrator');

export type GameSpec = z.infer<typeof GameSpecSchema>;
export type ArtStyle = z.infer<typeof ArtStyleSchema>;
export type Camera = z.infer<typeof CameraSchema>;
export type World = z.infer<typeof WorldSchema>;
export type Area = z.infer<typeof AreaSchema>;
export type Character = z.infer<typeof CharacterSchema>;
export type NPC = z.infer<typeof NPCSchema>;
export type Environment = z.infer<typeof EnvironmentSchema>;
export type Mission = z.infer<typeof MissionSchema>;
export type Gameplay = z.infer<typeof GameplaySchema>;
export type Physics = z.infer<typeof PhysicsSchema>;
export type UI = z.infer<typeof UISchema>;
export type Audio = z.infer<typeof AudioSchema>;
export type Controls = z.infer<typeof ControlsSchema>;
export type TechnicalRequirements = z.infer<typeof TechnicalRequirementsSchema>;

export const GAME_SPEC_SCHEMA_VERSION = '1.0.0';
