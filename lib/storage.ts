/**
 * Category persistence layer — stores data in /data/categories.json.
 * Architected so the read/write calls can be swapped for a DB later
 * by replacing only this file's implementation.
 */
import fs from "fs/promises";
import path from "path";
import type { CategoryStore, RecentCategory } from "./types";

const DATA_PATH = path.join(process.cwd(), "data", "categories.json");
const RECENT_LIMIT = 10;

async function readStore(): Promise<CategoryStore> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    return JSON.parse(raw) as CategoryStore;
  } catch {
    return { recent: [], custom: [] };
  }
}

async function writeStore(store: CategoryStore): Promise<void> {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8");
}

export async function getCategories(): Promise<CategoryStore> {
  return readStore();
}

export async function recordCategoryPlayed(name: string): Promise<void> {
  const store = await readStore();
  const existing = store.recent.find(
    (r) => r.name.toLowerCase() === name.toLowerCase(),
  );

  if (existing) {
    existing.timesPlayed += 1;
    existing.lastPlayedAt = new Date().toISOString();
  } else {
    store.recent.unshift({
      name,
      timesPlayed: 1,
      lastPlayedAt: new Date().toISOString(),
    });
  }

  // Sort by most recently played, keep last N
  store.recent.sort(
    (a, b) => new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime(),
  );
  store.recent = store.recent.slice(0, RECENT_LIMIT);

  await writeStore(store);
}

export async function recordCategoriesPlayed(names: string[]): Promise<void> {
  for (const name of names) {
    await recordCategoryPlayed(name);
  }
}

export async function addCustomCategory(name: string): Promise<void> {
  const store = await readStore();
  const trimmed = name.trim();
  if (!trimmed) return;
  if (!store.custom.includes(trimmed)) {
    store.custom.unshift(trimmed);
  }
  await writeStore(store);
}

export async function removeRecentCategory(name: string): Promise<void> {
  const store = await readStore();
  store.recent = store.recent.filter(
    (r) => r.name.toLowerCase() !== name.toLowerCase(),
  );
  await writeStore(store);
}
