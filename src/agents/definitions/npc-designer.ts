import { z } from 'zod';
import { Agent } from '../base.js';
import { AnalysisConceptStorySchema, stringifyInput } from './inputs.js';
import { NPCSection, NPCSectionSchema } from '../schemas.js';

/**
 * NPC Designer — defines non-playable characters: roles, behaviors and
 * dialogue topics. NPCs must be implementable as scripted actors.
 */
export class NPCDDesignerAgent extends Agent<z.infer<typeof AnalysisConceptStorySchema>, NPCSection> {
  readonly name = 'npc-designer' as const;
  readonly title = 'NPC Designer';
  readonly description =
    'Designs the non-playable characters: role, scripted behavior and dialogue topics, supporting the missions and world.';
  readonly produces = ['npcs'];
  readonly dependencies = ['game-designer', 'story-designer'];
  readonly inputSchema = AnalysisConceptStorySchema;
  readonly outputSchema = NPCSectionSchema;

  buildSystemPrompt(): string {
    return [
      'You are the NPC Designer on an AI game development team.',
      'Design 3-6 NPCs that serve the missions and make the world feel alive.',
      'Each NPC needs: stable snake_case id, name, role, a scriptable behavior (what it does when idle, when approached, when given items), and dialogue_topics it can talk about.',
      'NPC roles should map to mission needs (quest giver, vendor, guard, informant, bystander).',
      'Keep behaviors deterministic and simple enough to implement as an NPC state machine.',
    ].join('\n');
  }

  buildUserPrompt(input: z.infer<typeof AnalysisConceptStorySchema>): string {
    return [
      'Design the NPCs for this game:',
      stringifyInput(input),
    ].join('\n\n');
  }
}
