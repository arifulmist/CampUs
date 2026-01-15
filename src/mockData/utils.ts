// Minimal className concatenation utility compatible with shadcn/ui usage
export function cn(...inputs: Array<unknown>): string {
  const result: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === "string") {
      result.push(input);
    } else if (Array.isArray(input)) {
      result.push(cn(...input));
    } else if (typeof input === "object") {
      for (const [key, value] of Object.entries(
        input as Record<string, unknown>
      )) {
        if (value) result.push(key);
      }
    }
  }
  return result.join(" ");
}
