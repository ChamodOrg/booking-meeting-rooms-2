// Turn a failed openapi-fetch result into one line for an Alert.
export function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const e = error as { message?: unknown; description?: unknown };
    if (typeof e.description === "string" && e.description) return e.description;
    if (typeof e.message === "string" && e.message) return e.message;
  }
  return fallback;
}
