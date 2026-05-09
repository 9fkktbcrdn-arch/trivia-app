import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Difficulty, GameLength, Team } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function pointsForDifficulty(difficulty: Difficulty): number {
  return { easy: 100, medium: 200, hard: 300 }[difficulty];
}

export function halfPoints(difficulty: Difficulty): number {
  return pointsForDifficulty(difficulty) / 2;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function distributeQuestions(
  totalQuestions: number,
  slotCount: number = 5,
): number[] {
  const base = Math.floor(totalQuestions / slotCount);
  const remainder = totalQuestions % slotCount;
  return Array.from({ length: slotCount }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function totalGameQuestions(teams: Team[], length: GameLength): number {
  return teams.length * length;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function formatScore(score: number): string {
  if (score < 0) return `−${Math.abs(score).toLocaleString()}`;
  return score.toLocaleString();
}

export function relativeDate(isoDate: string): string {
  const diffDays = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "last week";
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return "last month";
  return `${Math.floor(diffDays / 30)} months ago`;
}

export function difficultyLabel(d: Difficulty): string {
  return { easy: "Easy", medium: "Medium", hard: "Hard" }[d];
}

export function difficultyColor(d: Difficulty): string {
  return { easy: "text-emerald-400", medium: "text-amber-400", hard: "text-rose-400" }[d];
}

export const PRESET_CATEGORIES = [
  "World Geography",
  "Animals & Nature",
  "Science & Technology",
  "World History",
  "Sports & Athletics",
  "Movies & TV",
  "Music",
  "Food & Cooking",
  "Space & Astronomy",
  "Famous Inventors",
  "Mythology",
  "Art & Literature",
  "US Presidents",
  "Olympic Games",
  "Ocean Life",
  "Famous Landmarks",
  "Video Games",
  "Dinosaurs",
  "Weather & Climate",
  "Mathematics",
] as const;

export type PresetCategory = (typeof PRESET_CATEGORIES)[number];
