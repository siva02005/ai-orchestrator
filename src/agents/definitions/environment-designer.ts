import { z } from 'zod';
import { Agent } from '../base.js';
import { AnalysisAndConceptSchema, stringifyInput } from './inputs.js';
import { EnvironmentSection, EnvironmentSectionSchema } from '../schemas.js';

/**
 * Environment Designer — owns the environment (terrain, weather, props)
 * and the audio direction. Aligns with art_style and platform.
 */
export class EnvironmentDesignerAgent extends Agent<z.infer<typeof AnalysisAndConceptSchema>, EnvironmentSection> {
  readonly name = 'environment-designer' as const;
  readonly title = 'Environment Designer';
  readonly description =
    'Designs the world environment (terrain, weather, time of day, reusable props) and the audio style (music, SFX, voice).';
  readonly produces = ['environment', 'audio'];
  readonly dependencies = ['game-designer'];
  readonly inputSchema = AnalysisAndConceptSchema;
  readonly outputSchema = EnvironmentSectionSchema;

  buildSystemPrompt(): string {
    return [
      'You are the Environment Designer on an AI game development team.',
      'Design the environment to match the art_style, genre and platform.',
      'Provide terrain, weather, default time_of_day and a list of reusable props (implementable as prefabs/assets).',
      'Define the audio: music_style, sound_effects list and voice approach.',
      'Everything must be producible by an asset pipeline; avoid impossibly large scope.',
    ].join('\n');
  }

  buildUserPrompt(input: z.infer<typeof AnalysisAndConceptSchema>): string {
    return [
      'Design the environment and audio for this game:',
      stringifyInput(input),
    ].join('\n\n');
  }
}
