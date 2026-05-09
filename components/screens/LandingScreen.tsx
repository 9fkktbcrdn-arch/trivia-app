"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Zap } from "lucide-react";
import { useGame } from "@/lib/game-context";

export function LandingScreen() {
  const { dispatch, navigate } = useGame();
  const [totalCost, setTotalCost] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/costs")
      .then((r) => r.json())
      .then((d) => setTotalCost(d.totalCostUsd ?? 0))
      .catch(() => {});
  }, []);

  function selectMode(mode: "game-time" | "practice") {
    dispatch({ type: "SET_MODE", mode });
    navigate(mode === "game-time" ? "setup-teams" : "setup-categories");
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background dot grid */}
      <div className="absolute inset-0 bg-dot-grid opacity-40 pointer-events-none" />

      {/* Gold orb glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(0.76 0.12 80 / 0.06) 0%, transparent 70%)",
        }}
      />

      <motion.div
        className="relative z-10 flex flex-col items-center text-center gap-8 max-w-sm w-full"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Logo mark */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-gold"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.16 0 0) 0%, oklch(0.20 0 0) 100%)",
            border: "1px solid oklch(0.76 0.12 80 / 0.35)",
          }}
        >
          <span className="text-4xl" role="img" aria-label="trophy">
            🏆
          </span>
        </motion.div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-gold-gradient">
            Family Trivia
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Dinner table showdowns, AI-powered questions, and legendary family moments.
          </p>
        </div>

        {/* Divider */}
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-gold-dim to-transparent" />

        {/* Mode selection cards — tapping one goes directly to setup */}
        <div className="w-full flex flex-col gap-3">
          <motion.button
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            onClick={() => selectMode("game-time")}
            className="group relative w-full text-left rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-gold-dim hover:shadow-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-start gap-4">
              <div className="mt-0.5 w-10 h-10 rounded-lg flex items-center justify-center bg-secondary group-hover:bg-gold-dim/10 transition-colors">
                <Trophy className="w-5 h-5 text-gold-bright" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">Game Time</p>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gold-bright/10 text-gold-bright border border-gold-bright/20">
                    Competitive
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Teams, scores, steal-or-lose, and a winner reveal with confetti.
                </p>
              </div>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            onClick={() => selectMode("practice")}
            className="group relative w-full text-left rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-gold-dim hover:shadow-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-start gap-4">
              <div className="mt-0.5 w-10 h-10 rounded-lg flex items-center justify-center bg-secondary group-hover:bg-gold-dim/10 transition-colors">
                <Zap className="w-5 h-5 text-gold-bright" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">Practice</p>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                    Casual
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  No pressure — just a steady stream of questions for the whole table.
                </p>
              </div>
            </div>
          </motion.button>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Powered by Claude AI · Questions generated live
          </p>
          {totalCost !== null && totalCost > 0 && (
            <p className="text-xs text-muted-foreground/60 mt-1">
              All-time API spend: <span className="text-gold-dim font-medium">${totalCost.toFixed(4)}</span>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
