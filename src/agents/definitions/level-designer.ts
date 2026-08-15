import { z } from 'zod';
import { Agent } from '../base.js';
import { ConceptEnvironmentSchema, stringifyInput } from './inputs.js';
import { WorldSection, WorldSectionSchema } from '../schemas.js';

/**
 * Level Designer — decomposes the world into concrete areas (levels) with
 * type, description and connections, so the game engine can build them.
 */
export class LevelDesignerAgent extends Agent<z.infer<typeof ConceptEnvironmentSchema>, WorldSection> {
  readonly name = 'level-designer' as const;
  readonly title = 'Level Designer';
  readonly description =
    'Splits the world into concrete areas/levels with types, descriptions and connections between them.';
  readonly produces = ['world', 'world.areas'];
  readonly dependencies = ['game-designer', 'environment-designer'];
  readonly inputSchema = ConceptEnvironmentSchema;
  readonly outputSchema = WorldSectionSchema;

  buildSystemPrompt(): string {
    return [
      'You are the Level Designer on an AI game development team.',
      'Split the game world into 2-5 areas (levels). Each area needs a name, description, a type from the allowed enum, and connections (names of areas reachable from it).',
      'The area types must be consistent with the environment and the missions.',
      'Keep the world coherent: every connection should be symmetric or justified.',
      'Set `scale` to something concrete (small village, open world, single dungeon).',
    ].join('\n');
  }

  buildUserPrompt(input: z.infer<typeof ConceptEnvironmentSchema>): string {
    return [
      'Design the world layout for this game:',
      stringifyInput(input),
    ].join('\n\n');
  }
}
