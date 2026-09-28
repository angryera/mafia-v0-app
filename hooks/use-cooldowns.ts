"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import type { ContractFunctionParameters } from "viem";
import { useAuth } from "@/components/auth-provider";
import { useChainAddresses } from "@/components/chain-provider";
import {
  BANK_TRANSFER_ABI,
  BANK_TRANSFER_COOLDOWN_SECONDS,
  BULLET_FACTORY_ABI,
  CAR_CRUSHER_ABI,
  CONTRACT_ABI,
  EQUIPMENT_ABI,
  HOSPITAL_CONTRACT_ABI,
  JAIL_CONTRACT_ABI,
  KILLSKILL_CONTRACT_ABI,
  NICKCAR_CONTRACT_ABI,
  OC_LOBBY_ABI,
  RACE_LOBBY_ABI,
  RANK_STAKE_ABI,
  SAFEHOUSE_ABI,
  SHOP_CONTRACT_ABI,
  SMUGGLE_MARKET_ABI,
  TRAVEL_CONTRACT_ABI,
} from "@/lib/contract";
import { EQUIPMENT_CITY_IDS, REEQUIP_COOLDOWN_SECONDS } from "@/lib/equipmentContract";
import type { Tab } from "@/lib/navigation";

export interface Cooldown {
  seconds: number;
  label: string;
  title?: string;
}

export type CooldownMap = Partial<Record<Tab, Cooldown>>;

type CooldownCall = {
  key: string;
  call: ContractFunctionParameters;
};

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

function readField(
  result: unknown,
  name: string,
  index: number,
): bigint | number | undefined {
  if (result == null) return undefined;
  if (typeof result === "bigint" || typeof result === "number") return result;
  if (Array.isArray(result)) {
    const value = result[index];
    return typeof value === "bigint" || typeof value === "number" ? value : undefined;
  }
  if (typeof result === "object") {
    const record = result as Record<string, unknown>;
    const named = record[name];
    if (typeof named === "bigint" || typeof named === "number") return named;
    const indexed = record[index];
    if (typeof indexed === "bigint" || typeof indexed === "number") return indexed;
  }
  return undefined;
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

function resultAt(
  results: readonly { status: string; result?: unknown }[] | undefined,
  calls: readonly CooldownCall[],
  key: string,
): unknown {
  const index = calls.findIndex((call) => call.key === key);
  if (index < 0 || !results || results[index]?.status !== "success") return undefined;
  return results[index].result;
}

/** Aggregate the action cooldowns displayed by desktop and mobile navigation. */
export function useCooldowns(): CooldownMap {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const { authData } = useAuth();
  const enabled = isConnected && Boolean(address);

  const calls = useMemo<readonly CooldownCall[]>(() => {
    if (!address) return [];

    const next: CooldownCall[] = [
      { key: "crime", call: { address: addresses.crime, abi: CONTRACT_ABI, functionName: "nextCrimeTime", args: [address] } },
      { key: "nickcar", call: { address: addresses.nickcar, abi: NICKCAR_CONTRACT_ABI, functionName: "nextNickTime", args: [address] } },
      { key: "travel", call: { address: addresses.travel, abi: TRAVEL_CONTRACT_ABI, functionName: "userTravelInfo", args: [address] } },
      { key: "jail", call: { address: addresses.jail, abi: JAIL_CONTRACT_ABI, functionName: "jailedUntil", args: [address] } },
      { key: "killskill", call: { address: addresses.killskill, abi: KILLSKILL_CONTRACT_ABI, functionName: "nextTrainTime", args: [address] } },
      { key: "bullet", call: { address: addresses.bulletFactory, abi: BULLET_FACTORY_ABI, functionName: "nextBuyTime", args: [address] } },
      { key: "hospital", call: { address: addresses.hospital, abi: HOSPITAL_CONTRACT_ABI, functionName: "nextBuyTime", args: [address] } },
      { key: "shop", call: { address: addresses.shop, abi: SHOP_CONTRACT_ABI, functionName: "nextBuyTime", args: [address] } },
      { key: "crusher", call: { address: addresses.carCrusher, abi: CAR_CRUSHER_ABI, functionName: "nextCrushTime", args: [address] } },
      { key: "oc", call: { address: addresses.ocLobby, abi: OC_LOBBY_ABI, functionName: "nextLobbyTime", args: [address] } },
      { key: "race", call: { address: addresses.raceLobby, abi: RACE_LOBBY_ABI, functionName: "nextRaceTime", args: [address] } },
      { key: "booze", call: { address: addresses.smuggleMarket, abi: SMUGGLE_MARKET_ABI, functionName: "nextBoozeTime", args: [address] } },
      { key: "narcs", call: { address: addresses.smuggleMarket, abi: SMUGGLE_MARKET_ABI, functionName: "nextNarcsTime", args: [address] } },
      { key: "bank", call: { address: addresses.ingameCurrency, abi: BANK_TRANSFER_ABI, functionName: "lastTransferTime", args: [address] } },
      { key: "rank-info", call: { address: addresses.rankStake, abi: RANK_STAKE_ABI, functionName: "getUserStakingInfo", args: [address] } },
      { key: "rank-cd", call: { address: addresses.rankStake, abi: RANK_STAKE_ABI, functionName: "unstakeCooldown" } },
    ];

    if (authData) {
      next.push({
        key: "safehouse",
        call: {
          address: addresses.safehouse,
          abi: SAFEHOUSE_ABI,
          functionName: "getUserInfo",
          args: [address, authData.message, authData.signature],
        },
      });
    }

    return next;
  }, [address, addresses, authData]);

  const { data: results } = useReadContracts({
    contracts: calls.map((entry) => entry.call),
    query: { enabled: enabled && calls.length > 0, staleTime: 0, refetchOnMount: "always", refetchInterval: 10_000 },
  });

  const equipmentCalls = useMemo<readonly ContractFunctionParameters[]>(() => {
    if (!address || !authData) return [];
    return EQUIPMENT_CITY_IDS.map((cityId) => ({
      address: addresses.equipment,
      abi: EQUIPMENT_ABI,
      functionName: "getEquipmentInfo",
      args: [address, cityId, authData.message, authData.signature],
    }));
  }, [address, addresses.equipment, authData]);

  const { data: equipmentResults } = useReadContracts({
    contracts: equipmentCalls,
    query: {
      enabled: enabled && equipmentCalls.length > 0,
      staleTime: 0,
      refetchOnMount: "always",
      refetchInterval: 10_000,
    },
  });

  const [cooldowns, setCooldowns] = useState<CooldownMap>({});

  useEffect(() => {
    if (!results || !enabled) {
      setCooldowns({});
      return;
    }

    const tick = () => {
      const next: CooldownMap = {};
      const read = (key: string) => resultAt(results, calls, key);

      addCooldown(next, "crime", readField(read("crime"), "nextCrimeTime", 0));
      addCooldown(next, "nickcar", readField(read("nickcar"), "nextNickTime", 0));
      addCooldown(next, "travel", readField(read("travel"), "travelUntil", 1));
      addCooldown(next, "jail", readField(read("jail"), "jailedUntil", 0));
      addCooldown(next, "killskill", readField(read("killskill"), "nextTrainTime", 0));
      addCooldown(next, "biz-bulletfactory", readField(read("bullet"), "nextBuyTime", 0));
      addCooldown(next, "biz-hospital", readField(read("hospital"), "nextBuyTime", 0));
      addCooldown(next, "biz-shop", readField(read("shop"), "nextBuyTime", 0));
      addCooldown(next, "biz-car-crusher", readField(read("crusher"), "nextCrushTime", 0));
      addCooldown(next, "organized-crime", readField(read("oc"), "nextLobbyTime", 0));
      addCooldown(next, "racing", readField(read("race"), "nextRaceTime", 0));
      addCooldown(next, "biz-booze", readField(read("booze"), "nextBoozeTime", 0));
      addCooldown(next, "biz-narcs", readField(read("narcs"), "nextNarcsTime", 0));

      const lastTransfer = readField(read("bank"), "lastTransferTime", 0);
      if (lastTransfer !== undefined && Number(lastTransfer) > 0) {
        addCooldown(next, "biz-bank", Number(lastTransfer) + BANK_TRANSFER_COOLDOWN_SECONDS);
      }

      const lastUnstake = readField(read("rank-info"), "lastUnstakeTime", 3);
      const unstakeCooldown = readField(read("rank-cd"), "unstakeCooldown", 0);
      if (
        lastUnstake !== undefined &&
        Number(lastUnstake) > 0 &&
        unstakeCooldown !== undefined
      ) {
        addCooldown(
          next,
          "rank-activation",
          Number(lastUnstake) + Number(unstakeCooldown),
        );
      }

      addCooldown(
        next,
        "biz-safehouse",
        readField(read("safehouse"), "nextSafehouseTime", 2),
      );

      let latestEquip = 0;
      for (const row of equipmentResults ?? []) {
        if (row.status !== "success") continue;
        const equippedAt = readField(row.result, "equippedAt", 2);
        if (equippedAt === undefined || Number(equippedAt) <= 0) continue;
        latestEquip = Math.max(latestEquip, Number(equippedAt) + REEQUIP_COOLDOWN_SECONDS);
      }
      if (latestEquip > 0) {
        addCooldown(next, "equipment", latestEquip);
        if (next.equipment) {
          next.equipment.title = "Longest city reequip cooldown";
        }
      }

      setCooldowns(next);
    };

    tick();
    const interval = window.setInterval(tick, 1_000);
    return () => window.clearInterval(interval);
  }, [calls, enabled, equipmentResults, results]);

  return cooldowns;
}
