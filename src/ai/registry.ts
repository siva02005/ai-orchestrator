import { AIProvider } from './provider.js';
import { OpenAIProvider } from './providers/openai.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { MockProvider } from './providers/mock.js';
import { AppError } from '../core/errors.js';

export interface ProviderRegistryConfig {
  openai?: { apiKey: string; model?: string; baseUrl?: string; timeoutMs?: number };
  anthropic?: { apiKey: string; model?: string; baseUrl?: string; timeoutMs?: number };
  /** Provider used when callers do not specify one. Defaults to 'mock'. */
  default?: string;
}

/**
 * Registry of AI providers. Resolves a provider by name and provides a
 * default. Supports environment-driven construction via `fromEnv`.
 */
export class ProviderRegistry {
  private readonly providers = new Map<string, AIProvider>();
  private readonly defaultName: string;

  constructor(config: ProviderRegistryConfig = {}) {
    this.register(new MockProvider());
    if (config.openai?.apiKey) {
      this.register(
        new OpenAIProvider({
          apiKey: config.openai.apiKey,
          model: config.openai.model,
          baseUrl: config.openai.baseUrl,
          timeoutMs: config.openai.timeoutMs,
        }),
      );
    }
    if (config.anthropic?.apiKey) {
      this.register(
        new AnthropicProvider({
          apiKey: config.anthropic.apiKey,
          model: config.anthropic.model,
          baseUrl: config.anthropic.baseUrl,
          timeoutMs: config.anthropic.timeoutMs,
        }),
      );
    }
    this.defaultName = config.default ?? 'mock';
  }

  register(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name?: string): AIProvider {
    const key = name ?? this.defaultName;
    const provider = this.providers.get(key);
    if (!provider) {
      throw new AppError({
        code: 'PROVIDER_ERROR',
        message: `No AI provider registered under "${key}". Available: ${[...this.providers.keys()].join(', ')}.`,
      });
    }
    return provider;
  }

  has(name: string): boolean {
    return this.providers.has(name);
  }

  list(): string[] {
    return [...this.providers.keys()];
  }

  get defaultProviderName(): string {
    return this.defaultName;
  }

  /** Build a registry from environment variables. */
  static fromEnv(env: NodeJS.ProcessEnv = process.env): ProviderRegistry {
    return new ProviderRegistry({
      openai: env.OPENAI_API_KEY
        ? { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL, baseUrl: env.OPENAI_BASE_URL }
        : undefined,
      anthropic: env.ANTHROPIC_API_KEY
        ? { apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL, baseUrl: env.ANTHROPIC_BASE_URL }
        : undefined,
      default: env.AI_PROVIDER ?? 'mock',
    });
  }
}
