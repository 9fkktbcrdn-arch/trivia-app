"use client";

import { AnimatePresence, motion } from "framer-motion";
import { GameProvider, useGame } from "@/lib/game-context";
import { LandingScreen } from "./screens/LandingScreen";
import { SetupModeScreen } from "./screens/SetupModeScreen";
import { SetupTeamsScreen } from "./screens/SetupTeamsScreen";
import { SetupCategoriesScreen } from "./screens/SetupCategoriesScreen";
import { SetupReviewScreen } from "./screens/SetupReviewScreen";
import { LoadingScreen } from "./screens/LoadingScreen";
import { GameScreen } from "./screens/GameScreen";
import { PracticeScreen } from "./screens/PracticeScreen";
import { ResultsScreen } from "./screens/ResultsScreen";

const SCREEN_COMPONENTS = {
  landing: LandingScreen,
  "setup-mode": SetupModeScreen,
  "setup-teams": SetupTeamsScreen,
  "setup-categories": SetupCategoriesScreen,
  "setup-review": SetupReviewScreen,
  loading: LoadingScreen,
  game: GameScreen,
  practice: PracticeScreen,
  results: ResultsScreen,
} as const;

function Shell() {
  const { state } = useGame();
  const Screen = SCREEN_COMPONENTS[state.screen];

  return (
    <div className="min-h-dvh bg-background">
      <AnimatePresence mode="wait">
        <motion.div
          key={state.screen}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="min-h-dvh"
        >
          <Screen />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function AppShell() {
  return (
    <GameProvider>
      <Shell />
    </GameProvider>
  );
}
