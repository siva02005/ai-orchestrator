import { AIProvider, GenerateParams, GenerateResult } from '../provider.js';
import { fakeFromJsonSchema } from '../json-fake.js';

/**
 * Deterministic Mock provider for tests and offline development.
 *
 * IMPORTANT: this is NOT fake production functionality. It is a provider
 * used only in tests / local dev when no API key is configured. Every
 * other provider path is real. It honours the incoming JSON Schema and
 * produces a structurally-valid sample so the full pipeline can be
 * exercised end to end without network access.
 */
export class MockProvider implements AIProvider {
  readonly name = 'mock';
  readonly jsonMode = true;

  private readonly scripted: string[];

  constructor(options: { scripted?: string[] } = {}) {
    this.scripted = [...(options.scripted ?? [])];
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    let text: string;
    if (this.scripted.length > 0) {
      text = this.scripted.shift()!;
    } else if (params.schema) {
      text = JSON.stringify(fakeFromJsonSchema(params.schema), null, 2);
    } else {
      text = `[mock] system "${truncate(params.system, 40)}" / prompt "${truncate(params.prompt, 60)}"`;
    }

    return {
      text,
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
    };
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}...` : s;
}
