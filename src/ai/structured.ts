import { z } from 'zod';
import { AIProvider, extractJson, Usage, zodToJson } from './provider.js';
import { retry, RetryOptions } from '../core/retry.js';
import { InvalidLLMOutputError, formatZodIssues } from '../core/errors.js';

export interface StructuredGenerateOptions<O> {
  provider: AIProvider;
  system: string;
  prompt: string;
  schema: z.ZodType<O>;
  /**
   * How many times the LLM is asked to fix invalid JSON output.
   * Transient network/rate-limit failures are handled separately by the
   * retry system inside each provider call.
   */
  maxAttempts?: number;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  providerRetry?: RetryOptions;
  onAttempt?: (info: { attempt: number; error?: unknown; usage?: Usage }) => void;
}

export interface StructuredGenerateResult<O> {
  output: O;
  attempts: number;
  usage: Usage;
  provider: string;
}

/**
 * Generate structured JSON that validates against a Zod schema.
 *
 * Flow:
 *   1. Build the JSON Schema for the target schema and embed it in the
 *      system prompt.
 *   2. Call the provider (retrying transient failures).
 *   3. Extract + parse the JSON and validate against the schema.
 *   4. On invalid output, feed the validation errors back to the model
 *      and retry up to `maxAttempts` (self-correction loop).
 */
export async function generateStructured<O>(
  options: StructuredGenerateOptions<O>,
): Promise<StructuredGenerateResult<O>> {
  const { provider, schema, maxAttempts = 3, signal } = options;
  const jsonSchema = zodToJson(schema);

  const system = [
    options.system,
    '',
    'You must respond with a single JSON object only.',
    'Your entire response must be valid JSON and MUST match the following JSON Schema:',
    JSON.stringify(jsonSchema, null, 2),
    'Do not wrap the JSON in markdown fences. Do not include any prose outside the JSON object.',
  ].join('\n');

  let lastError: unknown;
  let lastUsage: Usage | undefined;
  let usedAttempts = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    usedAttempts = attempt;
    const corrective =
      attempt === 1
        ? ''
        : [
            '',
            'Your previous response failed validation with the following errors:',
            describeValidationError(lastError),
            'Return a corrected JSON object that fixes every issue listed above.',
          ].join('\n');

    const prompt = [options.prompt, corrective].filter(Boolean).join('\n\n');

    try {
      const { value: generated } = await retry(
        () =>
          provider.generate({
            system,
            prompt,
            schema: jsonSchema,
            signal,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
          }),
        options.providerRetry,
      );
      lastUsage = generated.usage;

      let parsed: unknown;
      try {
        parsed = extractJson(generated.text);
      } catch (error) {
        lastError = error;
        options.onAttempt?.({ attempt, error: lastError, usage: lastUsage });
        continue;
      }

      try {
        const output = schema.parse(parsed);
        options.onAttempt?.({ attempt, usage: lastUsage });
        return {
          output,
          attempts: usedAttempts,
          usage: lastUsage ?? {},
          provider: provider.name,
        };
      } catch (error) {
        lastError = error;
        options.onAttempt?.({ attempt, error: lastError, usage: lastUsage });
      }
    } catch (error) {
      lastError = error;
      options.onAttempt?.({ attempt, error: lastError, usage: lastUsage });
      throw error;
    }
  }

  throw new InvalidLLMOutputError(
    `AI output failed schema validation after ${usedAttempts} attempt(s) using provider "${provider.name}".`,
    { lastError: serializeError(lastError), schema: jsonSchema },
  );
}

function describeValidationError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return formatZodIssues(error)
      .map((issue) => `- ${(issue as { path: string; message: string }).path}: ${(issue as { path: string; message: string }).message}`)
      .join('\n');
  }
  if (error instanceof Error) return `- ${error.message}`;
  return `- ${String(error)}`;
}

function serializeError(error: unknown): unknown {
  if (error instanceof z.ZodError) return formatZodIssues(error);
  if (error instanceof Error) return { name: error.name, message: error.message };
  return error;
}
