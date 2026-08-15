import { z } from 'zod';
import { Agent } from '../base.js';
import { AnalysisAndConceptSchema, stringifyInput } from './inputs.js';
import { GameplayTechnicalSection, GameplayTechnicalSectionSchema } from '../schemas.js';

/**
 * Gameplay Programmer — owns implementation-oriented sections: concrete
 * mechanics, progression, difficulty, physics and technical requirements.
 * This is the bridge between design and the game engine team.
 */
export class GameplayProgrammerAgent extends Agent<z.infer<typeof AnalysisAndConceptSchema>, GameplayTechnicalSection> {
  readonly name = 'gameplay-programmer' as const;
  readonly title = 'Gameplay Programmer';
  readonly description =
    'Turns the design into implementation guidance: concrete mechanics, progression rules, difficulty, physics parameters and technical requirements for the engine team.';
  readonly produces = ['gameplay.mechanics', 'gameplay.progression', 'gameplay.difficulty', 'physics', 'technical_requirements'];
  readonly dependencies = ['game-designer'];
  readonly inputSchema = AnalysisAndConceptSchema;
  readonly outputSchema = GameplayTechnicalSectionSchema;

  buildSystemPrompt(): string {
    return [
      'You are the Gameplay Programmer on an AI game development team.',
      'Translate the concept into concrete implementation guidance.',
      'List mechanics as discrete systems (e.g. "inventory with 3 slots", "dialogue choice trees").',
      'Describe progression explicitly (unlocks, gating, save points).',
      'Set physics parameters (engine, gravity in m/s^2, collision, movement model) that match the platform.',
      'Provide technical_requirements: engine, language, target_fps, min specs and build targets.',
      'Prefer the most practical engine for the target platform.',
    ].join('\n');
  }

  buildUserPrompt(input: z.infer<typeof AnalysisAndConceptSchema>): string {
    return [
      'Define the gameplay implementation and technical requirements for this game:',
      stringifyInput(input),
    ].join('\n\n');
  }
}
