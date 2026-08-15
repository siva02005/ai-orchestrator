import { z } from 'zod';
import { GameUnderstandingSchema } from '../../types/analysis.js';
import {
  GameConceptSchema,
  StorySectionSchema,
  EnvironmentSectionSchema,
} from '../schemas.js';

/** Shared input shapes for design agents (analysis + downstream artifacts). */
export const AnalysisAndConceptSchema = z.object({
  analysis: GameUnderstandingSchema,
  concept: GameConceptSchema,
});

export const AnalysisConceptStorySchema = z.object({
  analysis: GameUnderstandingSchema,
  concept: GameConceptSchema,
  story: StorySectionSchema,
});

export const ConceptEnvironmentSchema = z.object({
  concept: GameConceptSchema,
  environment: EnvironmentSectionSchema,
});

export const ConceptOnlySchema = z.object({
  concept: GameConceptSchema,
});

export function stringifyInput(input: unknown): string {
  return JSON.stringify(input, null, 2);
}
