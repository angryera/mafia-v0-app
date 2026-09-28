"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { usePublicClient } from "wagmi";
import { useChain, useChainAddresses } from "@/components/chain-provider";
import {
  bankLogsHasOlderPage,
  formatBankLogsPageLabel,
  getBankLogAddresses,
  getBankLogsPageRange,
  parseBankLogs,
  type BankLogEntry,
} from "@/features/families/lib/family-bank";
import { FAMILY_GAME_CASH_BANK } from "@/lib/contract";
import { useMafiaUtilsScript } from "@/hooks/use-mafia-utils-script";

/**
 * Paged, newest-first family bank logs plus display names for the addresses
 * they reference. Intended to mount only while the log view is visible.
 */
export function useFamilyBankLogs(
  familyId: number,
  rosterNameByAddr: Readonly<Record<string, string>>,
) {
  const { chainConfig } = useChain();
  const { familyGameCashBank } = useChainAddresses();
  const publicClient = usePublicClient();
  const profileScriptStatus = useMafiaUtilsScript("MafiaProfile");

  const [logs, setLogs] = useState<BankLogEntry[]>([]);
  const [total, setTotal] = useState(BigInt(0));
  const [pageIndex, setPageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
  const requestedNamesRef = useRef(new Set<string>());
  const latestRequestRef = useRef(0);

  const loadPage = useCallback(
    async (index: number) => {
      if (!publicClient) return;
      const requestId = ++latestRequestRef.current;
      const isStale = () => requestId !== latestRequestRef.current;
      try {
        const count = (await publicClient.readContract({
          address: familyGameCashBank,
          abi: FAMILY_GAME_CASH_BANK,
          functionName: "getFamilyLogsCount",
          args: [BigInt(familyId)],
        })) as bigint;
        const range = getBankLogsPageRange(count, index);
        const raw = range
          ? await publicClient.readContract({
              address: familyGameCashBank,
              abi: FAMILY_GAME_CASH_BANK,
              functionName: "getFamilyLogs",
              args: [BigInt(familyId), range.start, range.endExclusive - range.start],
            })
          : [];
        if (isStale()) return;
        setTotal(count);
        setLogs(parseBankLogs(raw).reverse());
      } catch (err) {
        if (isStale()) return;
        console.error("Family bank logs fetch failed", err);
        toast.error("Could not load bank logs");
        setLogs([]);
      } finally {
        if (!isStale()) setIsLoading(false);
      }
    },
    [publicClient, familyGameCashBank, familyId],
  );

  useEffect(() => {
    void loadPage(pageIndex);
  }, [pageIndex, loadPage]);

  const changePage = (next: (index: number) => number) => {
    setIsLoading(true);
    setPageIndex(next);
  };

  useEffect(() => {
    const mafiaProfile = window.MafiaProfile;
    if (profileScriptStatus !== "ready" || !mafiaProfile) return;

    const requested = requestedNamesRef.current;
    const missing = getBankLogAddresses(logs).filter(
      (key) => !rosterNameByAddr[key] && !requested.has(key),
    );
    if (missing.length === 0) return;
    missing.forEach((key) => requested.add(key));

    let cancelled = false;
    let settled = false;
    (async () => {
      try {
        const users = await mafiaProfile.getUsersInfo({ chain: chainConfig.id });
        if (cancelled) return;
        const wanted = new Set(missing);
        const found: Record<string, string> = {};
        for (const user of users as { user?: string; name?: string }[]) {
          const key = user.user?.toLowerCase();
          const name = user.name?.trim();
          if (key && name && wanted.has(key)) found[key] = name;
        }
        setProfileNames((prev) => ({ ...prev, ...found }));
      } catch (err) {
        console.error("Family bank log names failed", err);
      } finally {
        settled = true;
      }
    })();

    return () => {
      cancelled = true;
      if (!settled) missing.forEach((key) => requested.delete(key));
    };
  }, [logs, rosterNameByAddr, profileScriptStatus, chainConfig.id]);

  const nameByAddr = useMemo(
    () => ({ ...profileNames, ...rosterNameByAddr }),
    [profileNames, rosterNameByAddr],
  );

  return {
    logs,
    nameByAddr,
    isLoading: isLoading && !!publicClient,
    pageLabel: formatBankLogsPageLabel(total, pageIndex),
    hasNewer: pageIndex > 0,
    hasOlder: bankLogsHasOlderPage(total, pageIndex),
    showNewer: () => changePage((index) => Math.max(0, index - 1)),
    showOlder: () => changePage((index) => index + 1),
    refresh: () => {
      setIsLoading(true);
      void loadPage(pageIndex);
    },
  };
}
