const FILTERED = "[FILTERED]";

function keyMatches(key: string, patterns: (string | RegExp)[]): boolean {
  const lower = key.toLowerCase();
  for (const pattern of patterns) {
    if (typeof pattern === "string") {
      if (lower.includes(pattern.toLowerCase())) return true;
    } else if (pattern.test(key)) {
      return true;
    }
  }
  return false;
}

/**
 * Deep-redact values whose keys match any filter pattern. Handles nested
 * objects, arrays, and circular references. Matches Ruby gem semantics:
 * key.to_s.include?(filter) — substring, case-insensitive.
 */
export function filterValues<T>(value: T, patterns: (string | RegExp)[]): T {
  if (patterns.length === 0) return value;
  const seen = new WeakMap<object, unknown>();

  const walk = (val: unknown, parentKey?: string): unknown => {
    if (parentKey !== undefined && keyMatches(parentKey, patterns)) {
      return FILTERED;
    }
    if (val === null || typeof val !== "object") return val;
    const existing = seen.get(val as object);
    if (existing !== undefined) return existing;

    if (Array.isArray(val)) {
      const out: unknown[] = [];
      seen.set(val as object, out);
      for (const item of val) out.push(walk(item, parentKey));
      return out;
    }

    const out: Record<string, unknown> = {};
    seen.set(val as object, out);
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      out[k] = walk(v, k);
    }
    return out;
  };

  return walk(value) as T;
}

/**
 * Strip headers whose names match filter patterns. Returns a new object,
 * does not mutate input. Header matching is case-insensitive full-name match.
 */
export function filterHeaders(
  headers: Record<string, string> | undefined,
  patterns: (string | RegExp)[],
): Record<string, string> {
  if (!headers) return {};
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    const lower = name.toLowerCase();
    const matched = patterns.some((p) =>
      typeof p === "string" ? lower === p.toLowerCase() : p.test(name),
    );
    if (!matched) out[name] = value;
  }
  return out;
}

export { FILTERED };
