import { z } from 'zod';
import { Agent } from '../base.js';
import { ConceptOnlySchema, stringifyInput } from './inputs.js';
import { UISection, UISectionSchema } from '../schemas.js';

/**
 * UI Designer — defines the HUD, menus and control mappings so the
 * frontend team can implement the interface against the spec.
 */
export class UIDesignerAgent extends Agent<z.infer<typeof ConceptOnlySchema>, UISection> {
  readonly name = 'ui-designer' as const;
  readonly title = 'UI Designer';
  readonly description =
    'Designs the user interface: HUD elements, menus/screens and default control mappings.';
  readonly produces = ['ui', 'controls'];
  readonly dependencies = ['game-designer'];
  readonly inputSchema = ConceptOnlySchema;
  readonly outputSchema = UISectionSchema;

  buildSystemPrompt(): string {
    return [
      'You are the UI Designer on an AI game development team.',
      'Design the HUD (health bar, quest tracker, inventory grid, etc.) as a list of concrete elements.',
      'List the menus/screens the game needs (main menu, pause, settings, mission log, inventory).',
      'Set control mappings for the platforms in the concept. Each action needs a name and the keys bound to it.',
      'Choose minimap and language. Keep the UI minimal for the game\'s scope.',
    ].join('\n');
  }

  buildUserPrompt(input: z.infer<typeof ConceptOnlySchema>): string {
    return [
      'Design the UI and controls for this game:',
      stringifyInput(input),
    ].join('\n\n');
  }
}
