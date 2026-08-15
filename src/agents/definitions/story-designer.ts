import { z } from 'zod';
import { Agent } from '../base.js';
import { AnalysisAndConceptSchema, stringifyInput } from './inputs.js';
import { StorySection, StorySectionSchema } from '../schemas.js';

/**
 * Story Designer — owns the narrative: premise, tone, protagonist summary
 * and the mission chain. Mission ids must be stable snake_case and chain
 * via `next_mission`.
 */
export class StoryDesignerAgent extends Agent<z.infer<typeof AnalysisAndConceptSchema>, StorySection> {
  readonly name = 'story-designer' as const;
  readonly title = 'Story Designer';
  readonly description =
    'Writes the narrative backbone: premise, tone, protagonist summary and the ordered mission chain the player follows.';
  readonly produces = ['missions', 'premise', 'tone'];
  readonly dependencies = ['game-designer'];
  readonly inputSchema = AnalysisAndConceptSchema;
  readonly outputSchema = StorySectionSchema;

  buildSystemPrompt(): string {
    return [
      'You are the Story Designer on an AI game development team.',
      'Build the narrative around the concept and its design directives.',
      'Create a mission chain of 2-6 missions. Each mission needs a stable snake_case id, a title, a clear objective, a short description, rewards, and next_mission pointing to the following mission id (null for the last).',
      'Set the mission `location` to an area name from the concept where plausible.',
      'Keep the story appropriate for the genre and tone. Do not invent characters — only reference roles; the Character Designer will name them.',
    ].join('\n');
  }

  buildUserPrompt(input: z.infer<typeof AnalysisAndConceptSchema>): string {
    return [
      'Write the story and mission chain for this game:',
      stringifyInput(input),
    ].join('\n\n');
  }
}
