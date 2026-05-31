"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useGame, buildGameSession } from "@/lib/game-context";
import { distributeQuestions, totalGameQuestions, generateId, shuffle } from "@/lib/utils";
import { getCachedQuestions, cacheQuestions } from "@/lib/question-cache";
import type { PooledQuestion, TriviaQuestion, CategorySlot, GameSetup } from "@/lib/types";

type GenerationStatus = "pending" | "loading" | "done" | "error";

interface SlotStatus {
  slot: CategorySlot;
  status: GenerationStatus;
}

export function LoadingScreen() {
  const { state, dispatch } = useGame();
  const calledRef = useRef(false);
  const [slotStatuses, setSlotStatuses] = useState<SlotStatus[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    if (state.setup.mode === "game-time") {
      runGameTimeGeneration();
    } else {
      runPracticeGeneration();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateQuestions(
    category: string,
    count: number,
    difficulty?: import("@/lib/types").Difficulty,
  ): Promise<{ questions: TriviaQuestion[]; costUsd: number }> {
    const existingQuestions = getCachedQuestions(category);
    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        count,
        difficulty,
        autodifficulty: !difficulty,
        existingQuestions,
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const questions = data.questions as TriviaQuestion[];
    cacheQuestions(category, questions.map((q) => q.question));
    return { questions, costUsd: data.costUsd ?? 0 };
  }

  async function runGameTimeGeneration() {
    const setup = state.setup as GameSetup;
    const resolvedSlots = setup.categorySlots;
    const teams = setup.teams;
    const gameLength = setup.gameLength;
    let totalCostUsd = 0;

    // Initialize status display
    setSlotStatuses(
      resolvedSlots.map((s) => ({ slot: s, status: "pending" as GenerationStatus })),
    );

    // Step 2: distribute questions across 5 slots
    const total = totalGameQuestions(teams, gameLength);
    const counts = distributeQuestions(total, resolvedSlots.length);

    // Step 3: generate all slots in parallel — no difficulty passed, Claude assigns it
    const results = await Promise.all(
      resolvedSlots.map(async (slot, i) => {
        setSlotStatuses((prev) =>
          prev.map((ps, pi) => (pi === i ? { ...ps, status: "loading" } : ps)),
        );
        try {
          const { questions, costUsd } = await generateQuestions(slot.category, counts[i]);
          totalCostUsd += costUsd;
          setSlotStatuses((prev) =>
            prev.map((ps, pi) => (pi === i ? { ...ps, status: "done" } : ps)),
          );
          return questions.map(
            (q): PooledQuestion => ({ ...q, slotId: slot.id, used: false }),
          );
        } catch (err) {
          setSlotStatuses((prev) =>
            prev.map((ps, pi) => (pi === i ? { ...ps, status: "error" } : ps)),
          );
          // Retry once
          try {
            const { questions, costUsd } = await generateQuestions(slot.category, counts[i]);
            totalCostUsd += costUsd;
            setSlotStatuses((prev) =>
              prev.map((ps, pi) => (pi === i ? { ...ps, status: "done" } : ps)),
            );
            return questions.map(
              (q): PooledQuestion => ({ ...q, slotId: slot.id, used: false }),
            );
          } catch {
            throw new Error(`Failed to generate questions for "${slot.category}"`);
          }
        }
      }),
    ).catch((err) => {
      setErrorMsg(err.message ?? "Something went wrong. Please try again.");
      return null;
    });

    if (!results) return;

    // Record categories played
    for (const slot of resolvedSlots) {
      fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "record", name: slot.category }),
      }).catch(() => {});
    }

    const finalSetup: GameSetup = {
      ...setup,
      categorySlots: resolvedSlots,
    };

    dispatch({ type: "ADD_SESSION_COST", costUsd: totalCostUsd });
    const session = buildGameSession(finalSetup, results);
    dispatch({ type: "START_GAME", session });
  }

  async function runPracticeGeneration() {
    const slot = state.setup.categorySlots?.[0];
    if (!slot) return;

    try {
      const { questions, costUsd } = await generateQuestions(slot.category, 10, slot.difficulty);

      fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "record", name: slot.category }),
      }).catch(() => {});

      dispatch({ type: "ADD_SESSION_COST", costUsd });
      dispatch({
        type: "START_PRACTICE",
        session: {
          category: slot.category,
          questions,
          currentIndex: 0,
          answered: false,
          correctCount: 0,
          totalAnswered: 0,
          isLoading: false,
          isComplete: false,
        },
      });
    } catch {
      setErrorMsg("Couldn't load questions. Please check your API key and try again.");
    }
  }

  if (errorMsg) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="text-4xl">⚠️</div>
        <div>
          <p className="font-bold text-lg text-foreground">Something went wrong</p>
          <p className="text-muted-foreground text-sm mt-2 max-w-xs">{errorMsg}</p>
        </div>
        <button
          onClick={() => dispatch({ type: "RESET" })}
          className="text-gold-bright underline underline-offset-4 text-sm"
        >
          Start over
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center gap-8 max-w-sm mx-auto">
      {/* Animated gold ring */}
      <div className="relative w-24 h-24">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border-2 border-transparent"
          style={{
            borderTopColor: "var(--gold-bright)",
            borderRightColor: "var(--gold-dim)",
          }}
        />
        <div className="absolute inset-3 rounded-full bg-card border border-border flex items-center justify-center text-2xl">
          🎯
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-foreground">Preparing your questions…</h2>
      </div>

      {slotStatuses.length > 0 && (
        <div className="w-full flex flex-col gap-2">
          {slotStatuses.map(({ slot, status }, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <StatusDot status={status} />
              <span
                className={
                  status === "done"
                    ? "text-foreground"
                    : status === "error"
                      ? "text-destructive"
                      : "text-muted-foreground"
                }
              >
                {slot.category}
              </span>
              {status === "loading" && (
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-xs text-muted-foreground"
                >
                  generating…
                </motion.span>
              )}
              {status === "done" && (
                <span className="text-xs text-emerald-400">✓</span>
              )}
            </div>
          ))}
        </div>
      )}

      {state.setup.mode === "practice" && (
        <p className="text-sm text-muted-foreground">
          Loading questions for <span className="text-foreground font-medium">{state.setup.categorySlots?.[0]?.category}</span>…
        </p>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: GenerationStatus }) {
  return (
    <div
      className={cn(
        "w-2 h-2 rounded-full shrink-0 transition-colors",
        status === "pending" && "bg-border",
        status === "loading" && "bg-gold-bright animate-pulse",
        status === "done" && "bg-emerald-400",
        status === "error" && "bg-destructive",
      )}
    />
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
