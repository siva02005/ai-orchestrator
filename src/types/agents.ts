import { z } from 'zod';

/**
 * Public agent identifiers — the ten specialized agents exposed through
 * the run-agent API. The internal prompt-analyzer agent is registered in
 * the same registry but not exposed publicly.
 */
export const AGENT_NAMES = [
  'game-designer',
  'story-designer',
  'character-designer',
  'environment-designer',
  'level-designer',
  'gameplay-programmer',
  'npc-designer',
  'ui-designer',
  'testing-agent',
  'bug-fix-agent',
] as const;

export const INTERNAL_AGENT_NAMES = ['prompt-analyzer'] as const;

export type AgentName = (typeof AGENT_NAMES)[number];
export type InternalAgentName = (typeof INTERNAL_AGENT_NAMES)[number];
export type AnyAgentName = AgentName | InternalAgentName;

/** Public names accepted by POST /api/ai/run-agent. */
export const AgentNameSchema = z.enum(AGENT_NAMES);

/** Human-readable metadata for documentation / logs. */
export interface AgentMetadata {
  name: string;
  title: string;
  description: string;
  /** Which section(s) of the game specification this agent is responsible for. */
  produces: string[];
  /** Which agents typically depend on this one. */
  dependencies: string[];
}

/** Result of a single agent execution. */
export interface AgentRunResult<T = unknown> {
  agent: string;
  status: 'completed' | 'failed';
  output: T | null;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  attempts: number;
  provider: string;
  durationMs: number;
  /** Trace of every provider call / validation performed during the run. */
  trace: AgentTraceEntry[];
}

export interface AgentTraceEntry {
  attempt: number;
  action: 'generate' | 'validate_input' | 'validate_output' | 'retry' | 'fallback';
  ok: boolean;
  detail?: string;
  at: string;
}
