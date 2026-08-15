import { Agent } from './base.js';
import { PromptAnalyzerAgent } from './definitions/prompt-analyzer.js';
import { GameDesignerAgent } from './definitions/game-designer.js';
import { StoryDesignerAgent } from './definitions/story-designer.js';
import { CharacterDesignerAgent } from './definitions/character-designer.js';
import { EnvironmentDesignerAgent } from './definitions/environment-designer.js';
import { LevelDesignerAgent } from './definitions/level-designer.js';
import { GameplayProgrammerAgent } from './definitions/gameplay-programmer.js';
import { NPCDDesignerAgent } from './definitions/npc-designer.js';
import { UIDesignerAgent } from './definitions/ui-designer.js';
import { TestingAgent } from './definitions/testing-agent.js';
import { BugFixAgent } from './definitions/bug-fix-agent.js';
import { AgentNotFoundError } from '../core/errors.js';
import { AgentMetadata } from '../types/agents.js';

/**
 * =====================================================================
 * AGENT REGISTRY
 * =====================================================================
 * Holds every available agent (the ten public specialized agents plus the
 * internal prompt-analyzer) and resolves them by name.
 * =====================================================================
 */
export class AgentRegistry {
  private readonly agents = new Map<string, Agent>();

  constructor() {
    this.register(new PromptAnalyzerAgent());
    this.register(new GameDesignerAgent());
    this.register(new StoryDesignerAgent());
    this.register(new CharacterDesignerAgent());
    this.register(new EnvironmentDesignerAgent());
    this.register(new LevelDesignerAgent());
    this.register(new GameplayProgrammerAgent());
    this.register(new NPCDDesignerAgent());
    this.register(new UIDesignerAgent());
    this.register(new TestingAgent());
    this.register(new BugFixAgent());
  }

  register(agent: Agent): void {
    this.agents.set(agent.name, agent);
  }

  get(name: string): Agent {
    const agent = this.agents.get(name);
    if (!agent) throw new AgentNotFoundError(name);
    return agent;
  }

  has(name: string): boolean {
    return this.agents.has(name);
  }

  list(): Agent[] {
    return [...this.agents.values()];
  }

  metadata(): AgentMetadata[] {
    return this.list().map((agent) => agent.metadata());
  }
}
