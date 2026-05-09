import fs from "fs";
import path from "path";

let cachedKey: string | undefined;

/**
 * Reads ANTHROPIC_API_KEY from process.env first, then falls back to
 * parsing .env.local directly. This handles cases where Next.js's
 * workspace-root detection picks the wrong directory for env loading.
 */
export function getApiKey(): string {
  if (cachedKey) return cachedKey;

  // Try process.env first (normal case)
  if (process.env.ANTHROPIC_API_KEY) {
    cachedKey = process.env.ANTHROPIC_API_KEY;
    return cachedKey;
  }

  // Fallback: walk up from cwd looking for .env.local
  const candidates = [
    path.join(process.cwd(), ".env.local"),
    path.join(process.cwd(), "trivia-app", ".env.local"),
    path.join(__dirname, "..", "..", ".env.local"),
    path.join(__dirname, "..", "..", "..", ".env.local"),
  ];

  for (const p of candidates) {
    try {
      const content = fs.readFileSync(p, "utf-8");
      for (const line of content.split("\n")) {
        const match = line.match(/^ANTHROPIC_API_KEY=(.+)$/);
        if (match) {
          cachedKey = match[1].trim();
          console.log("[env] Loaded API key from", p);
          return cachedKey;
        }
      }
    } catch {
      // file not found, keep looking
    }
  }

  throw new Error("ANTHROPIC_API_KEY not found in process.env or any .env.local file");
}
