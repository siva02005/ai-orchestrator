import { z } from 'zod';
import { Agent } from '../base.js';
import { GameUnderstandingSchema } from '../../types/analysis.js';

export const PromptAnalyzerInputSchema = z.object({
  prompt: z.string().min(1, 'prompt is required'),
});

export type PromptAnalyzerInput = z.infer<typeof PromptAnalyzerInputSchema>;

/**
 * Phase 1 — Prompt Understanding.
 * Converts a raw natural-language prompt into a structured
 * GameUnderstanding that every design agent can consume.
 */
export class PromptAnalyzerAgent extends Agent<PromptAnalyzerInput, z.infer<typeof GameUnderstandingSchema>> {
  readonly name = 'prompt-analyzer' as const;
  readonly title = 'Prompt Analyzer';
  readonly description =
    'Parses the user\'s natural-language prompt into a structured game understanding: intent, entities, features, constraints and missing information.';
  readonly produces = ['analysis'];
  readonly dependencies = [];
  readonly inputSchema = PromptAnalyzerInputSchema;
  readonly outputSchema = GameUnderstandingSchema;

  buildSystemPrompt(): string {
    return [
      'You are the Prompt Analyzer in an AI game development team.',
      'Your only job is to understand a user\'s natural-language game idea and turn it into a structured analysis.',
      'Extract: the intent, a suggested game name, genre, art style, platform, camera perspective, every entity mentioned (e.g. village, player, NPCs, missions), explicitly requested features, stated constraints, and what information is missing.',
      'If the user did not mention a field (genre, art_style, platform, camera), leave it out instead of inventing it.',
      'Set confidence between 0 and 1 reflecting how much detail the user provided.',
      'Be faithful to the user\'s words. Do not invent features the user did not ask for.',
    ].join('\n');
  }

  buildUserPrompt(input: PromptAnalyzerInput): string {
    return [
      'Analyze the following user prompt:',
      '',
      input.prompt,
      '',
      'Produce the structured game understanding JSON object.',
    ].join('\n');
  }
}
