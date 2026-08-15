import { z } from 'zod';

/**
 * =====================================================================
 * AI PROVIDER ABSTRACTION
 * =====================================================================
 * All AI interaction flows through the AIProvider interface. Providers
 * are registered by name (openai | anthropic | mock). The orchestrator
 * never touches a provider SDK directly, so teams can swap providers
 * without touching pipeline, agents or API code.
 * =====================================================================
 */

export interface GenerateParams {
  system: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  /**
   * When present the provider is expected to produce JSON conforming to
   * this JSON Schema. Providers with native JSON mode use it; others get
   * the schema embedded in the prompt.
   */
  schema?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface Usage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface GenerateResult {
  text: string;
  usage?: Usage;
}

export interface AIProvider {
  readonly name: string;
  /** Providers with jsonMode can constrain the model to emit JSON. */
  readonly jsonMode: boolean;
  generate(params: GenerateParams): Promise<GenerateResult>;
}

/** Convert a Zod schema to a JSON Schema object for structured generation. */
export function zodToJson(schema: z.ZodType): Record<string, unknown> {
  const withJsonSchema = schema as unknown as { toJSONSchema?: () => unknown };
  if (typeof withJsonSchema.toJSONSchema !== 'function') {
    throw new Error('Zod schema does not expose toJSONSchema().');
  }
  return withJsonSchema.toJSONSchema() as Record<string, unknown>;
}

/**
 * Defensively extract a JSON object from an LLM response. Handles code
 * fences, leading/trailing prose and multiple JSON payloads.
 */
export function extractJson(text: string): unknown {
  let candidate = text.trim();
  if (!candidate) {
    throw new Error('Empty model output.');
  }

  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(candidate);
  if (fence && fence[1]) {
    candidate = fence[1]!.trim();
  }

  // Prefer the last balanced {...} block in the text.
  let start = -1;
  let end = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < candidate.length; i++) {
    const ch = candidate[i]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  const slice = start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate;
  try {
    return JSON.parse(slice);
  } catch {
    throw new Error(`Model output is not valid JSON: ${slice.slice(0, 120)}...`);
  }
}

/** Validate arbitrary JSON against a Zod schema, returning a plain object. */
export function parseStructured<T>(raw: unknown, schema: z.ZodType<T>): T {
  return schema.parse(raw);
}
