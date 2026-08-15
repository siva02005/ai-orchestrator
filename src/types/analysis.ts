import { z } from 'zod';

/**
 * Output of the prompt-understanding step (Phase 1). Produced by the
 * prompt-analyzer agent and consumed by every design agent as context.
 */
export const GameUnderstandingSchema = z.object({
  intent: z.string().describe('High-level intent extracted from the prompt'),
  suggested_name: z.string().describe('Suggested game name derived from the prompt'),
  genre: z.string().optional().describe('Inferred or stated genre'),
  art_style: z.string().optional().describe('Inferred or stated art style'),
  platform: z.array(z.string()).optional().describe('Inferred or stated target platforms'),
  camera: z.string().optional().describe('Inferred or stated camera perspective'),
  entities_mentioned: z
    .array(z.string())
    .describe('Things explicitly mentioned: village, player, NPCs, missions, ...'),
  requested_features: z.array(z.string()).describe('Explicitly requested features'),
  constraints: z.array(z.string()).describe('Stated limits or negative requirements'),
  missing_information: z.array(z.string()).describe('Details the user did not provide'),
  confidence: z.number().min(0).max(1).describe('Confidence in the understanding (0-1)'),
  original_prompt: z.string(),
});

export type GameUnderstanding = z.infer<typeof GameUnderstandingSchema>;
