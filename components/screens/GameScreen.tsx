"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/lib/game-context";
import { Button } from "@/components/ui/button";
import {
  cn,
  formatScore,
  pointsForDifficulty,
  halfPoints,
  difficultyLabel,
  difficultyColor,
  generateId,
} from "@/lib/utils";
import { getCachedQuestions, cacheQuestions } from "@/lib/question-cache";
import type { Team, TriviaQuestion, PooledQuestion, Difficulty } from "@/lib/types";

const TIEBREAKER_CATEGORIES = [
  "General Knowledge",
  "World Geography",
  "Science & Nature",
  "Animals & Wildlife",
  "Outer Space",
  "World History",
  "Famous Inventions",
  "Sports",
  "Music & Movies",
  "Food Around the World",
];

// ── Scoreboard ────────────────────────────────────────────────────

function Scoreboard({
  teams,
  activeTeamIndex,
  deltas,
}: {
  teams: Team[];
  activeTeamIndex: number;
  deltas: Record<string, { value: number; key: string }>;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mb-6 no-scrollbar">
      {teams.map((team, i) => (
        <div
          key={team.id}
          className={cn(
            "relative flex-1 min-w-[100px] rounded-xl px-3 py-3 text-center transition-all duration-300 border",
            i === activeTeamIndex
              ? "bg-gold-bright/10 border-gold-dim shadow-gold"
              : "bg-card border-border",
          )}
        >
          <p className="text-xs font-semibold text-muted-foreground truncate mb-1">
            {team.name}
            {i === activeTeamIndex && (
              <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-gold-bright align-middle" />
            )}
          </p>
          <p className={cn("text-xl font-bold tabular-nums", team.score < 0 ? "text-destructive" : "text-foreground")}>
            {formatScore(team.score)}
          </p>

          {/* Delta animation */}
          <AnimatePresence>
            {deltas[team.id] && (
              <motion.div
                key={deltas[team.id].key}
                initial={{ opacity: 1, y: 0, scale: 1 }}
                animate={{ opacity: 0, y: -36, scale: 1.2 }}
                exit={{}}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className={cn(
                  "absolute -top-2 left-1/2 -translate-x-1/2 text-sm font-bold pointer-events-none",
                  deltas[team.id].value > 0 ? "text-emerald-400" : "text-destructive",
                )}
              >
                {deltas[team.id].value > 0 ? "+" : ""}
                {formatScore(deltas[team.id].value)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// ── Answer button ─────────────────────────────────────────────────

function AnswerButton({
  label,
  choice,
  state: btnState,
  onClick,
  disabled,
}: {
  label: string;
  choice: string;
  state: "default" | "correct" | "wrong" | "selected";
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-4 rounded-xl border text-left transition-all duration-200 text-sm font-medium min-h-[3.5rem]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        btnState === "default" &&
          "bg-card border-border hover:border-gold-dim hover:bg-gold-dim/5 active:scale-[0.98]",
        btnState === "selected" && "bg-gold-dim/15 border-gold-dim",
        btnState === "correct" && "bg-emerald-400/15 border-emerald-400 text-emerald-300",
        btnState === "wrong" && "bg-destructive/15 border-destructive/60 text-destructive/80",
        disabled && "opacity-60 cursor-not-allowed",
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
        {label}
      </span>
      <span className="leading-snug">{choice}</span>
    </button>
  );
}

const CHOICE_LABELS = ["A", "B", "C", "D"];

// ── Game Screen ───────────────────────────────────────────────────

export function GameScreen() {
  const { state, dispatch } = useGame();
  const session = state.session!;
  const { questionPool, currentQuestionIndex, currentTeamIndex, turnPhase, teams } = session;

  const currentQ = questionPool[currentQuestionIndex] as PooledQuestion | undefined;
  const activeTeam = teams[currentTeamIndex];
  const pts = currentQ ? pointsForDifficulty(currentQ.difficulty) : 0;

  // Guard: question pool exhausted (happens briefly during exit animation)
  if (!currentQ) return null;

  const [deltas, setDeltas] = useState<Record<string, { value: number; key: string }>>({});
  const prevScoresRef = useRef<Record<string, number>>({});

  // Detect score changes and show deltas
  useEffect(() => {
    const newDeltas: Record<string, { value: number; key: string }> = {};
    teams.forEach((t) => {
      const prev = prevScoresRef.current[t.id] ?? 0;
      const delta = t.score - prev;
      if (delta !== 0) {
        newDeltas[t.id] = { value: delta, key: generateId() };
      }
    });
    if (Object.keys(newDeltas).length > 0) {
      setDeltas(newDeltas);
      const timer = setTimeout(() => setDeltas({}), 1400);
      return () => clearTimeout(timer);
    }
  }, [teams]);

  useEffect(() => {
    const record: Record<string, number> = {};
    teams.forEach((t) => (record[t.id] = t.score));
    prevScoresRef.current = record;
  }, [teams]);

  // ── Tiebreaker ────────────────────────────────────────────────

  if (session.turnPhase === "tiebreaker") {
    return <TiebreakerScreen />;
  }

  // ── Question phase ─────────────────────────────────────────────

  if (turnPhase === "question") {
    return (
      <div className="min-h-dvh flex flex-col px-4 py-6 max-w-xl mx-auto">
        <Scoreboard teams={teams} activeTeamIndex={currentTeamIndex} deltas={deltas} />

        {/* Turn header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
              {currentQ.category}
            </p>
            <p className="text-lg font-bold text-gold-bright">{activeTeam.name}&apos;s turn</p>
          </div>
          {/* Point value badge — big and color-coded by difficulty */}
          <div
            className={cn(
              "flex flex-col items-center justify-center w-16 h-16 rounded-2xl border-2 font-black",
              currentQ.difficulty === "easy"
                ? "bg-emerald-400/10 border-emerald-400/40 text-emerald-400"
                : currentQ.difficulty === "medium"
                  ? "bg-amber-400/10 border-amber-400/40 text-amber-400"
                  : "bg-rose-400/10 border-rose-400/40 text-rose-400",
            )}
          >
            <span className="text-xl leading-none">{pts}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">pts</span>
          </div>
        </div>

        {/* Progress + question counter */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gold-bright rounded-full transition-all duration-500"
              style={{ width: `${(currentQuestionIndex / questionPool.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {currentQuestionIndex + 1}/{questionPool.length}
          </span>
        </div>

        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col"
        >
          <div className="rounded-2xl border border-border bg-card px-5 py-6 mb-6">
            <p className="text-base md:text-lg font-semibold text-foreground leading-snug">
              {currentQ.question}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {currentQ.choices.map((choice, i) => (
              <AnswerButton
                key={i}
                label={CHOICE_LABELS[i]}
                choice={choice}
                state="default"
                onClick={() => dispatch({ type: "SUBMIT_ANSWER", answerIndex: i })}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Steal phase ───────────────────────────────────────────────

  if (turnPhase === "steal") {
    const pendingSteal = session.pendingSteal ?? [];
    const undecidedSteal = pendingSteal.find((s) => s.decision === undefined);
    const hp = halfPoints(currentQ.difficulty);

    return (
      <div className="min-h-dvh flex flex-col px-4 py-6 max-w-xl mx-auto">
        <Scoreboard teams={teams} activeTeamIndex={currentTeamIndex} deltas={deltas} />

        {/* Steal opportunity header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-gold-bright/40 bg-gold-bright/10 px-5 py-4 mb-4 text-center"
        >
          <p className="text-xs font-bold tracking-widest uppercase text-gold-dim mb-1">Steal Opportunity</p>
          <p className="text-2xl font-black text-gold-bright">⚡ {hp} pts</p>
          <p className="text-xs text-muted-foreground mt-1">
            Wrong steal costs <span className="text-destructive font-semibold">−{hp} pts</span>
          </p>
        </motion.div>

        {/* Who missed it */}
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 mb-4 text-sm flex items-center gap-2">
          <span className="text-lg">❌</span>
          <p className="text-muted-foreground">
            <span className="font-bold text-foreground">{activeTeam.name}</span> got it wrong
          </p>
        </div>

        {/* Dimmed question for reference */}
        <div className="rounded-xl border border-border bg-card/50 px-4 py-3 mb-5 text-sm text-foreground/50 leading-snug">
          {currentQ.question}
        </div>

        {undecidedSteal ? (
          <StealDecision
            question={currentQ}
            stealOpportunity={undecidedSteal}
            hp={hp}
            onDecide={(decision, answerIndex) =>
              dispatch({
                type: "SUBMIT_STEAL",
                teamId: undecidedSteal.teamId,
                decision,
                answerIndex,
              })
            }
          />
        ) : null}
      </div>
    );
  }

  // ── Reveal phase ──────────────────────────────────────────────

  if (turnPhase === "reveal") {
    const lastTurn = session.turns[session.turns.length - 1];
    const correct = lastTurn.activeTeamCorrect;
    const stealSucceeded = lastTurn.steal?.decision === "steal" && lastTurn.steal.success;
    const stealFailed = lastTurn.steal?.decision === "steal" && !lastTurn.steal.success;

    // Teams that answered, were marked wrong, and can therefore dispute the result
    const challengers: { teamId: string; teamName: string; answerIndex: number }[] = [];
    if (!correct && lastTurn.activeTeamAnswerIndex !== currentQ.correctIndex) {
      challengers.push({
        teamId: lastTurn.activeTeamId,
        teamName: activeTeam.name,
        answerIndex: lastTurn.activeTeamAnswerIndex,
      });
    }
    if (stealFailed && lastTurn.steal && lastTurn.steal.answeredIndex !== undefined) {
      challengers.push({
        teamId: lastTurn.steal.teamId,
        teamName: lastTurn.steal.teamName,
        answerIndex: lastTurn.steal.answeredIndex,
      });
    }

    return (
      <div className="min-h-dvh flex flex-col px-4 py-6 max-w-xl mx-auto">
        <Scoreboard teams={teams} activeTeamIndex={currentTeamIndex} deltas={deltas} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex-1 flex flex-col gap-4"
        >
          {/* Primary result banner */}
          <div
            className={cn(
              "rounded-2xl px-5 py-5 border text-center",
              correct
                ? "bg-emerald-400/10 border-emerald-400/40"
                : "bg-destructive/10 border-destructive/30",
            )}
          >
            <motion.p
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.05 }}
              className="text-4xl mb-2"
            >
              {correct ? "✅" : "❌"}
            </motion.p>
            <p className={cn("text-xl font-black", correct ? "text-emerald-300" : "text-destructive/80")}>
              {correct ? `+${pts} pts` : "Missed!"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {correct
                ? `${activeTeam.name} got it right`
                : `${activeTeam.name} got it wrong`}
            </p>
          </div>

          {/* Steal result (if applicable) */}
          {lastTurn.steal?.decision === "steal" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={cn(
                "rounded-xl px-4 py-3 border text-center text-sm",
                stealSucceeded
                  ? "bg-gold-bright/10 border-gold-bright/30"
                  : "bg-destructive/10 border-destructive/30",
              )}
            >
              {stealSucceeded ? (
                <>
                  <span className="font-bold text-gold-bright">⚡ {lastTurn.steal.teamName} stole it!</span>
                  <span className="text-muted-foreground ml-2">+{lastTurn.steal.halfPoints} pts</span>
                </>
              ) : (
                <>
                  <span className="font-bold text-destructive/80">{lastTurn.steal.teamName} failed the steal</span>
                  <span className="text-muted-foreground ml-2">−{lastTurn.steal.halfPoints} pts</span>
                </>
              )}
            </motion.div>
          )}

          {/* Question + correct answer */}
          <div className="rounded-2xl border border-border bg-card px-5 py-5">
            <p className="text-sm text-muted-foreground mb-3 leading-snug">{currentQ.question}</p>
            <div className="grid grid-cols-1 gap-2">
              {currentQ.choices.map((choice, i) => (
                <AnswerButton
                  key={i}
                  label={CHOICE_LABELS[i]}
                  choice={choice}
                  state={
                    i === currentQ.correctIndex
                      ? "correct"
                      : i === lastTurn.activeTeamAnswerIndex && !correct
                        ? "wrong"
                        : "default"
                  }
                  onClick={() => {}}
                  disabled
                />
              ))}
            </div>
          </div>

          {/* Explanation */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl border border-gold-dim/30 bg-gold-dim/5 px-4 py-3"
          >
            <p className="text-xs font-semibold text-gold-bright uppercase tracking-widest mb-1">
              Fun Fact
            </p>
            <p className="text-sm text-foreground leading-relaxed">{currentQ.explanation}</p>
          </motion.div>

          {/* Challenge — dispute the marked answer */}
          {challengers.length > 0 && (
            <ChallengePanel question={currentQ} challengers={challengers} />
          )}
        </motion.div>

        <Button
          size="lg"
          className="mt-6 w-full h-14 text-base font-semibold shadow-gold-lg"
          onClick={() => dispatch({ type: "ADVANCE_TURN" })}
        >
          Next Question →
        </Button>
      </div>
    );
  }

  return null;
}

// ── Steal Decision Sub-component ──────────────────────────────────

function StealDecision({
  question,
  stealOpportunity,
  hp,
  onDecide,
}: {
  question: PooledQuestion;
  stealOpportunity: { teamId: string; teamName: string; halfPoints: number };
  hp: number;
  onDecide: (decision: "steal" | "pass", answerIndex?: number) => void;
}) {
  const [stealing, setStealing] = useState(false);
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);

  if (!stealing) {
    return (
      <div className="flex-1 flex flex-col gap-4">
        <div className="rounded-2xl border border-gold-dim/40 bg-gold-dim/5 px-5 py-6 text-center">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-2">
            Your chance to steal
          </p>
          <p className="font-black text-2xl text-foreground mb-1">
            {stealOpportunity.teamName}
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Risk <span className="text-destructive font-semibold">−{hp} pts</span> for a chance at{" "}
            <span className="text-gold-bright font-bold">+{hp} pts</span>
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-14 text-base"
              onClick={() => onDecide("pass")}
            >
              Pass
            </Button>
            <Button
              className="flex-1 h-14 text-base bg-gold-bright text-black hover:bg-gold-light font-black tracking-wide shadow-gold-lg"
              onClick={() => setStealing(true)}
            >
              ⚡ Steal!
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-3">
      <p className="text-sm font-semibold text-foreground text-center">
        {stealOpportunity.teamName} — pick the correct answer:
      </p>
      <div className="grid grid-cols-1 gap-3">
        {question.choices.map((choice, i) => (
          <AnswerButton
            key={i}
            label={CHOICE_LABELS[i]}
            choice={choice}
            state={chosenIndex === i ? "selected" : "default"}
            onClick={() => setChosenIndex(i)}
          />
        ))}
      </div>
      {chosenIndex !== null && (
        <Button
          size="lg"
          className="w-full h-14 mt-2"
          onClick={() => onDecide("steal", chosenIndex)}
        >
          Lock in answer
        </Button>
      )}
    </div>
  );
}

// ── Challenge Panel ───────────────────────────────────────────────

function ChallengePanel({
  question,
  challengers,
}: {
  question: PooledQuestion;
  challengers: { teamId: string; teamName: string; answerIndex: number }[];
}) {
  const { dispatch } = useGame();
  const [expanded, setExpanded] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<{
    teamName: string;
    upheld: boolean;
    explanation: string;
    points: number;
  } | null>(null);

  const full = pointsForDifficulty(question.difficulty);
  const half = halfPoints(question.difficulty);

  async function runChallenge(c: { teamId: string; teamName: string; answerIndex: number }) {
    setVerifying(true);
    try {
      const res = await fetch("/api/verify-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.question,
          choices: question.choices,
          teamAnswerIndex: c.answerIndex,
        }),
      });
      const data = await res.json();
      if (data.costUsd) dispatch({ type: "ADD_SESSION_COST", costUsd: data.costUsd });
      const upheld = Boolean(data.teamAnswerCorrect);
      dispatch({ type: "APPLY_CHALLENGE", teamId: c.teamId, upheld });
      setResult({
        teamName: c.teamName,
        upheld,
        explanation: data.explanation ?? "",
        points: upheld ? full : half,
      });
    } catch {
      setResult({
        teamName: c.teamName,
        upheld: false,
        explanation: "Couldn't reach the fact-checker. No points changed.",
        points: 0,
      });
    } finally {
      setVerifying(false);
    }
  }

  // ── Result shown ──
  if (result) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "rounded-xl px-4 py-4 border text-center",
          result.upheld
            ? "bg-emerald-400/10 border-emerald-400/40"
            : "bg-destructive/10 border-destructive/30",
        )}
      >
        <p className="text-2xl mb-1">{result.upheld ? "⚖️✅" : "⚖️❌"}</p>
        <p className="font-bold text-foreground">
          {result.upheld
            ? `Challenge upheld! ${result.teamName} was right.`
            : `Answer confirmed. ${result.teamName}'s challenge failed.`}
        </p>
        <p className={cn("text-sm font-semibold mt-1", result.upheld ? "text-emerald-300" : "text-destructive/80")}>
          {result.points === 0
            ? "No change"
            : result.upheld
              ? `+${result.points} pts`
              : `−${result.points} pts`}
        </p>
        {result.explanation && (
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{result.explanation}</p>
        )}
      </motion.div>
    );
  }

  // ── Verifying ──
  if (verifying) {
    return (
      <div className="rounded-xl px-4 py-4 border border-gold-dim/30 bg-gold-dim/5 flex items-center justify-center gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          className="w-5 h-5 rounded-full border-2 border-transparent border-t-gold-bright"
        />
        <p className="text-sm text-muted-foreground">Double-checking the facts…</p>
      </div>
    );
  }

  // ── Collapsed button ──
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full rounded-xl border border-border bg-card hover:border-gold-dim hover:bg-gold-dim/5 transition-colors px-4 py-3 text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
      >
        ⚖️ Think the answer is wrong? Challenge it
      </button>
    );
  }

  // ── Expanded: choose who challenges ──
  return (
    <div className="rounded-xl border border-gold-dim/40 bg-gold-dim/5 px-4 py-4">
      <p className="text-xs font-bold tracking-widest uppercase text-gold-dim mb-2 text-center">
        Challenge the answer
      </p>
      <p className="text-xs text-muted-foreground text-center mb-4 leading-relaxed">
        Claude re-checks the facts. If your answer was actually right, you win{" "}
        <span className="text-emerald-400 font-semibold">+{full} pts</span>. If the original
        answer holds, you lose <span className="text-destructive font-semibold">−{half} pts</span>.
      </p>
      <div className="flex flex-col gap-2">
        {challengers.map((c) => (
          <Button
            key={c.teamId}
            className="w-full h-12 font-semibold"
            onClick={() => runChallenge(c)}
          >
            Challenge for {c.teamName}
          </Button>
        ))}
        <button
          onClick={() => setExpanded(false)}
          className="text-xs text-muted-foreground hover:text-foreground mt-1"
        >
          Never mind
        </button>
      </div>
    </div>
  );
}

// ── Tiebreaker ────────────────────────────────────────────────────

function TiebreakerScreen() {
  const { state, dispatch, navigate } = useGame();
  const session = state.session!;
  const { teams } = session;
  const [tiebreakerQ, setTiebreakerQ] = useState<PooledQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const tiedTeams = [...teams].sort((a, b) => b.score - a.score).filter((t, _, arr) => t.score === arr[0].score);

  useEffect(() => {
    generateTiebreaker();
  }, []);

  async function generateTiebreaker() {
    setLoading(true);
    try {
      // Pick a random category each time, and exclude every tiebreaker question
      // ever seen (cross-session) so they never repeat.
      const category =
        TIEBREAKER_CATEGORIES[Math.floor(Math.random() * TIEBREAKER_CATEGORIES.length)];
      const existingQuestions = getCachedQuestions("__tiebreaker__");

      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          difficulty: "medium",
          count: 1,
          existingQuestions,
        }),
      });
      const data = await res.json();
      if (data.costUsd) dispatch({ type: "ADD_SESSION_COST", costUsd: data.costUsd });
      const q = data.questions[0];
      cacheQuestions("__tiebreaker__", [q.question]);
      setTiebreakerQ({ ...q, slotId: 0, used: false });
    } catch {
      // Try again
    } finally {
      setLoading(false);
    }
  }

  function handleAnswer() {
    if (chosenIndex === null || !tiebreakerQ) return;
    const correct = chosenIndex === tiebreakerQ.correctIndex;
    setRevealed(true);

    if (correct) {
      const winner = tiedTeams[activeTeamIndex % tiedTeams.length];
      const updatedTeams = teams.map((t) =>
        t.id === winner.id ? { ...t, score: t.score + 1 } : t,
      );
      setTimeout(() => {
        dispatch({
          type: "START_GAME",
          session: {
            ...session,
            teams: updatedTeams,
            isComplete: true,
            winnerTeamId: winner.id,
          },
        });
        navigate("results");
      }, 2000);
    } else {
      setTimeout(() => {
        setChosenIndex(null);
        setRevealed(false);
        setActiveTeamIndex((i) => (i + 1) % tiedTeams.length);
        generateTiebreaker();
      }, 2000);
    }
  }

  if (loading || !tiebreakerQ) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="w-8 h-8 rounded-full border-2 border-transparent border-t-gold-bright" />
      </div>
    );
  }

  const activeTeam = tiedTeams[activeTeamIndex % tiedTeams.length];

  return (
    <div className="min-h-dvh flex flex-col px-4 py-6 max-w-xl mx-auto gap-4">
      <div className="rounded-xl border border-gold-bright/40 bg-gold-bright/10 px-4 py-3 text-center">
        <p className="font-bold text-gold-bright">⚡ Tiebreaker!</p>
        <p className="text-sm text-muted-foreground">It&apos;s a tie — sudden death question</p>
      </div>

      <p className="text-center text-sm font-semibold text-foreground">{activeTeam.name}&apos;s turn</p>

      <div className="rounded-2xl border border-border bg-card px-5 py-5">
        <p className="font-semibold text-foreground leading-snug">{tiebreakerQ.question}</p>
      </div>

      <div className="flex flex-col gap-3">
        {tiebreakerQ.choices.map((choice, i) => (
          <AnswerButton
            key={i}
            label={CHOICE_LABELS[i]}
            choice={choice}
            state={
              revealed
                ? i === tiebreakerQ.correctIndex
                  ? "correct"
                  : i === chosenIndex
                    ? "wrong"
                    : "default"
                : chosenIndex === i
                  ? "selected"
                  : "default"
            }
            onClick={() => !revealed && setChosenIndex(i)}
            disabled={revealed}
          />
        ))}
      </div>

      {chosenIndex !== null && !revealed && (
        <Button size="lg" className="w-full h-14 mt-2" onClick={handleAnswer}>
          Lock in answer
        </Button>
      )}

      {revealed && (
        <p className="text-center text-sm text-muted-foreground">
          {chosenIndex === tiebreakerQ.correctIndex
            ? `🎉 ${activeTeam.name} wins!`
            : "Wrong — next team gets a try…"}
        </p>
      )}
    </div>
  );
}
