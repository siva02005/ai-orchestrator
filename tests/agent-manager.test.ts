import { describe, expect, it } from 'vitest';
import { createTestEngine } from './helpers.js';
import { AgentNotFoundError } from '../src/core/errors.js';
import { AGENT_NAMES } from '../src/types/agents.js';

describe('Agent manager (Phase 4)', () => {
  const engine = createTestEngine();

  it('exposes all ten public agents plus the internal prompt-analyzer', () => {
    const agents = engine.agentManager.listAgents();
    const names = new Set(agents.map((a) => a.name));
    for (const name of AGENT_NAMES) expect(names.has(name)).toBe(true);
    expect(names.has('prompt-analyzer')).toBe(true);
    expect(agents.length).toBe(AGENT_NAMES.length + 1);
  });

  it('runs an agent and returns a completed AgentRunResult', async () => {
    const result = await engine.agentManager.runAgent('game-designer', {
      intent: 'Build a cozy village adventure',
      suggested_name: 'Village Tales',
      entities_mentioned: ['village', 'player'],
      requested_features: ['exploration'],
      constraints: [],
      missing_information: [],
      confidence: 0.5,
      original_prompt: 'Build a cozy village adventure',
    });
    expect(result.status).toBe('completed');
    expect(result.output).not.toBeNull();
    expect(result.attempts).toBeGreaterThanOrEqual(1);
    expect(result.provider).toBe('mock');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.trace.length).toBeGreaterThan(0);
  });

  it('rejects unknown agents', async () => {
    await expect(
      engine.agentManager.runAgent('not-a-real-agent', {}),
    ).rejects.toBeInstanceOf(AgentNotFoundError);
  });

  it('returns a failed result (not a throw) for invalid input', async () => {
    const result = await engine.agentManager.runAgent('game-designer', { not: 'the right shape' });
    expect(result.status).toBe('failed');
    expect(result.error?.code).toBe('AGENT_INPUT_INVALID');
    expect(result.error?.retryable).toBe(false);
  });

  it('routes provider failures into failed results', async () => {
    const { buildEngine } = await import('../src/engine.js');
    const { MockProvider } = await import('../src/ai/providers/mock.js');
    const { ProviderRegistry } = await import('../src/ai/registry.js');
    const { ProviderError } = await import('../src/core/errors.js');
    const failing = new MockProvider();
    failing.generate = async () => {
      throw new ProviderError('upstream 503', { retryable: true });
    };
    const registry = new ProviderRegistry({ default: 'mock' });
    registry.register(failing);
    const engine2 = buildEngine({
      providers: registry,
      retry: { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 1 },
    });
    const result = await engine2.agentManager.runAgent('game-designer', {
      intent: 'x',
      suggested_name: 'x',
      entities_mentioned: [],
      requested_features: [],
      constraints: [],
      missing_information: [],
      confidence: 0.1,
      original_prompt: 'x',
    });
    expect(result.status).toBe('failed');
    expect(result.error?.retryable).toBe(true);
  });
});
