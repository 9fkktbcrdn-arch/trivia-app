import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { generateId } from "@/lib/utils";
import { getApiKey } from "@/lib/env";
import { recordUsage } from "@/lib/cost-tracker";
import type { TriviaQuestion, Difficulty } from "@/lib/types";

function getClient() {
  return new Anthropic({ apiKey: getApiKey() });
}

const DIFFICULTY_GUIDANCE: Record<Difficulty, string> = {
  easy: "appropriate for bright 8-year-olds — recognizable even with limited knowledge, but should still feel like real trivia",
  medium: "challenging for an 11-year-old, moderately challenging for most adults",
  hard: "challenging even for knowledgeable adults — requires specific knowledge",
};

// Practice mode: user specified a difficulty, generate all questions at that level
function buildManualPrompt(category: string, difficulty: Difficulty, count: number, existing: string[]): string {
  const avoidClause = existing.length > 0
    ? `\n\nDo NOT repeat or closely paraphrase any of these existing questions:\n${existing.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
    : "";

  return `You are a family trivia question writer. Generate exactly ${count} trivia question(s) for the category "${category}" at ${difficulty} difficulty.

Difficulty guidance: ${DIFFICULTY_GUIDANCE[difficulty]}

Requirements:
- Strictly age-appropriate (safe for kids ages 8+)
- All 4 answer choices must be plausible; wrong answers should not be obviously absurd
- The explanation should be 1-2 sentences with an interesting fun fact
- Vary the question style (who/what/where/when/which/how many)${avoidClause}

Return ONLY a JSON array (no markdown, no commentary):
[
  {
    "question": "string",
    "choices": ["string", "string", "string", "string"],
    "correctIndex": 0,
    "explanation": "string"
  }
]`;
}

// Game Time mode: Claude assigns each question its own difficulty based on actual hardness
function buildAutoPrompt(category: string, count: number, existing: string[]): string {
  const avoidClause = existing.length > 0
    ? `\n\nDo NOT repeat or closely paraphrase any of these existing questions:\n${existing.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
    : "";

  return `You are a family trivia question writer. Generate exactly ${count} trivia question(s) for the category "${category}".

For each question, YOU decide the difficulty based on how challenging the question actually is for a smart family — kids ages 8 and 11 playing with their parents:
- "easy" (100 pts): an 8-year-old with some knowledge of the topic could get it
- "medium" (200 pts): an 11-year-old might get it; most adults would know it
- "hard" (300 pts): challenges knowledgeable adults; specialized knowledge required

Mix difficulties across the set — aim for roughly 30% easy, 40% medium, 30% hard, but let the questions naturally dictate it. Do NOT make all questions the same difficulty.

Requirements:
- Strictly age-appropriate (safe for kids ages 8+)
- All 4 answer choices must be plausible; wrong answers should not be obviously absurd
- The explanation should be 1-2 sentences with an interesting fun fact
- Vary the question style (who/what/where/when/which/how many)${avoidClause}

Return ONLY a JSON array (no markdown, no commentary):
[
  {
    "question": "string",
    "choices": ["string", "string", "string", "string"],
    "correctIndex": 0,
    "difficulty": "easy" | "medium" | "hard",
    "explanation": "string"
  }
]`;
}

export async function POST(req: NextRequest) {
  try {
    const { category, difficulty, count, existingQuestions = [], autodifficulty = false } =
      await req.json();

    if (!category || !count) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const prompt = autodifficulty
      ? buildAutoPrompt(category, count, existingQuestions)
      : buildManualPrompt(category, difficulty as Difficulty, count, existingQuestions);

    const message = await getClient().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const callCostUsd = await recordUsage(message.usage.input_tokens, message.usage.output_tokens);

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) throw new Error("Claude did not return an array");

    const questions: TriviaQuestion[] = parsed.map((q: {
      question: string;
      choices: [string, string, string, string];
      correctIndex: number;
      explanation: string;
      difficulty?: Difficulty;
    }) => {
      if (
        typeof q.question !== "string" ||
        !Array.isArray(q.choices) ||
        q.choices.length !== 4 ||
        typeof q.correctIndex !== "number" ||
        typeof q.explanation !== "string"
      ) {
        throw new Error("Malformed question from Claude");
      }
      // In auto mode Claude provides difficulty; in manual mode use the requested difficulty
      const resolvedDifficulty: Difficulty = autodifficulty
        ? (["easy", "medium", "hard"].includes(q.difficulty ?? "") ? q.difficulty! : "medium")
        : (difficulty as Difficulty);

      return {
        id: generateId(),
        question: q.question,
        choices: q.choices as [string, string, string, string],
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        category,
        difficulty: resolvedDifficulty,
      };
    });

    return NextResponse.json({ questions, costUsd: callCostUsd });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/questions]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
