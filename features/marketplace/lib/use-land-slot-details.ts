"use client";

import { useChain, useChainAddresses } from "@/components/chain-provider";
import {
  GET_SLOTS_ABI,
  ITEM_MAP_LOOKUP_ABI,
  parseGetSlotsForItems,
  type LandSlotDetails,
  type LocatedLandSlot,
} from "@/features/marketplace/lib/marketplace";
import { useEffect, useMemo, useState } from "react";
import { usePublicClient } from "wagmi";

const SLOT_BATCH_SIZE = 100;

function readMapPosition(result: unknown): { x: number; y: number } | null {
  if (Array.isArray(result)) {
    return { x: Number(result[0] ?? 0), y: Number(result[1] ?? 0) };
  }
  if (result && typeof result === "object" && "x" in result && "y" in result) {
    const position = result as { x: unknown; y: unknown };
    return { x: Number(position.x), y: Number(position.y) };
  }
  return null;
}

/** Loads city, coordinates, building, and rarity for land-slot inventory items. */
export function useLandSlotDetails(itemIds: readonly number[]): ReadonlyMap<number, LandSlotDetails> {
  const addresses = useChainAddresses();
  const { chainConfig } = useChain();
  const publicClient = usePublicClient({ chainId: chainConfig.wagmiChainId });
  const [details, setDetails] = useState<ReadonlyMap<number, LandSlotDetails>>(() => new Map());

  const key = useMemo(() => {
    const unique = [...new Set(itemIds.filter((id) => Number.isFinite(id) && id > 0))];
    unique.sort((a, b) => a - b);
    return unique.join(",");
  }, [itemIds]);

  useEffect(() => {
    if (!key || !publicClient || !addresses.inventory || !addresses.map) {
      setDetails(new Map());
      return;
    }

    const ids = key.split(",").map(Number);
    let cancelled = false;

    void (async () => {
      try {
        const positions = await publicClient.multicall({
          allowFailure: true,
          contracts: ids.flatMap((id) => [
            {
              address: addresses.inventory,
              abi: ITEM_MAP_LOOKUP_ABI,
              functionName: "itemCity" as const,
              args: [BigInt(id)] as const,
            },
            {
              address: addresses.inventory,
              abi: ITEM_MAP_LOOKUP_ABI,
              functionName: "itemMapPosition" as const,
              args: [BigInt(id)] as const,
            },
          ]),
        });

        const located: LocatedLandSlot[] = [];
        ids.forEach((itemId, index) => {
          const city = positions[index * 2];
          const position = positions[index * 2 + 1];
          if (!city || city.status !== "success" || !position || position.status !== "success") return;
          const coords = readMapPosition(position.result);
          if (!coords) return;
          located.push({
            itemId,
            cityId: Number(city.result),
            x: coords.x,
            y: coords.y,
          });
        });

        const detailsByItem = new Map<number, LandSlotDetails>();
        for (let start = 0; start < located.length; start += SLOT_BATCH_SIZE) {
          const batch = located.slice(start, start + SLOT_BATCH_SIZE);
          const raw = await publicClient.readContract({
            address: addresses.map,
            abi: GET_SLOTS_ABI,
            functionName: "getSlots",
            args: [
              batch.map((plot) => plot.cityId),
              batch.map((plot) => plot.x),
              batch.map((plot) => plot.y),
            ],
          });
          for (const [itemId, slot] of parseGetSlotsForItems(batch, raw)) {
            detailsByItem.set(itemId, slot);
          }
        }

        if (!cancelled) setDetails(detailsByItem);
      } catch (error) {
        console.error("Failed to load land slot details:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key, publicClient, addresses.inventory, addresses.map]);

  return details;
}
