import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getApiKey } from "@/lib/env";
import { recordUsage } from "@/lib/cost-tracker";

function getClient() {
  return new Anthropic({ apiKey: getApiKey() });
}

export async function POST(req: NextRequest) {
  try {
    const { avoidCategories = [], mode = "random" } = await req.json();

    const avoidClause =
      avoidCategories.length > 0
        ? `\n\nIMPORTANT: Do NOT suggest any of these already-chosen categories (avoid overlap and obvious sub-topics too):\n${avoidCategories.map((c: string) => `- ${c}`).join("\n")}`
        : "";

    const mysteryGuidance =
      mode === "mystery"
        ? " Pick something surprising and contrasting with the other categories — ideally a topic from a completely different domain."
        : "";

    const prompt = `You are a creative family trivia game designer. Suggest ONE fun, age-appropriate trivia category for a family game (players include smart kids ages 8 and 11, and their parents).${mysteryGuidance}

The category should be:
- Specific enough to generate interesting questions (e.g., "Undersea Creatures" not just "Animals")
- Varied and fun — think creatively beyond the obvious
- Strictly family-friendly
- 2-5 words maximum${avoidClause}

Return ONLY the category name — no explanation, no quotes, no punctuation at the end.`;

    const message = await getClient().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 50,
      messages: [{ role: "user", content: prompt }],
    });

    const category =
      message.content[0].type === "text"
        ? message.content[0].text.trim().replace(/^["']|["']$/g, "")
        : "";

    if (!category) {
      throw new Error("Empty response from Claude");
    }

    const callCostUsd = await recordUsage(message.usage.input_tokens, message.usage.output_tokens);

    return NextResponse.json({ category, costUsd: callCostUsd });
  } catch (err) {
    console.error("[/api/choose-category]", err);
    return NextResponse.json(
      { error: "Could not generate a category. Please try again." },
      { status: 500 },
    );
  }
}
