// Stores previously seen question texts per category in localStorage so they
// can be passed to the API as "existingQuestions" to prevent repeats across sessions.

const MAX_PER_CATEGORY = 120;

function key(category: string) {
  return `qcache_${category.toLowerCase().trim()}`;
}

export function getCachedQuestions(category: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key(category));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function cacheQuestions(category: string, questions: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getCachedQuestions(category);
    const combined = [...existing, ...questions];
    // Keep only the most recent MAX_PER_CATEGORY to cap localStorage size
    const trimmed = combined.slice(-MAX_PER_CATEGORY);
    localStorage.setItem(key(category), JSON.stringify(trimmed));
  } catch {}
}
