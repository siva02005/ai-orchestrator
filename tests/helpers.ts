import { buildEngine } from '../src/engine.js';

export const SAMPLE_PROMPT =
  'Create a small 3D adventure game with a village, player, NPCs and three missions.';

/** Engine wired to the deterministic mock provider (no network). */
export function createTestEngine() {
  return buildEngine();
}
