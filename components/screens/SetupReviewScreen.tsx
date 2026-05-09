"use client";

import { useState } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { useGame } from "@/lib/game-context";
import { Button } from "@/components/ui/button";
import { PageWrapper, SectionHeading } from "@/components/PageWrapper";
import { cn } from "@/lib/utils";
import type { GameLength } from "@/lib/types";

export function SetupReviewScreen() {
  const { state, dispatch, navigate } = useGame();
  const [gameLength, setGameLength] = useState<GameLength>(10);
  const teams = state.setup.teams ?? [];
  const slots = state.setup.categorySlots ?? [];

  function handleStart() {
    dispatch({ type: "SET_GAME_LENGTH", length: gameLength });
    navigate("loading");
  }

  const totalQuestions = teams.length * gameLength;

  return (
    <PageWrapper>
      <button
        onClick={() => navigate("setup-categories")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <SectionHeading
        label="Step 4 of 4"
        title="Review & Start"
        subtitle="Everything look good? Let's play."
      />

      {/* Teams */}
      <section className="mb-6">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
          Teams
        </p>
        <div className="flex flex-col gap-2">
          {teams.map((team, i) => (
            <div
              key={team.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border"
            >
              <span className="w-6 h-6 rounded-full bg-gold-bright/10 border border-gold-bright/20 text-gold-bright text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="font-semibold text-foreground">{team.name}</span>
              {team.players.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {team.players.join(", ")}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mb-6">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
          Categories
        </p>
        <div className="flex flex-col gap-2">
          {slots.map((slot) => (
            <div
              key={slot.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl bg-card border",
                slot.isMystery ? "border-dashed border-gold-dim/40" : "border-border",
              )}
            >
              <span className="w-6 h-6 rounded-lg bg-secondary text-secondary-foreground text-xs font-bold flex items-center justify-center shrink-0">
                {slot.isMystery ? <Lock className="w-3 h-3 text-gold-bright" /> : slot.id}
              </span>
              <span className="flex-1 font-medium text-foreground text-sm">
                {slot.isMystery ? (
                  <span className="text-gold-bright">Mystery · revealed at start</span>
                ) : (
                  slot.category
                )}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gold-bright/10 text-gold-bright">
                Auto
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Game length */}
      <section className="mb-8">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
          Game Length
        </p>
        <div className="grid grid-cols-2 gap-3">
          {([10, 20] as GameLength[]).map((len) => (
            <button
              key={len}
              onClick={() => setGameLength(len)}
              className={cn(
                "rounded-xl border p-4 text-center transition-all duration-200",
                gameLength === len
                  ? "border-gold-dim bg-gold-dim/10 shadow-gold"
                  : "border-border bg-card hover:border-gold-dim/50",
              )}
            >
              <p className="text-2xl font-bold text-gold-bright">{len}</p>
              <p className="text-xs text-muted-foreground mt-1">questions per team</p>
              <p className="text-xs text-muted-foreground">
                {teams.length * len} total questions
              </p>
            </button>
          ))}
        </div>
      </section>

      <div className="rounded-xl bg-secondary/50 border border-border px-4 py-3 mb-6 text-sm text-muted-foreground">
        {teams.length} teams · {gameLength} questions each · {totalQuestions} total · 5 categories · point values auto-assigned
      </div>

      <Button
        size="lg"
        className="w-full h-14 text-base font-semibold shadow-gold-lg"
        onClick={handleStart}
      >
        Generate Questions & Start
      </Button>
    </PageWrapper>
  );
}
