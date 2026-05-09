"use client";

import { motion } from "framer-motion";
import { Trophy, Zap, ArrowLeft } from "lucide-react";
import { useGame } from "@/lib/game-context";
import { Button } from "@/components/ui/button";
import { PageWrapper, SectionHeading } from "@/components/PageWrapper";

export function SetupModeScreen() {
  const { dispatch, navigate } = useGame();

  function selectMode(mode: "game-time" | "practice") {
    dispatch({ type: "SET_MODE", mode });
    if (mode === "game-time") {
      navigate("setup-teams");
    } else {
      navigate("setup-categories");
    }
  }

  return (
    <PageWrapper>
      <button
        onClick={() => navigate("landing")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <SectionHeading
        label="Step 1 of 3"
        title="Choose your mode"
        subtitle="How do you want to play tonight?"
      />

      <div className="flex flex-col gap-4">
        <ModeCard
          icon={<Trophy className="w-6 h-6 text-gold-bright" />}
          title="Game Time"
          badge="Competitive"
          badgeVariant="gold"
          description="Form teams, pick 5 categories with per-slot difficulty, and battle it out. Wrong answers can be stolen — for better or worse."
          features={["2+ teams", "5 categories", "Steal mechanic", "Winner reveal"]}
          onClick={() => selectMode("game-time")}
          delay={0.1}
        />

        <ModeCard
          icon={<Zap className="w-6 h-6 text-gold-bright" />}
          title="Practice"
          badge="Casual"
          badgeVariant="default"
          description="No teams, no pressure. Pick one category and enjoy a relaxing stream of trivia for as long as you want."
          features={["No scorekeeping", "Single category", "Open-ended", "End whenever"]}
          onClick={() => selectMode("practice")}
          delay={0.2}
        />
      </div>
    </PageWrapper>
  );
}

interface ModeCardProps {
  icon: React.ReactNode;
  title: string;
  badge: string;
  badgeVariant: "gold" | "default";
  description: string;
  features: string[];
  onClick: () => void;
  delay?: number;
}

function ModeCard({
  icon,
  title,
  badge,
  badgeVariant,
  description,
  features,
  onClick,
  delay = 0,
}: ModeCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className="group w-full text-left rounded-2xl border border-border bg-card p-6 transition-all duration-200 hover:border-gold-dim hover:shadow-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-secondary group-hover:bg-gold-dim/10 transition-colors shrink-0">
          {icon}
        </div>
        <div className="flex items-center gap-2 pt-1.5">
          <span className="font-bold text-lg text-foreground">{title}</span>
          <span
            className={
              badgeVariant === "gold"
                ? "text-xs font-medium px-2 py-0.5 rounded-full bg-gold-bright/10 text-gold-bright border border-gold-bright/20"
                : "text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border"
            }
          >
            {badge}
          </span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{description}</p>

      <div className="flex flex-wrap gap-2">
        {features.map((f) => (
          <span
            key={f}
            className="text-xs font-medium px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground"
          >
            {f}
          </span>
        ))}
      </div>
    </motion.button>
  );
}
