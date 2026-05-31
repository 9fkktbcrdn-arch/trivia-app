import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getApiKey } from "@/lib/env";
import { recordUsage } from "@/lib/cost-tracker";

function getClient() {
  return new Anthropic({ apiKey: getApiKey() });
}

const LETTERS = ["A", "B", "C", "D"];

export async function POST(req: NextRequest) {
  try {
    const { question, choices, teamAnswerIndex } = await req.json();

    if (!question || !Array.isArray(choices) || choices.length !== 4 || typeof teamAnswerIndex !== "number") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const choiceList = choices
      .map((c: string, i: number) => `${LETTERS[i]}) ${c}`)
      .join("\n");

    const prompt = `You are a meticulous, impartial fact-checker resolving a dispute in a family trivia game. A team believes their chosen answer was marked wrong incorrectly.

Question: "${question}"

Choices:
${choiceList}

The disputing team chose: ${LETTERS[teamAnswerIndex]}) ${choices[teamAnswerIndex]}

Carefully and independently determine the single correct answer based purely on verifiable facts. Do not assume any previous answer was right or wrong — reason from scratch. Be rigorous; only confirm the team's answer if it is genuinely, factually correct.

Return ONLY valid JSON (no markdown, no commentary):
{
  "correctIndex": <0-3, the index of the genuinely correct choice>,
  "teamAnswerCorrect": <true if the disputing team's choice is the correct answer, otherwise false>,
  "explanation": "<1-2 sentences stating the correct answer and the key fact that settles it>"
}`;

    const message = await getClient().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    let costUsd = 0;
    try { costUsd = await recordUsage(message.usage.input_tokens, message.usage.output_tokens); } catch {}

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({
      correctIndex: typeof parsed.correctIndex === "number" ? parsed.correctIndex : teamAnswerIndex,
      teamAnswerCorrect: Boolean(parsed.teamAnswerCorrect),
      explanation: typeof parsed.explanation === "string" ? parsed.explanation : "",
      costUsd,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/verify-answer]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
