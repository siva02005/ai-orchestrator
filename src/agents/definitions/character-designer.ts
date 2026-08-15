import { z } from 'zod';
import { Agent } from '../base.js';
import { AnalysisConceptStorySchema, stringifyInput } from './inputs.js';
import { CharactersSection, CharactersSectionSchema } from '../schemas.js';

/**
 * Character Designer — defines the playable characters (and key cast).
 * Characters get stable snake_case ids, roles and abilities.
 */
export class CharacterDesignerAgent extends Agent<z.infer<typeof AnalysisConceptStorySchema>, CharactersSection> {
  readonly name = 'character-designer' as const;
  readonly title = 'Character Designer';
  readonly description =
    'Designs the playable characters and main cast: identity, role, traits and abilities, consistent with the story and design directives.';
  readonly produces = ['characters'];
  readonly dependencies = ['game-designer', 'story-designer'];
  readonly inputSchema = AnalysisConceptStorySchema;
  readonly outputSchema = CharactersSectionSchema;

  buildSystemPrompt(): string {
    return [
      'You are the Character Designer on an AI game development team.',
      'Design 1-3 playable characters that fit the protagonist_summary and the game concept.',
      'Each character needs: stable snake_case id, name, role, description, and abilities.',
      'Abilities must be implementable as code (clear, discrete verbs). Keep them small in number (2-5).',
      'Make characters consistent with the premise, tone and design directives.',
    ].join('\n');
  }

  buildUserPrompt(input: z.infer<typeof AnalysisConceptStorySchema>): string {
    return [
      'Design the characters for this game:',
      stringifyInput(input),
    ].join('\n\n');
  }
}
