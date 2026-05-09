"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Trash2, UserPlus, X } from "lucide-react";
import { useGame } from "@/lib/game-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageWrapper, SectionHeading } from "@/components/PageWrapper";
import { generateId } from "@/lib/utils";
import type { Team } from "@/lib/types";

const DEFAULT_TEAMS = [
  { name: "Kids", players: [] },
  { name: "Parents", players: [] },
];

export function SetupTeamsScreen() {
  const { dispatch, navigate } = useGame();
  const [teams, setTeams] = useState<Team[]>(
    DEFAULT_TEAMS.map((t) => ({ ...t, id: generateId(), score: 0 })),
  );
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [newPlayerInputs, setNewPlayerInputs] = useState<Record<string, string>>({});

  function addTeam() {
    const newTeam: Team = {
      id: generateId(),
      name: `Team ${teams.length + 1}`,
      players: [],
      score: 0,
    };
    setTeams([...teams, newTeam]);
    setExpandedTeam(newTeam.id);
  }

  function removeTeam(id: string) {
    if (teams.length <= 2) return;
    setTeams(teams.filter((t) => t.id !== id));
    if (expandedTeam === id) setExpandedTeam(null);
  }

  function updateTeamName(id: string, name: string) {
    setTeams(teams.map((t) => (t.id === id ? { ...t, name } : t)));
  }

  function addPlayer(teamId: string) {
    const input = newPlayerInputs[teamId]?.trim();
    if (!input) return;
    setTeams(
      teams.map((t) =>
        t.id === teamId ? { ...t, players: [...t.players, input] } : t,
      ),
    );
    setNewPlayerInputs({ ...newPlayerInputs, [teamId]: "" });
  }

  function removePlayer(teamId: string, playerIndex: number) {
    setTeams(
      teams.map((t) =>
        t.id === teamId
          ? { ...t, players: t.players.filter((_, i) => i !== playerIndex) }
          : t,
      ),
    );
  }

  function handleContinue() {
    const cleanedTeams = teams
      .map((t) => ({ ...t, name: t.name.trim() || `Team ${t.id.slice(0, 4)}` }))
      .filter((t) => t.name.length > 0);

    dispatch({ type: "SET_TEAMS", teams: cleanedTeams });
    navigate("setup-categories");
  }

  const canContinue = teams.length >= 2 && teams.every((t) => t.name.trim().length > 0);

  return (
    <PageWrapper>
      <button
        onClick={() => navigate("setup-mode")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <SectionHeading
        label="Step 2 of 4"
        title="Set up your teams"
        subtitle="Name your teams and optionally add player names."
      />

      <div className="flex flex-col gap-3 mb-6">
        <AnimatePresence>
          {teams.map((team, index) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12, height: 0 }}
              transition={{ duration: 0.25 }}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              {/* Team header */}
              <div className="flex items-center gap-3 p-4">
                <span className="w-7 h-7 rounded-full bg-gold-bright/10 border border-gold-bright/20 text-gold-bright text-xs font-bold flex items-center justify-center shrink-0">
                  {index + 1}
                </span>
                <Input
                  value={team.name}
                  onChange={(e) => updateTeamName(team.id, e.target.value)}
                  placeholder="Team name"
                  className="flex-1 bg-transparent border-0 shadow-none text-base font-semibold px-0 focus-visible:ring-0 h-auto"
                />
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      setExpandedTeam(expandedTeam === team.id ? null : team.id)
                    }
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-gold-bright transition-colors px-2 py-1 rounded-lg hover:bg-gold-bright/5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Players
                  </button>
                  {teams.length > 2 && (
                    <button
                      onClick={() => removeTeam(team.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Player list (expandable) */}
              <AnimatePresence>
                {expandedTeam === team.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-0 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-2 pt-3">
                        Players (optional)
                      </p>

                      {team.players.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {team.players.map((player, pi) => (
                            <span
                              key={pi}
                              className="flex items-center gap-1.5 text-sm px-3 py-1 rounded-full bg-secondary text-secondary-foreground"
                            >
                              {player}
                              <button
                                onClick={() => removePlayer(team.id, pi)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Input
                          value={newPlayerInputs[team.id] ?? ""}
                          onChange={(e) =>
                            setNewPlayerInputs({
                              ...newPlayerInputs,
                              [team.id]: e.target.value,
                            })
                          }
                          onKeyDown={(e) => e.key === "Enter" && addPlayer(team.id)}
                          placeholder="Add player name"
                          className="flex-1 h-9 text-sm"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => addPlayer(team.id)}
                          className="h-9 px-3"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {teams.length < 6 && (
        <button
          onClick={addTeam}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:border-gold-dim hover:text-gold-bright transition-colors text-sm mb-8"
        >
          <Plus className="w-4 h-4" />
          Add another team
        </button>
      )}

      <Button
        size="lg"
        className="w-full h-14 text-base font-semibold"
        onClick={handleContinue}
        disabled={!canContinue}
      >
        Continue to Categories
      </Button>
    </PageWrapper>
  );
}
