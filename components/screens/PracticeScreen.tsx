"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/lib/game-context";
import { Button } from "@/components/ui/button";
import { cn, difficultyLabel, difficultyColor } from "@/lib/utils";

const CHOICE_LABELS = ["A", "B", "C", "D"];

export function PracticeScreen() {
  const { state, dispatch } = useGame();
  const practice = state.practice!;
  const { questions, currentIndex, answered, chosenIndex, correctCount, totalAnswered } =
    practice;

  const prefetchTriggered = useRef(false);
  const currentQ = questions[currentIndex];
  const hasNext = currentIndex < questions.length - 1;

  // Prefetch more questions around Q7-8 of a batch
  useEffect(() => {
    const positionInBatch = currentIndex % 10;
    if (positionInBatch >= 7 && !prefetchTriggered.current) {
      prefetchTriggered.current = true;
      fetchMoreQuestions();
    }
    if (positionInBatch < 7) {
      prefetchTriggered.current = false;
    }
  }, [currentIndex]);

  async function fetchMoreQuestions() {
    const slot = state.setup.categorySlots?.[0];
    if (!slot) return;
    const existing = questions.map((q) => q.question);

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: slot.category,
          difficulty: slot.difficulty,
          count: 10,
          existingQuestions: existing,
        }),
      });
      const data = await res.json();
      if (data.questions) {
        if (data.costUsd) dispatch({ type: "ADD_SESSION_COST", costUsd: data.costUsd });
        dispatch({ type: "PRACTICE_ADD_QUESTIONS", questions: data.questions });
      }
    } catch {
      // Silently fail — user can still play existing questions
    }
  }

  function handleAnswer(index: number) {
    if (answered) return;
    dispatch({ type: "PRACTICE_ANSWER", answerIndex: index });
  }

  function handleNext() {
    if (!hasNext) {
      // At end of loaded questions — wait for prefetch or trigger now
      if (practice.isLoading) return;
      fetchMoreQuestions();
      return;
    }
    dispatch({ type: "PRACTICE_NEXT" });
  }

  if (!currentQ) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 rounded-full border-2 border-transparent border-t-gold-bright"
        />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col px-4 py-6 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
            Practice
          </p>
          <p className="font-bold text-foreground">{practice.category}</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Tally */}
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Score</p>
            <p className="text-sm font-bold text-foreground">
              <span className="text-emerald-400">{correctCount}</span>
              <span className="text-muted-foreground">/{totalAnswered}</span>
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-10 px-4 text-sm"
            onClick={() => dispatch({ type: "PRACTICE_END" })}
          >
            End
          </Button>
        </div>
      </div>

      {/* Question counter */}
      <div className="text-xs text-muted-foreground mb-2">
        Question {totalAnswered + (answered ? 0 : 1)}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25 }}
          className="flex-1 flex flex-col"
        >
          {/* Question card */}
          <div className="rounded-2xl border border-border bg-card px-5 py-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className={cn("text-xs font-semibold", difficultyColor(currentQ.difficulty))}>
                {difficultyLabel(currentQ.difficulty)}
              </span>
              <span className="text-muted-foreground text-xs">·</span>
              <span className="text-xs text-muted-foreground">{currentQ.category}</span>
            </div>
            <p className="text-base md:text-lg font-semibold text-foreground leading-snug">
              {currentQ.question}
            </p>
          </div>

          {/* Choices */}
          <div className="flex flex-col gap-3">
            {currentQ.choices.map((choice, i) => {
              let btnState: "default" | "correct" | "wrong" | "selected" = "default";
              if (answered) {
                if (i === currentQ.correctIndex) btnState = "correct";
                else if (i === chosenIndex) btnState = "wrong";
              } else if (i === chosenIndex) {
                btnState = "selected";
              }

              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={answered}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-4 rounded-xl border text-left transition-all duration-200 text-sm font-medium min-h-[3.5rem]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    btnState === "default" &&
                      "bg-card border-border hover:border-gold-dim hover:bg-gold-dim/5 active:scale-[0.98]",
                    btnState === "selected" && "bg-gold-dim/15 border-gold-dim",
                    btnState === "correct" && "bg-emerald-400/15 border-emerald-400 text-emerald-300",
                    btnState === "wrong" && "bg-destructive/15 border-destructive/60 text-destructive/80",
                    answered && btnState === "default" && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5",
                      btnState === "default" && "bg-secondary text-muted-foreground",
                      btnState === "selected" && "bg-gold-bright text-primary-foreground",
                      btnState === "correct" && "bg-emerald-400 text-black",
                      btnState === "wrong" && "bg-destructive/80 text-white",
                    )}
                  >
                    {CHOICE_LABELS[i]}
                  </span>
                  <span className="leading-snug">{choice}</span>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          <AnimatePresence>
            {answered && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="mt-4 rounded-xl border border-gold-dim/30 bg-gold-dim/5 px-4 py-3"
              >
                <p className="text-xs font-semibold text-gold-bright uppercase tracking-widest mb-1">
                  {chosenIndex === currentQ.correctIndex ? "✅ Correct!" : "❌ Not quite"} · Fun Fact
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {currentQ.explanation}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* Next button */}
      <AnimatePresence>
        {answered && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.15 }}
          >
            <Button
              size="lg"
              className="mt-6 w-full h-14 text-base font-semibold"
              onClick={handleNext}
            >
              Next Question →
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
