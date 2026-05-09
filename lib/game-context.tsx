"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import type {
  GameSession,
  PracticeSession,
  GameSetup,
  TriviaQuestion,
  PooledQuestion,
  Team,
  Difficulty,
  CategorySlot,
  GameLength,
} from "./types";
import {
  generateId,
  totalGameQuestions,
  distributeQuestions,
  shuffle,
  halfPoints,
  pointsForDifficulty,
} from "./utils";

// ── App-level "screen" state ──────────────────────────────────────

export type Screen =
  | "landing"
  | "setup-mode"       // mode selection
  | "setup-teams"      // team/player entry (game-time only)
  | "setup-categories" // category picker
  | "setup-review"     // review + start
  | "loading"          // pre-generating questions
  | "game"             // active game-time play
  | "practice"         // active practice play
  | "results";         // end screen

export interface AppState {
  screen: Screen;
  setup: Partial<GameSetup>;
  session: GameSession | null;
  practice: PracticeSession | null;
  sessionCostUsd: number;
}

// ── Actions ───────────────────────────────────────────────────────

type Action =
  | { type: "NAVIGATE"; screen: Screen }
  | { type: "SET_MODE"; mode: GameSetup["mode"] }
  | { type: "SET_TEAMS"; teams: Team[] }
  | { type: "SET_CATEGORY_SLOTS"; slots: CategorySlot[] }
  | { type: "SET_GAME_LENGTH"; length: GameLength }
  | { type: "SET_MYSTERY_CATEGORY"; category: string }
  | { type: "START_GAME"; session: GameSession }
  | { type: "START_PRACTICE"; session: PracticeSession }
  // Game-time actions
  | { type: "SUBMIT_ANSWER"; answerIndex: number }
  | { type: "SUBMIT_STEAL"; teamId: string; decision: "steal" | "pass"; answerIndex?: number }
  | { type: "ADVANCE_TURN" }
  // Practice actions
  | { type: "PRACTICE_ANSWER"; answerIndex: number }
  | { type: "PRACTICE_NEXT" }
  | { type: "PRACTICE_ADD_QUESTIONS"; questions: TriviaQuestion[] }
  | { type: "PRACTICE_END" }
  | { type: "ADD_SESSION_COST"; costUsd: number }
  | { type: "RESET" };

// ── Reducer ───────────────────────────────────────────────────────

function applyPoints(teams: Team[], deltas: Record<string, number>): Team[] {
  return teams.map((t) =>
    deltas[t.id] !== undefined ? { ...t, score: t.score + deltas[t.id] } : t,
  );
}

function gameReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "NAVIGATE":
      return { ...state, screen: action.screen };

    case "SET_MODE":
      return { ...state, setup: { ...state.setup, mode: action.mode } };

    case "SET_TEAMS":
      return { ...state, setup: { ...state.setup, teams: action.teams } };

    case "SET_CATEGORY_SLOTS":
      return { ...state, setup: { ...state.setup, categorySlots: action.slots } };

    case "SET_GAME_LENGTH":
      return { ...state, setup: { ...state.setup, gameLength: action.length } };

    case "SET_MYSTERY_CATEGORY":
      return { ...state, setup: { ...state.setup, mysteryCategory: action.category } };

    case "START_GAME":
      return { ...state, screen: "game", session: action.session };

    case "START_PRACTICE":
      return { ...state, screen: "practice", practice: action.session };

    case "SUBMIT_ANSWER": {
      const s = state.session!;
      const q = s.questionPool[s.currentQuestionIndex];
      const correct = action.answerIndex === q.correctIndex;

      if (correct) {
        // Correct — award points, move to reveal
        const pts = pointsForDifficulty(q.difficulty);
        const deltas: Record<string, number> = { [s.teams[s.currentTeamIndex].id]: pts };
        const teams = applyPoints(s.teams, deltas);
        return {
          ...state,
          session: {
            ...s,
            teams,
            turnPhase: "reveal",
            currentAnswer: action.answerIndex,
            turns: [
              ...s.turns,
              {
                questionId: q.id,
                activeTeamId: s.teams[s.currentTeamIndex].id,
                activeTeamCorrect: true,
                activeTeamAnswerIndex: action.answerIndex,
                pointsAwarded: deltas,
                category: q.category,
                difficulty: q.difficulty,
              },
            ],
          },
        };
      } else {
        // Wrong — set up steal opportunities for other teams
        const otherTeams = s.teams.filter((_, i) => i !== s.currentTeamIndex);
        const hp = halfPoints(q.difficulty);
        const steals = otherTeams.map((t) => ({
          teamId: t.id,
          teamName: t.name,
          halfPoints: hp,
        }));
        return {
          ...state,
          session: {
            ...s,
            turnPhase: "steal",
            currentAnswer: action.answerIndex,
            pendingSteal: steals,
          },
        };
      }
    }

    case "SUBMIT_STEAL": {
      const s = state.session!;
      const q = s.questionPool[s.currentQuestionIndex];
      const steals = (s.pendingSteal ?? []).map((st) =>
        st.teamId === action.teamId
          ? { ...st, decision: action.decision, answeredIndex: action.answerIndex }
          : st,
      );

      // Check if all steals have a decision (or only one team)
      const allDecided = steals.every((st) => st.decision !== undefined);
      if (!allDecided) {
        return { ...state, session: { ...s, pendingSteal: steals } };
      }

      // Resolve steal — find first team that chose "steal"
      const stealAttempt = steals.find((st) => st.decision === "steal");
      const deltas: Record<string, number> = {};
      let stealResult: (typeof steals)[0] & { success?: boolean } | undefined;

      if (stealAttempt) {
        const success = stealAttempt.answeredIndex === q.correctIndex;
        const hp = stealAttempt.halfPoints;
        deltas[stealAttempt.teamId] = success ? hp : -hp;
        stealResult = { ...stealAttempt, success };
      }

      const teams = applyPoints(s.teams, deltas);
      const activeTeam = s.teams[s.currentTeamIndex];

      return {
        ...state,
        session: {
          ...s,
          teams,
          turnPhase: "reveal",
          pendingSteal: steals,
          turns: [
            ...s.turns,
            {
              questionId: q.id,
              activeTeamId: activeTeam.id,
              activeTeamCorrect: false,
              activeTeamAnswerIndex: s.currentAnswer ?? -1,
              steal: stealResult,
              pointsAwarded: deltas,
              category: q.category,
              difficulty: q.difficulty,
            },
          ],
        },
      };
    }

    case "ADVANCE_TURN": {
      const s = state.session!;
      const nextQuestionIndex = s.currentQuestionIndex + 1;
      const done = nextQuestionIndex >= s.questionPool.length;

      if (done) {
        // Check for tie
        const sorted = [...s.teams].sort((a, b) => b.score - a.score);
        const isTie = sorted.length >= 2 && sorted[0].score === sorted[1].score;

        if (isTie) {
          // Will trigger a tiebreaker question — handled by loading a new question externally
          return {
            ...state,
            session: { ...s, isComplete: true, turnPhase: "tiebreaker" },
          };
        }

        return {
          ...state,
          screen: "results",
          session: {
            ...s,
            isComplete: true,
            currentQuestionIndex: nextQuestionIndex,
            winnerTeamId: sorted[0].id,
          },
        };
      }

      const nextTeamIndex = (s.currentTeamIndex + 1) % s.teams.length;
      return {
        ...state,
        session: {
          ...s,
          currentQuestionIndex: nextQuestionIndex,
          currentTeamIndex: nextTeamIndex,
          turnPhase: "question",
          pendingSteal: undefined,
          currentAnswer: undefined,
        },
      };
    }

    case "PRACTICE_ANSWER": {
      const p = state.practice!;
      const correct = action.answerIndex === p.questions[p.currentIndex].correctIndex;
      return {
        ...state,
        practice: {
          ...p,
          answered: true,
          chosenIndex: action.answerIndex,
          correctCount: p.correctCount + (correct ? 1 : 0),
          totalAnswered: p.totalAnswered + 1,
        },
      };
    }

    case "PRACTICE_NEXT": {
      const p = state.practice!;
      return {
        ...state,
        practice: {
          ...p,
          currentIndex: p.currentIndex + 1,
          answered: false,
          chosenIndex: undefined,
        },
      };
    }

    case "PRACTICE_ADD_QUESTIONS": {
      const p = state.practice!;
      return {
        ...state,
        practice: { ...p, questions: [...p.questions, ...action.questions], isLoading: false },
      };
    }

    case "PRACTICE_END":
      return { ...state, screen: "results" };

    case "ADD_SESSION_COST":
      return { ...state, sessionCostUsd: state.sessionCostUsd + action.costUsd };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

// ── Initial state ─────────────────────────────────────────────────

const initialState: AppState = {
  screen: "landing",
  setup: {},
  session: null,
  practice: null,
  sessionCostUsd: 0,
};

// ── Context ───────────────────────────────────────────────────────

interface GameContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  navigate: (screen: Screen) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const navigate = useCallback((screen: Screen) => dispatch({ type: "NAVIGATE", screen }), []);
  return (
    <GameContext.Provider value={{ state, dispatch, navigate }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside GameProvider");
  return ctx;
}

// ── Helper to build a GameSession from setup + question pool ──────

export function buildGameSession(
  setup: GameSetup,
  questionsBySlot: PooledQuestion[][],
): GameSession {
  const poolFlat = shuffle(questionsBySlot.flat());
  const teams = setup.teams.map((t) => ({ ...t, score: 0 }));

  return {
    mode: "game-time",
    setup,
    questionPool: poolFlat,
    currentQuestionIndex: 0,
    currentTeamIndex: 0,
    turnPhase: "question",
    turns: [],
    teams,
    isComplete: false,
  };
}
