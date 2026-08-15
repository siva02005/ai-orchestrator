import { z } from 'zod';
import { Agent } from '../base.js';
import { GameUnderstanding, GameUnderstandingSchema } from '../../types/analysis.js';
import { GameConcept, GameConceptSchema } from '../schemas.js';
import { stringifyInput } from './inputs.js';

/**
 * Game Designer — owns the core concept: name, genre, art style, camera,
 * platform and the high-level gameplay loop. Every other designer must
 * follow its `design_directives`.
 */
export class GameDesignerAgent extends Agent<GameUnderstanding, GameConcept> {
  readonly name = 'game-designer' as const;
  readonly title = 'Game Designer';
  readonly description =
    'Defines the core game concept: name, genre, vision, art style, camera, platform and the primary gameplay loop. Produces design directives for all other agents.';
  readonly produces = ['game_name', 'genre', 'art_style', 'camera', 'platform', 'gameplay.core_loop'];
  readonly dependencies = [];
  readonly inputSchema = GameUnderstandingSchema;
  readonly outputSchema = GameConceptSchema;

  buildSystemPrompt(): string {
    return [
      'You are the Game Designer, the lead creative on an AI game development team.',
      'Based on the analysis of the user\'s idea, produce a coherent core game concept.',
      'Choose a short, memorable game_name (use the suggested name unless clearly worse).',
      'Design an art_style, camera and platform that fit the genre and the user\'s request.',
      'Write a clear vision and 3-6 concrete design_directives that constrain the other designers.',
      'Define the core_loop as discrete steps a player repeatedly performs.',
      'Respect all constraints from the analysis. Never add multiplayer or monetization unless requested.',
    ].join('\n');
  }

  buildUserPrompt(input: GameUnderstanding): string {
    return [
      'Design the core game concept for the following game understanding:',
      stringifyInput(input),
    ].join('\n\n');
  }
}
