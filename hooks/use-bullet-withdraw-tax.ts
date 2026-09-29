"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { BULLET_ABI } from "@/lib/contract";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";

/** `withdrawTax` is parts per 1,000. 50 means a 5% fee. */
export const BULLET_WITHDRAW_TAX_DENOMINATOR = BigInt(1000);

/**
 * Slot written by `setWithdrawTax`. Pulse exposes this as `withdrawTax()`.
 * BNB stores the same value here without a public getter.
 */
const BULLET_WITHDRAW_TAX_SLOT =
  "0x000000000000000000000000000000000000000000000000000000000000006b" as const;

export function useBulletWithdrawTax() {
  const addresses = useChainAddresses();
  const publicClient = usePublicClient();

  const query = useQuery({
    queryKey: ["bullet-withdraw-tax", addresses.bullets, publicClient?.chain?.id],
    enabled: !!publicClient,
    retry: false,
    queryFn: async (): Promise<bigint | null> => {
      if (!publicClient) return null;
      try {
        const tax = await publicClient.readContract({
          address: addresses.bullets,
          abi: BULLET_ABI,
          functionName: "withdrawTax",
        });
        return BigInt(tax as bigint);
      } catch {
        const raw = await publicClient.getStorageAt({
          address: addresses.bullets,
          slot: BULLET_WITHDRAW_TAX_SLOT,
        });
        return raw ? BigInt(raw) : null;
      }
    },
  });

  return { tax: query.data ?? null, isLoading: query.isPending };
}

export function formatBulletPerMillePercent(perMille: bigint): string {
  const whole = perMille / BigInt(10);
  const frac = perMille % BigInt(10);
  if (frac === BigInt(0)) return `${whole.toString()}%`;
  return `${whole.toString()}.${frac.toString()}%`;
}

export function formatBulletWithdrawFee(tax: bigint | null, loading: boolean): string {
  if (loading || tax === null) return "…";
  return formatBulletPerMillePercent(tax);
}

export function formatBulletWithdrawKept(tax: bigint | null, loading: boolean): string {
  if (loading || tax === null) return "…";
  if (tax >= BULLET_WITHDRAW_TAX_DENOMINATOR) return "0%";
  return formatBulletPerMillePercent(BULLET_WITHDRAW_TAX_DENOMINATOR - tax);
}

/** Wallet amount after `withdrawTax`: `amount * (1000 - tax) / 1000`. */
export function applyBulletWithdrawFee(amount: bigint, tax: bigint): bigint {
  if (tax >= BULLET_WITHDRAW_TAX_DENOMINATOR) return BigInt(0);
  return (amount * (BULLET_WITHDRAW_TAX_DENOMINATOR - tax)) / BULLET_WITHDRAW_TAX_DENOMINATOR;
}
