"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useGame } from "@/lib/game-context";
import { Button } from "@/components/ui/button";
import { formatScore, cn } from "@/lib/utils";
import type { Team, TurnResult } from "@/lib/types";

// ── Confetti burst ────────────────────────────────────────────────

function fireConfetti() {
  const gold = ["#C9A84C", "#E8D48B", "#F5E6A3", "#A07820"];
  const black = ["#1a1a1a", "#2a2a2a"];

  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 },
    colors: [...gold, ...black],
    startVelocity: 55,
    gravity: 0.8,
  });

  setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 120,
      origin: { x: 0.1, y: 0.7 },
      colors: gold,
      startVelocity: 40,
    });
    confetti({
      particleCount: 60,
      spread: 120,
      origin: { x: 0.9, y: 0.7 },
      colors: gold,
      startVelocity: 40,
    });
  }, 300);
}

// ── Recap helpers ─────────────────────────────────────────────────

function getCategoryBreakdown(
  teams: Team[],
  turns: TurnResult[],
): Array<{ category: string; byTeam: Record<string, number> }> {
  const categories = [...new Set(turns.map((t) => t.category))];
  return categories.map((cat) => {
    const byTeam: Record<string, number> = {};
    teams.forEach((team) => {
      byTeam[team.id] = turns
        .filter((t) => t.category === cat)
        .reduce((sum, t) => sum + (t.pointsAwarded[team.id] ?? 0), 0);
    });
    return { category: cat, byTeam };
  });
}

function getBestCategory(
  teamId: string,
  breakdown: Array<{ category: string; byTeam: Record<string, number> }>,
) {
  return breakdown.reduce((best, cur) =>
    (cur.byTeam[teamId] ?? 0) > (best.byTeam[teamId] ?? 0) ? cur : best,
    breakdown[0],
  );
}

// ── Main Results Screen ───────────────────────────────────────────

function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

export function ResultsScreen() {
  const { state, dispatch } = useGame();
  const firedRef = useRef(false);
  const sessionCost = state.sessionCostUsd;

  const isGameTime = state.session !== null;
  const teams = state.session?.teams ?? [];
  const turns = state.session?.turns ?? [];
  const winnerTeamId = state.session?.winnerTeamId;
  const winner = teams.find((t) => t.id === winnerTeamId);
  const sorted = [...teams].sort((a, b) => b.score - a.score);
  const practice = state.practice;

  useEffect(() => {
    if (isGameTime && !firedRef.current) {
      firedRef.current = true;
      fireConfetti();
    }
  }, [isGameTime]);

  if (!isGameTime && practice) {
    // Practice results
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center gap-8 max-w-sm mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-24 h-24 rounded-full bg-gold-bright/10 border-2 border-gold-dim flex items-center justify-center text-4xl"
        >
          🧠
        </motion.div>
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Session Complete!</h1>
          <p className="text-muted-foreground text-sm">
            {practice.category} practice session
          </p>
        </div>
        <div className="w-full rounded-2xl bg-card border border-border px-6 py-5 text-center">
          <p className="text-5xl font-bold text-gold-bright mb-1">
            {practice.correctCount}/{practice.totalAnswered}
          </p>
          <p className="text-muted-foreground text-sm">questions correct</p>
          {practice.totalAnswered > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {Math.round((practice.correctCount / practice.totalAnswered) * 100)}% accuracy
            </p>
          )}
          {sessionCost > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              API cost: <span className="text-gold-bright font-semibold">{formatCost(sessionCost)}</span>
            </p>
          )}
        </div>
        <Button
          size="lg"
          className="w-full h-14 text-base font-semibold"
          onClick={() => dispatch({ type: "RESET" })}
        >
          Play Again
        </Button>
      </div>
    );
  }

  // Game Time results
  const breakdown = getCategoryBreakdown(teams, turns);
  const stealCount = turns.filter((t) => t.steal?.decision === "steal").length;
  const successfulSteals = turns.filter((t) => t.steal?.success).length;

  return (
    <div className="min-h-dvh px-4 py-8 max-w-xl mx-auto">
      {/* Winner hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-8"
      >
        <div className="text-5xl mb-3">🏆</div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-dim mb-2">
          Winner
        </p>
        <h1 className="text-4xl font-bold text-gold-gradient mb-2">
          {winner?.name ?? "Tie!"}
        </h1>
        <p className="text-2xl font-bold text-foreground">
          {winner ? formatScore(winner.score) : ""} pts
        </p>
      </motion.div>

      {/* Podium */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="flex flex-col gap-2 mb-8"
      >
        {sorted.map((team, rank) => (
          <div
            key={team.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
              rank === 0
                ? "border-gold-dim bg-gold-bright/10 shadow-gold"
                : "border-border bg-card",
            )}
          >
            <span className="text-lg w-8 text-center">
              {rank === 0 ? "🥇" : rank === 1 ? "🥈" : "🥉"}
            </span>
            <span className="flex-1 font-semibold text-foreground">{team.name}</span>
            <span
              className={cn(
                "font-bold text-lg tabular-nums",
                team.score < 0 ? "text-destructive" : rank === 0 ? "text-gold-bright" : "text-foreground",
              )}
            >
              {formatScore(team.score)}
            </span>
          </div>
        ))}
      </motion.div>

      {/* Category breakdown */}
      {breakdown.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mb-6"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            By Category
          </p>
          <div className="flex flex-col gap-2">
            {breakdown.map(({ category, byTeam }) => (
              <div key={category} className="rounded-xl border border-border bg-card px-4 py-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">{category}</p>
                <div className="flex flex-wrap gap-3">
                  {teams.map((t) => (
                    <span key={t.id} className="text-sm">
                      <span className="text-muted-foreground">{t.name}: </span>
                      <span
                        className={cn(
                          "font-semibold",
                          (byTeam[t.id] ?? 0) > 0 ? "text-emerald-400" : (byTeam[t.id] ?? 0) < 0 ? "text-destructive" : "text-foreground",
                        )}
                      >
                        {(byTeam[t.id] ?? 0) > 0 ? "+" : ""}{formatScore(byTeam[t.id] ?? 0)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Fun stats */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="mb-8"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Session Stats
        </p>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Questions played" value={turns.length.toString()} />
          <StatCard
            label="Correct answers"
            value={turns.filter((t) => t.activeTeamCorrect).length.toString()}
          />
          <StatCard label="Steals attempted" value={stealCount.toString()} />
          <StatCard
            label="Successful steals"
            value={`${successfulSteals}/${stealCount}`}
          />
          <StatCard label="API cost (session)" value={formatCost(sessionCost)} />
        </div>
      </motion.section>

      <Button
        size="lg"
        className="w-full h-14 text-base font-semibold"
        onClick={() => dispatch({ type: "RESET" })}
      >
        Play Again
      </Button>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
