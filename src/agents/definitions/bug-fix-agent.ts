import { z } from 'zod';
import { Agent } from '../base.js';
import { BugFixOutput, BugFixOutputSchema } from '../schemas.js';

export const BugFixAgentInputSchema = z.object({
  original_input: z.unknown().describe('The input that was originally given to the failing agent'),
  agent_output: z.record(z.string(), z.unknown()).describe('The output produced by the failing agent (the artifact with the bug)'),
  bug_report: z.string().describe('Description of the bug or requirement violation'),
});

export type BugFixAgentInput = z.infer<typeof BugFixAgentInputSchema>;

/**
 * Bug Fix Agent — takes a failing agent\'s output plus a bug report and
 * returns a corrected artifact of the same shape, with an explanation of
 * the root cause and the changes applied.
 */
export class BugFixAgent extends Agent<BugFixAgentInput, BugFixOutput> {
  readonly name = 'bug-fix-agent' as const;
  readonly title = 'Bug Fix Agent';
  readonly description =
    'Takes a failing agent output and a bug report, diagnoses the root cause and returns a corrected artifact.';
  readonly produces = ['fixed_output'];
  readonly dependencies = [];
  readonly inputSchema = BugFixAgentInputSchema;
  readonly outputSchema = BugFixOutputSchema;

  buildSystemPrompt(): string {
    return [
      'You are the Bug Fix Agent on an AI game development team.',
      'Given an agent\'s output and a bug report, diagnose the root cause and produce a corrected artifact.',
      'fixed_output must keep the exact same JSON structure as agent_output, with the bug fixed.',
      'List every change you applied in `changes`, explain the `root_cause`, and give a `regression_check` describing what to verify so the fix does not break other parts.',
      'Never change the overall schema/shape; only fix the content.',
    ].join('\n');
  }

  buildUserPrompt(input: BugFixAgentInput): string {
    return [
      'Original input that was passed to the failing agent:',
      JSON.stringify(input.original_input, null, 2),
      '',
      'Agent output with the bug:',
      JSON.stringify(input.agent_output, null, 2),
      '',
      'Bug report:',
      input.bug_report,
    ].join('\n');
  }
}
