import { AIProvider, GenerateParams, GenerateResult } from '../provider.js';
import { requestJson } from './http.js';

export interface OpenAIProviderConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  error?: { message?: string; type?: string };
}

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  readonly jsonMode = true;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs?: number;

  constructor(config: OpenAIProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'gpt-4o-mini';
    this.baseUrl = (config.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    this.timeoutMs = config.timeoutMs;
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const data = await requestJson<OpenAIChatResponse>(
      `${this.baseUrl}/chat/completions`,
      this.name,
      {
        headers: { authorization: `Bearer ${this.apiKey}` },
        body: {
          model: this.model,
          messages: [
            { role: 'system', content: params.system },
            { role: 'user', content: params.prompt },
          ],
          temperature: params.temperature ?? 0.2,
          max_tokens: params.maxTokens ?? 2048,
          ...(params.schema ? { response_format: { type: 'json_object' } } : {}),
        },
        signal: params.signal,
        timeoutMs: this.timeoutMs,
      },
    );

    if (data.error) {
      throw new Error(`${this.name} error: ${data.error.message ?? data.error.type}`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error(`${this.name} returned an empty completion.`);
    }

    return {
      text: content,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }
}
