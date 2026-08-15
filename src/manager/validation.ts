import { z } from 'zod';

/**
 * =====================================================================
 * VALIDATION SYSTEM (Phase 5)
 * =====================================================================
 * Single place for JSON-schema validation against any Zod schema. Used to
 * validate API request bodies and to give downstream teams a consistent
 * error format.
 * =====================================================================
 */

export interface ValidationIssue {
  path: string;
  message: string;
  code: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  issues?: ValidationIssue[];
  error?: Error;
}

export function validate<T>(schema: z.ZodType<T>, value: unknown): ValidationResult<T> {
  const result = schema.safeParse(value);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.join('.') || '(root)',
      message: issue.message,
      code: issue.code,
    })),
    error: result.error,
  };
}

export function toValidationIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
    code: issue.code,
  }));
}
