"use client";

import { useCallback, useEffect, useState } from "react";
import { useChain } from "@/components/chain-provider";
import type { Family } from "@/features/families/types";
import { useMafiaUtilsScript } from "@/hooks/use-mafia-utils-script";

const INITIAL_PROGRESS = "Loading family data...";

/** Loads a single family (with player details) through `window.MafiaFamily`. */
export function useFamilyRoster(familyId: number) {
  const { chainConfig } = useChain();
  const scriptStatus = useMafiaUtilsScript("MafiaFamily");
  const [family, setFamily] = useState<Family | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(INITIAL_PROGRESS);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const load = useCallback(
    async (mafiaFamily: MafiaFamilyApi) => {
      try {
        const families: Family[] = await mafiaFamily.getFamiliesWithPlayers({
          chain: chainConfig.id,
          onProgress: (info) => {
            setLoadProgress(
              info.step === "families"
                ? `Loading families... ${info.fetched}`
                : `Loading player info... ${info.fetched}`,
            );
          },
        });

        const found = families.find((f) => f.familyId === familyId);
        if (found) {
          setFamily(found);
          setFetchError(null);
        } else {
          setFetchError(`Family #${familyId} not found`);
        }
      } catch (err) {
        console.error("Error fetching family:", err);
        setFetchError(err instanceof Error ? err.message : "Failed to fetch family data");
      } finally {
        setLoadProgress("");
        setIsLoading(false);
      }
    },
    [chainConfig.id, familyId],
  );

  useEffect(() => {
    const mafiaFamily = window.MafiaFamily;
    if (scriptStatus === "ready" && mafiaFamily) void load(mafiaFamily);
  }, [scriptStatus, load]);

  const refetch = useCallback(() => {
    const mafiaFamily = window.MafiaFamily;
    if (!mafiaFamily) {
      setFetchError("MafiaFamily not available");
      return;
    }
    setIsLoading(true);
    setFetchError(null);
    setLoadProgress(INITIAL_PROGRESS);
    void load(mafiaFamily);
  }, [load]);

  const error =
    fetchError ?? (scriptStatus === "error" ? "Failed to load MafiaFamily script" : null);

  return { family, isLoading, loadProgress, error, refetch };
}
