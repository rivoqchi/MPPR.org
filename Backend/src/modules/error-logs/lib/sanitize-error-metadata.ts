const SENSITIVE_KEYS = new Set([
  'password',
  'newpassword',
  'oldpassword',
  'confirmpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'secret',
]);

const MAX_STACK_LENGTH = 8000;
const MAX_STRING_LENGTH = 2000;

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}...`
      : value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item));
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        result[key] = '[redacted]';
        continue;
      }

      result[key] = sanitizeValue(nestedValue);
    }

    return result;
  }

  return value;
}

export function sanitizeErrorMetadata(metadata: unknown): Record<string, unknown> | undefined {
  if (metadata === null || metadata === undefined) {
    return undefined;
  }

  const sanitized = sanitizeValue(metadata);

  if (typeof sanitized !== 'object' || sanitized === null || Array.isArray(sanitized)) {
    return { value: sanitized };
  }

  return sanitized as Record<string, unknown>;
}

export function truncateStack(stack?: string | null): string | undefined {
  if (!stack) {
    return undefined;
  }

  return stack.length > MAX_STACK_LENGTH ? `${stack.slice(0, MAX_STACK_LENGTH)}...` : stack;
}
