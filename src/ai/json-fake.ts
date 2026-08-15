/**
 * Deterministic sample-value generator from a JSON Schema object.
 * Used by the Mock provider to produce *valid* output for ANY Zod-derived
 * schema, so tests and offline demos can run the full pipeline without
 * hitting a real LLM. This is a test/dev aid, never used in production
 * paths with real providers.
 */

export type JsonSchema = Record<string, unknown>;

function humanize(key: string): string {
  return key
    .replace(/[_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function pickString(schema: JsonSchema, key: string): string {
  const enums = schema.enum;
  if (Array.isArray(enums) && enums.length > 0 && typeof enums[0] === 'string') {
    return enums[0];
  }
  const constVal = schema.const;
  if (typeof constVal === 'string') return constVal;
  return key ? `Sample ${humanize(key)}` : 'Sample value';
}

function pickNumber(schema: JsonSchema): number {
  if (typeof schema.minimum === 'number') return schema.minimum;
  if (typeof schema.const === 'number') return schema.const;
  return 1;
}

function pickBoolean(): boolean {
  return true;
}

function resolveRef(ref: string, root: JsonSchema): JsonSchema {
  const defs: JsonSchema | undefined = (root.$defs ?? root.definitions) as JsonSchema | undefined;
  if (!defs) return {};
  const parts = ref.replace(/^#\//, '').split('/');
  let cur: unknown = defs;
  for (const part of parts) {
    if (cur && typeof cur === 'object') cur = (cur as Record<string, unknown>)[part];
    else return {};
  }
  return (cur as JsonSchema) ?? {};
}

export function fakeFromJsonSchema(
  schema: JsonSchema,
  opts: { root?: JsonSchema; key?: string; depth?: number } = {},
): unknown {
  const root = opts.root ?? schema;
  const key = opts.key ?? '';
  const depth = opts.depth ?? 0;
  if (depth > 6) return null;

  const merged: JsonSchema = { ...schema };
  if (typeof merged.$ref === 'string') {
    Object.assign(merged, resolveRef(merged.$ref, root));
  }

  const type = merged.type;
  if (Array.isArray(type)) {
    const first = type.find((t) => t !== 'null');
    merged.type = typeof first === 'string' ? first : 'string';
  }

  if (merged.const !== undefined) return merged.const;

  if (merged.anyOf && Array.isArray(merged.anyOf)) {
    return fakeFromJsonSchema(merged.anyOf[0] as JsonSchema, opts);
  }
  if (merged.oneOf && Array.isArray(merged.oneOf)) {
    return fakeFromJsonSchema(merged.oneOf[0] as JsonSchema, opts);
  }
  if (merged.allOf && Array.isArray(merged.allOf)) {
    let acc: JsonSchema = {};
    for (const part of merged.allOf) {
      acc = { ...acc, ...(part as JsonSchema) };
    }
    return fakeFromJsonSchema({ ...acc, ...merged }, opts);
  }

  switch (merged.type) {
    case 'object': {
      const properties = (merged.properties ?? {}) as Record<string, JsonSchema>;
      const required = Array.isArray(merged.required)
        ? (merged.required as string[])
        : Object.keys(properties);
      const result: Record<string, unknown> = {};
      for (const propKey of Object.keys(properties)) {
        if (merged.additionalProperties === false && !required.includes(propKey)) continue;
        const propSchema = properties[propKey];
        if (!propSchema) continue;
        result[propKey] = fakeFromJsonSchema(propSchema, {
          root,
          key: propKey,
          depth: depth + 1,
        });
      }
      return result;
    }
    case 'array': {
      const items = (merged.items as JsonSchema | undefined) ?? {};
      return [
        fakeFromJsonSchema(items, { root, key, depth: depth + 1 }),
        fakeFromJsonSchema(items, { root, key: `${key} 2`, depth: depth + 1 }),
      ];
    }
    case 'string':
      return pickString(merged, key);
    case 'integer':
    case 'number':
      return pickNumber(merged);
    case 'boolean':
      return pickBoolean();
    case 'null':
      return null;
    default:
      return pickString(merged, key);
  }
}
