"use client";

import { useCallback, useMemo } from "react";
import { zeroAddress } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { useAuth } from "@/components/auth-provider";
import { useChainAddresses } from "@/components/chain-provider";
import {
  BANK_REFETCH_MS,
  getPromotionRewardRankIds,
  parsePromotionRewards,
} from "@/features/families/lib/family-bank";
import { FAMILY_GAME_CASH_BANK, INGAME_CURRENCY_ABI } from "@/lib/contract";

function toOptionalBigInt(value: unknown): bigint | undefined {
  return value != null ? BigInt(value as bigint) : undefined;
}

/** Contract reads backing the family game-cash bank UI. */
export function useFamilyBank(familyId: number) {
  const addresses = useChainAddresses();
  const { address, isConnected } = useAccount();
  const { authData } = useAuth();

  const bankAddress = addresses.familyGameCashBank;
  const bankConfigured = bankAddress !== zeroAddress;
  const familyReadsEnabled = bankConfigured && familyId > 0;
  const familyArgs = [BigInt(familyId)] as const;

  const { data: balanceRaw, refetch: refetchBalance } = useReadContract({
    address: bankAddress,
    abi: FAMILY_GAME_CASH_BANK,
    functionName: "familyBalance",
    args: familyArgs,
    query: { enabled: familyReadsEnabled, refetchInterval: BANK_REFETCH_MS },
  });

  const { data: nativeBalanceRaw, refetch: refetchNativeBalance } = useReadContract({
    address: bankAddress,
    abi: FAMILY_GAME_CASH_BANK,
    functionName: "familyNativeBalance",
    args: familyArgs,
    query: { enabled: familyReadsEnabled, refetchInterval: BANK_REFETCH_MS },
  });

  const { data: maxRankRaw } = useReadContract({
    address: bankAddress,
    abi: FAMILY_GAME_CASH_BANK,
    functionName: "MAX_RANK",
    query: { enabled: bankConfigured },
  });

  const { data: promotionRewardsRaw, refetch: refetchPromotionRewards } = useReadContract({
    address: bankAddress,
    abi: FAMILY_GAME_CASH_BANK,
    functionName: "getPromotionRewards",
    args: familyArgs,
    query: { enabled: familyReadsEnabled, refetchInterval: BANK_REFETCH_MS },
  });

  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: addresses.ingameCurrency,
    abi: INGAME_CURRENCY_ABI,
    functionName: "allowances",
    args: address && bankConfigured ? [address, bankAddress] : undefined,
    query: {
      enabled: !!address && bankConfigured && isConnected,
      refetchInterval: BANK_REFETCH_MS,
    },
  });

  const { data: cashBalanceRaw, refetch: refetchCashBalance } = useReadContract({
    address: addresses.ingameCurrency,
    abi: INGAME_CURRENCY_ABI,
    functionName: "balanceOfWithSignMsg",
    args:
      authData && address && bankConfigured
        ? [address, authData.message, authData.signature]
        : undefined,
    query: { enabled: !!authData && !!address && bankConfigured && isConnected },
  });

  /** Index 0 is a placeholder so the contract's rank-1 reward sits at index 1. */
  const promotionRewardsWei = useMemo(
    () => [BigInt(0), ...parsePromotionRewards(promotionRewardsRaw)],
    [promotionRewardsRaw],
  );

  const promotionRewardRankIds = useMemo(
    () => getPromotionRewardRankIds(maxRankRaw != null ? Number(maxRankRaw) : undefined),
    [maxRankRaw],
  );

  const refetchBalances = useCallback(async () => {
    await Promise.all([
      refetchBalance(),
      refetchNativeBalance(),
      refetchAllowance(),
      refetchCashBalance(),
    ]);
  }, [refetchBalance, refetchNativeBalance, refetchAllowance, refetchCashBalance]);

  const refetchRewards = useCallback(async () => {
    await Promise.all([refetchPromotionRewards(), refetchBalance()]);
  }, [refetchPromotionRewards, refetchBalance]);

  return {
    bankAddress,
    bankConfigured,
    balanceWei: toOptionalBigInt(balanceRaw),
    nativeBalanceWei: toOptionalBigInt(nativeBalanceRaw),
    allowance: toOptionalBigInt(allowanceRaw),
    myCashBalanceWei: toOptionalBigInt(cashBalanceRaw),
    promotionRewardsLoaded: promotionRewardsRaw !== undefined,
    promotionRewardsWei,
    promotionRewardRankIds,
    refetchBalances,
    refetchRewards,
  };
}

export type FamilyBankState = ReturnType<typeof useFamilyBank>;
