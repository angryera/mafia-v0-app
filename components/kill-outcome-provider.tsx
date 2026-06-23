"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { KillBattlePayload } from "@/lib/killOutcome";

interface KillOutcomeContextValue {
  battle: KillBattlePayload | null;
  setKillBattle: (battle: KillBattlePayload) => void;
  markRewardsClaimed: () => void;
  clearKillBattle: () => void;
}

const KillOutcomeContext = createContext<KillOutcomeContextValue | null>(null);

export function KillOutcomeProvider({ children }: { children: ReactNode }) {
  const [battle, setBattle] = useState<KillBattlePayload | null>(null);

  const setKillBattle = useCallback((payload: KillBattlePayload) => {
    setBattle(payload);
  }, []);

  const markRewardsClaimed = useCallback(() => {
    setBattle((current) =>
      current ? { ...current, claimed: true } : current,
    );
  }, []);

  const clearKillBattle = useCallback(() => {
    setBattle(null);
  }, []);

  const value = useMemo(
    () => ({
      battle,
      setKillBattle,
      markRewardsClaimed,
      clearKillBattle,
    }),
    [battle, setKillBattle, markRewardsClaimed, clearKillBattle],
  );

  return (
    <KillOutcomeContext.Provider value={value}>
      {children}
    </KillOutcomeContext.Provider>
  );
}

export function useKillOutcome() {
  const ctx = useContext(KillOutcomeContext);
  if (!ctx) {
    throw new Error("useKillOutcome must be used within KillOutcomeProvider");
  }
  return ctx;
}
