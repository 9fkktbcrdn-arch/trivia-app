"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Lock, X, Search } from "lucide-react";
import { useGame } from "@/lib/game-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageWrapper, SectionHeading } from "@/components/PageWrapper";
import { cn, PRESET_CATEGORIES, difficultyLabel } from "@/lib/utils";
import type { CategorySlot, Difficulty, RecentCategory } from "@/lib/types";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

function createDefaultSlots(isGame: boolean): CategorySlot[] {
  if (isGame) {
    return [
      { id: 1, category: "", difficulty: "medium", isMystery: false, isLocked: false },
      { id: 2, category: "", difficulty: "medium", isMystery: false, isLocked: false },
      { id: 3, category: "", difficulty: "medium", isMystery: false, isLocked: false },
      { id: 4, category: "", difficulty: "medium", isMystery: false, isLocked: false },
      { id: 5, category: "", difficulty: "medium", isMystery: true, isLocked: false },
    ];
  }
  return [{ id: 1, category: "", difficulty: "medium", isMystery: false, isLocked: false }];
}

export function SetupCategoriesScreen() {
  const { state, dispatch, navigate } = useGame();
  const isGame = state.setup.mode === "game-time";
  const [slots, setSlots] = useState<CategorySlot[]>(createDefaultSlots(isGame));
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [customInputs, setCustomInputs] = useState<Record<number, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingSlot, setLoadingSlot] = useState<number | null>(null);
  const [recentCategories, setRecentCategories] = useState<RecentCategory[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setRecentCategories(data.recent ?? []))
      .catch(() => {});
  }, []);

  function updateSlot(id: number, updates: Partial<CategorySlot>) {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }

  function selectCategory(slotId: number, category: string) {
    updateSlot(slotId, { category, isLocked: true });
    setCustomInputs((prev) => ({ ...prev, [slotId]: "" }));
    setSearchQuery("");
    setActiveSlot(null);
  }

  async function chooseForMe(slotId: number) {
    setLoadingSlot(slotId);
    const avoid = slots.filter((s) => s.category && s.id !== slotId).map((s) => s.category);
    try {
      const res = await fetch("/api/choose-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avoidCategories: avoid, mode: "random" }),
      });
      const data = await res.json();
      if (data.category) selectCategory(slotId, data.category);
    } catch {
      // silent — user can try again
    } finally {
      setLoadingSlot(null);
    }
  }

  async function removeFromRecent(name: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", name }),
    });
    setRecentCategories((prev) => prev.filter((r) => r.name !== name));
  }

  function toggleSlot(id: number) {
    setActiveSlot((prev) => (prev === id ? null : id));
    setSearchQuery("");
  }

  function handleContinue() {
    dispatch({ type: "SET_CATEGORY_SLOTS", slots });
    if (isGame) {
      navigate("setup-review");
    } else {
      dispatch({ type: "SET_GAME_LENGTH", length: 10 });
      navigate("loading");
    }
  }

  const filledNonMystery = slots.filter((s) => !s.isMystery && s.category).length;
  const requiredSlots = isGame ? 4 : 1;
  const canContinue = filledNonMystery >= requiredSlots;
  const filteredPresets = PRESET_CATEGORIES.filter((p) =>
    p.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <PageWrapper>
      <button
        onClick={() => navigate(isGame ? "setup-teams" : "setup-mode")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <SectionHeading
        label={isGame ? "Step 3 of 4" : "Step 2 of 2"}
        title={isGame ? "Pick your categories" : "Pick a category"}
        subtitle={
          isGame
            ? "Tap a slot to choose its category. Slot 5 is always a mystery. Point values are assigned automatically based on question difficulty."
            : "Choose one category and difficulty for your practice session."
        }
      />

      <div className="flex flex-col gap-3 mb-6">
        {slots.map((slot) => (
          <SlotCard
            key={slot.id}
            slot={slot}
            isOpen={activeSlot === slot.id}
            isLoading={loadingSlot === slot.id}
            showDifficulty={!isGame}
            customInput={customInputs[slot.id] ?? ""}
            searchQuery={activeSlot === slot.id ? searchQuery : ""}
            recentCategories={recentCategories}
            filteredPresets={filteredPresets}
            onToggle={() => !slot.isMystery && toggleSlot(slot.id)}
            onDifficultyChange={(d) => updateSlot(slot.id, { difficulty: d })}
            onClear={() => { updateSlot(slot.id, { category: "", isLocked: false }); setActiveSlot(slot.id); }}
            onChooseForMe={() => chooseForMe(slot.id)}
            onSelectCategory={(cat) => selectCategory(slot.id, cat)}
            onCustomInputChange={(val) => setCustomInputs((prev) => ({ ...prev, [slot.id]: val }))}
            onSearchChange={setSearchQuery}
            onRemoveRecent={removeFromRecent}
          />
        ))}
      </div>

      <Button
        size="lg"
        className="w-full h-14 text-base font-semibold"
        onClick={handleContinue}
        disabled={!canContinue}
      >
        {isGame ? "Continue to Review" : "Start Practice"}
      </Button>

      {!canContinue && (
        <p className="text-center text-sm text-muted-foreground mt-3">
          {isGame
            ? `Fill in ${requiredSlots - filledNonMystery} more slot${requiredSlots - filledNonMystery !== 1 ? "s" : ""} to continue`
            : "Pick a category to continue"}
        </p>
      )}
    </PageWrapper>
  );
}

interface SlotCardProps {
  slot: CategorySlot;
  isOpen: boolean;
  isLoading: boolean;
  showDifficulty: boolean;
  customInput: string;
  searchQuery: string;
  recentCategories: RecentCategory[];
  filteredPresets: readonly string[];
  onToggle: () => void;
  onDifficultyChange: (d: Difficulty) => void;
  onClear: () => void;
  onChooseForMe: () => void;
  onSelectCategory: (cat: string) => void;
  onCustomInputChange: (val: string) => void;
  onSearchChange: (val: string) => void;
  onRemoveRecent: (name: string, e: React.MouseEvent) => void;
}

function SlotCard({
  slot, isOpen, isLoading, showDifficulty, customInput, searchQuery,
  recentCategories, filteredPresets,
  onToggle, onDifficultyChange, onClear, onChooseForMe,
  onSelectCategory, onCustomInputChange, onSearchChange, onRemoveRecent,
}: SlotCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden transition-all duration-200",
        isOpen ? "border-gold-dim shadow-gold" : "border-border",
        slot.isMystery && "border-dashed",
      )}
    >
      {/* Header row — always visible */}
      <button
        onClick={onToggle}
        disabled={slot.isMystery}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0",
            slot.isMystery
              ? "bg-gold-bright/10 text-gold-bright border border-gold-bright/30"
              : isOpen
                ? "bg-gold-bright text-black"
                : "bg-secondary text-secondary-foreground",
          )}
        >
          {slot.isMystery ? <Lock className="w-4 h-4" /> : slot.id}
        </div>

        <div className="flex-1 min-w-0 text-left">
          {slot.isMystery ? (
            <>
              <p className="font-semibold text-gold-bright text-sm">Mystery Slot</p>
              <p className="text-xs text-muted-foreground">Category revealed at game start</p>
            </>
          ) : slot.category ? (
            <p className="font-semibold text-foreground text-sm">{slot.category}</p>
          ) : (
            <p className="text-muted-foreground text-sm">
              {isLoading ? "Choosing…" : "Choose a category"}
            </p>
          )}
        </div>

        {slot.category && !slot.isMystery && (
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), onClear())}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </div>
        )}
      </button>

      {/* Difficulty row — Practice only */}
      {showDifficulty && (
        <div className="flex items-center gap-2 px-4 pb-3 flex-wrap">
          <span className="text-xs text-muted-foreground mr-1">Difficulty:</span>
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => onDifficultyChange(d)}
              className={cn(
                "text-xs font-medium px-2.5 py-1 rounded-full border transition-colors",
                slot.difficulty === d
                  ? d === "easy"
                    ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/30"
                    : d === "medium"
                      ? "bg-amber-400/10 text-amber-400 border-amber-400/30"
                      : "bg-rose-400/10 text-rose-400 border-rose-400/30"
                  : "text-muted-foreground border-border hover:border-gold-dim",
              )}
            >
              {difficultyLabel(d)}
            </button>
          ))}
        </div>
      )}

      {/* Picker — expands inline when slot is open */}
      <AnimatePresence>
        {isOpen && !slot.isMystery && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-border pt-4 flex flex-col gap-3">
              {/* Custom input */}
              <div className="flex gap-2">
                <Input
                  value={customInput}
                  onChange={(e) => onCustomInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customInput.trim()) onSelectCategory(customInput.trim());
                  }}
                  placeholder="Type a custom category…"
                  className="flex-1 h-10"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={() => customInput.trim() && onSelectCategory(customInput.trim())}
                  disabled={!customInput.trim()}
                  className="h-10 px-4 shrink-0"
                >
                  Use
                </Button>
              </div>

              {/* Choose for me */}
              <Button
                variant="secondary"
                className="w-full gap-2"
                onClick={onChooseForMe}
                disabled={isLoading}
              >
                <Sparkles className="w-4 h-4 text-gold-bright" />
                {isLoading ? "Choosing…" : "Choose for me"}
              </Button>

              {/* Recently used */}
              {recentCategories.length > 0 && (
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-2">
                    Recently Used
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {recentCategories.map((rc) => (
                      <button
                        key={rc.name}
                        onClick={() => onSelectCategory(rc.name)}
                        className="group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-sm text-left"
                      >
                        <span className="font-medium text-foreground">{rc.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {rc.timesPlayed === 1 ? "played once" : `played ${rc.timesPlayed}×`}
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => onRemoveRecent(rc.name, e)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-3 h-3" />
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Preset library */}
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-2">
                  Preset Categories
                </p>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search presets…"
                    className="h-10 pl-8 text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {filteredPresets.map((p) => (
                    <button
                      key={p}
                      onClick={() => onSelectCategory(p)}
                      className="text-sm px-3 py-1.5 rounded-lg border border-border bg-secondary hover:border-gold-dim hover:bg-gold-dim/10 transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
