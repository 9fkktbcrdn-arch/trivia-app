// ── Game Types ────────────────────────────────────────────────────

export type GameMode = "game-time" | "practice";
export type Difficulty = "easy" | "medium" | "hard";
export type GameLength = 10 | 20; // questions per team

export interface Team {
  id: string;
  name: string;
  players: string[];
  score: number;
}

export interface CategorySlot {
  id: number; // 1–5 (5 = mystery)
  category: string;
  difficulty: Difficulty;
  isMystery: boolean;
  isLocked: boolean;
}

export interface TriviaQuestion {
  id: string;
  question: string;
  choices: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  category: string;
  difficulty: Difficulty;
}

export interface PooledQuestion extends TriviaQuestion {
  slotId: number;
  used: boolean;
}

// ── Setup State ───────────────────────────────────────────────────

export interface GameSetup {
  mode: GameMode;
  teams: Team[];
  categorySlots: CategorySlot[];
  gameLength: GameLength;
  mysteryCategory?: string;
}

// ── Game Session State ────────────────────────────────────────────

export type TurnPhase =
  | "question"       // active team answering
  | "steal"          // other team(s) offered steal
  | "reveal"         // correct answer + explanation shown
  | "tiebreaker";    // sudden death

export interface StealOpportunity {
  teamId: string;
  teamName: string;
  halfPoints: number;
  decision?: "steal" | "pass";
  answeredIndex?: number;
}

export interface TurnResult {
  questionId: string;
  activeTeamId: string;
  activeTeamCorrect: boolean;
  activeTeamAnswerIndex: number;
  steal?: StealOpportunity & { success?: boolean };
  pointsAwarded: Record<string, number>; // teamId → delta
  category: string;
  difficulty: Difficulty;
}

export interface GameSession {
  mode: GameMode;
  setup: GameSetup;
  questionPool: PooledQuestion[];
  currentQuestionIndex: number;
  currentTeamIndex: number;
  turnPhase: TurnPhase;
  turns: TurnResult[];
  teams: Team[];
  isComplete: boolean;
  pendingSteal?: StealOpportunity[];
  currentAnswer?: number; // active team's chosen answer index
  winnerTeamId?: string;
}

// ── Practice State ────────────────────────────────────────────────

export interface PracticeSession {
  category: string;
  questions: TriviaQuestion[];
  currentIndex: number;
  answered: boolean;
  chosenIndex?: number;
  correctCount: number;
  totalAnswered: number;
  isLoading: boolean;
  isComplete: boolean;
}

// ── Category Storage ──────────────────────────────────────────────

export interface RecentCategory {
  name: string;
  timesPlayed: number;
  lastPlayedAt: string; // ISO date
}

export interface CategoryStore {
  recent: RecentCategory[];
  custom: string[]; // user-typed custom categories (for quick re-access)
}

// ── API payloads ──────────────────────────────────────────────────

export interface GenerateQuestionsRequest {
  category: string;
  difficulty: Difficulty;
  count: number;
  existingQuestions?: string[]; // to avoid repeats
}

export interface GenerateQuestionsResponse {
  questions: TriviaQuestion[];
  error?: string;
}

export interface ChooseCategoryRequest {
  avoidCategories?: string[];
  mode?: "random" | "mystery";
}

export interface ChooseCategoryResponse {
  category: string;
  error?: string;
}
