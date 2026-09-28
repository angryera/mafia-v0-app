"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import type { ContractFunctionParameters } from "viem";
import { useChainAddresses } from "@/components/chain-provider";
import {
  BULLET_FACTORY_ABI,
  CAR_CRUSHER_ABI,
  CONTRACT_ABI,
  HOSPITAL_CONTRACT_ABI,
  JAIL_CONTRACT_ABI,
  KILLSKILL_CONTRACT_ABI,
  NICKCAR_CONTRACT_ABI,
  SHOP_CONTRACT_ABI,
  TRAVEL_CONTRACT_ABI,
} from "@/lib/contract";
import type { Tab } from "@/lib/navigation";

export interface Cooldown {
  seconds: number;
  label: string;
}

export type CooldownMap = Partial<Record<Tab, Cooldown>>;

function formatCooldown(seconds: number): string {
  if (seconds <= 0) return "";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  const clock = `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;

  return hours > 0 ? `${hours}:${clock}` : clock;
}

function secondsUntil(timestamp: bigint | number | undefined): number {
  if (timestamp === undefined) return 0;
  return Math.max(0, Math.ceil(Number(timestamp) - Date.now() / 1000));
}

function addCooldown(
  cooldowns: CooldownMap,
  tab: Tab,
  timestamp: bigint | number | undefined,
): void {
  const seconds = secondsUntil(timestamp);
  if (seconds > 0) {
    cooldowns[tab] = { seconds, label: formatCooldown(seconds) };
  }
}

/** Aggregate the action cooldowns displayed by desktop and mobile navigation. */
export function useCooldowns(): CooldownMap {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const enabled = isConnected && Boolean(address);

  const contracts = useMemo<readonly ContractFunctionParameters[]>(() => {
    if (!address) return [];

    return [
      { address: addresses.crime, abi: CONTRACT_ABI, functionName: "nextCrimeTime", args: [address] },
      { address: addresses.nickcar, abi: NICKCAR_CONTRACT_ABI, functionName: "nextNickTime", args: [address] },
      { address: addresses.travel, abi: TRAVEL_CONTRACT_ABI, functionName: "userTravelInfo", args: [address] },
      { address: addresses.jail, abi: JAIL_CONTRACT_ABI, functionName: "jailedUntil", args: [address] },
      { address: addresses.killskill, abi: KILLSKILL_CONTRACT_ABI, functionName: "nextTrainTime", args: [address] },
      { address: addresses.bulletFactory, abi: BULLET_FACTORY_ABI, functionName: "nextBuyTime", args: [address] },
      { address: addresses.hospital, abi: HOSPITAL_CONTRACT_ABI, functionName: "nextBuyTime", args: [address] },
      { address: addresses.shop, abi: SHOP_CONTRACT_ABI, functionName: "nextBuyTime", args: [address] },
      { address: addresses.carCrusher, abi: CAR_CRUSHER_ABI, functionName: "nextCrushTime", args: [address] },
    ] as const;
  }, [address, addresses]);

  const { data: results } = useReadContracts({
    contracts,
    query: { enabled, refetchInterval: 10_000 },
  });

  const [cooldowns, setCooldowns] = useState<CooldownMap>({});

  useEffect(() => {
    if (!results || !enabled) {
      setCooldowns({});
      return;
    }

    const tick = () => {
      const next: CooldownMap = {};

      if (results[0]?.status === "success") addCooldown(next, "crime", results[0].result as bigint);
      if (results[1]?.status === "success") addCooldown(next, "nickcar", results[1].result as bigint);

      if (results[2]?.status === "success") {
        const travel = results[2].result as { travelUntil: bigint } | undefined;
        addCooldown(next, "travel", travel?.travelUntil);
      }

      if (results[3]?.status === "success") addCooldown(next, "jail", results[3].result as bigint);
      if (results[4]?.status === "success") addCooldown(next, "killskill", results[4].result as bigint);
      if (results[5]?.status === "success") addCooldown(next, "biz-bulletfactory", results[5].result as bigint);
      if (results[6]?.status === "success") addCooldown(next, "biz-hospital", results[6].result as bigint);
      if (results[7]?.status === "success") addCooldown(next, "biz-shop", results[7].result as bigint);
      if (results[8]?.status === "success") addCooldown(next, "biz-car-crusher", results[8].result as bigint);

      setCooldowns(next);
    };

    tick();
    const interval = window.setInterval(tick, 1_000);
    return () => window.clearInterval(interval);
  }, [enabled, results]);

  return cooldowns;
}
