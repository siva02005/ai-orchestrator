import { JobLogEntry } from '../types/jobs.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Structured logger. Writes to stdout (pino-style) and, when attached to a
 * job, records entries so they are retrievable via GET /api/ai/logs/{job_id}.
 */
export class Logger {
  private readonly buffer: JobLogEntry[] = [];

  constructor(private readonly scope = 'orchestrator') {}

  debug(message: string, detail?: unknown): void {
    this.emit('debug', message, detail);
  }

  info(message: string, detail?: unknown): void {
    this.emit('info', message, detail);
  }

  warn(message: string, detail?: unknown): void {
    this.emit('warn', message, detail);
  }

  error(message: string, detail?: unknown): void {
    this.emit('error', message, detail);
  }

  private emit(level: LogLevel, message: string, detail?: unknown): void {
    const entry: JobLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      scope: this.scope,
      message,
      ...(detail !== undefined ? { detail } : {}),
    };
    this.buffer.push(entry);
    if (process.env.NODE_ENV !== 'test') {
      const line = `[${entry.timestamp}] ${level.toUpperCase()} [${this.scope}] ${message}`;
      if (level === 'error') console.error(line);
      else if (level === 'warn') console.warn(line);
      else console.log(line);
    }
  }

  /** All entries buffered so far (used to persist per-job logs). */
  entries(): JobLogEntry[] {
    return this.buffer;
  }

  /** Merge another logger's entries into this one (used to attach child logs). */
  absorb(other: Logger): void {
    this.buffer.push(...other.entries());
  }
}

export function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
}
