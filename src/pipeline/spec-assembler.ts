import {
  GameSpec,
  GameSpecSchema,
  GAME_SPEC_SCHEMA_VERSION,
} from '../types/game-spec.js';
import {
  GameConcept,
  StorySection,
  CharactersSection,
  NPCSection,
  EnvironmentSection,
  WorldSection,
  UISection,
  GameplayTechnicalSection,
} from '../agents/schemas.js';

/**
 * =====================================================================
 * SPEC ASSEMBLER
 * =====================================================================
 * Merges the sections produced by the specialized design agents into one
 * complete GameSpec and validates it against the canonical schema. This
 * is the single point where downstream consumers get a guaranteed-valid
 * specification.
 * =====================================================================
 */

export interface SpecSections {
  concept: GameConcept;
  story: StorySection;
  characters: CharactersSection;
  npcs: NPCSection;
  environment: EnvironmentSection;
  world: WorldSection;
  ui: UISection;
  gameplayTechnical: GameplayTechnicalSection;
}

export function assembleGameSpec(sections: SpecSections): GameSpec {
  const { concept, story, characters, npcs, environment, world, ui, gameplayTechnical } = sections;
  const raw: unknown = {
    schema_version: GAME_SPEC_SCHEMA_VERSION,
    game_name: concept.game_name,
    genre: concept.genre,
    art_style: concept.art_style,
    camera: concept.camera,
    platform: concept.platform,
    world: world.world,
    characters: characters.characters,
    npcs: npcs.npcs,
    environment: environment.environment,
    missions: story.missions,
    gameplay: {
      core_loop: concept.gameplay.core_loop,
      mechanics: gameplayTechnical.gameplay.mechanics,
      progression: gameplayTechnical.gameplay.progression,
      difficulty: gameplayTechnical.gameplay.difficulty,
    },
    physics: gameplayTechnical.physics,
    ui: ui.ui,
    audio: environment.audio,
    controls: ui.controls,
    technical_requirements: gameplayTechnical.technical_requirements,
  };
  return GameSpecSchema.parse(raw);
}
