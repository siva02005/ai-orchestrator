import { AIProvider, GenerateParams, GenerateResult } from '../provider.js';
import { requestJson } from './http.js';

export interface AnthropicProviderConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

interface AnthropicMessagesResponse {
  content?: Array<{ type?: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string; type?: string };
}

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';
  readonly jsonMode = false;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs?: number;

  constructor(config: AnthropicProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'claude-3-5-sonnet-latest';
    this.baseUrl = (config.baseUrl ?? 'https://api.anthropic.com').replace(/\/$/, '');
    this.timeoutMs = config.timeoutMs;
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const data = await requestJson<AnthropicMessagesResponse>(
      `${this.baseUrl}/v1/messages`,
      this.name,
      {
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: {
          model: this.model,
          max_tokens: params.maxTokens ?? 2048,
          system: params.system,
          messages: [{ role: 'user', content: params.prompt }],
          temperature: params.temperature ?? 0.2,
        },
        signal: params.signal,
        timeoutMs: this.timeoutMs,
      },
    );

    if (data.error) {
      throw new Error(`${this.name} error: ${data.error.message ?? data.error.type}`);
    }

    const text = (data.content ?? [])
      .filter((block) => block.type === 'text' && block.text)
      .map((block) => block.text)
      .join('\n');

    if (!text.trim()) {
      throw new Error(`${this.name} returned an empty completion.`);
    }

    return {
      text,
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens: (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0),
          }
        : undefined,
    };
  }
}
