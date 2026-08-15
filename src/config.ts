import { RetryOptions } from './core/retry.js';

export interface AppConfig {
  providers: {
    default: string;
    openai?: { apiKey: string; model?: string; baseUrl?: string };
    anthropic?: { apiKey: string; model?: string; baseUrl?: string };
  };
  retry: Required<Pick<RetryOptions, 'maxAttempts' | 'baseDelayMs' | 'maxDelayMs'>>;
  job: { maxJobAttempts: number };
  server: { port: number; host: string };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    providers: {
      default: env.AI_PROVIDER ?? 'mock',
      openai: env.OPENAI_API_KEY
        ? { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL, baseUrl: env.OPENAI_BASE_URL }
        : undefined,
      anthropic: env.ANTHROPIC_API_KEY
        ? { apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL, baseUrl: env.ANTHROPIC_BASE_URL }
        : undefined,
    },
    retry: {
      maxAttempts: num(env.RETRY_MAX_ATTEMPTS, 3),
      baseDelayMs: num(env.RETRY_BASE_DELAY_MS, 500),
      maxDelayMs: num(env.RETRY_MAX_DELAY_MS, 8000),
    },
    job: {
      maxJobAttempts: num(env.JOB_MAX_ATTEMPTS, 1),
    },
    server: {
      port: num(env.PORT, 8080),
      host: env.HOST ?? '0.0.0.0',
    },
  };
}

function num(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
