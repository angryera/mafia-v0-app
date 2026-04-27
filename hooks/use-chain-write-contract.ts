"use client";

import { useWriteContract, usePublicClient, useAccount } from "wagmi";
import { useChain } from "@/components/chain-provider";
import { useCallback, useMemo } from "react";
import type { Abi, EncodeFunctionDataParameters } from "viem";
import { encodeFunctionData } from "viem";

// Function names that require 5x gas multiplier
const HIGH_GAS_FUNCTIONS = ["buyBooze", "sellBooze", "buyNarcs", "sellNarcs"];

/**
 * Wrapper around wagmi's useWriteContract that automatically injects
 * the active chain's chainId into every writeContract call.
 * This ensures the wallet is prompted to switch to the correct network
 * before sending the transaction.
 * 
 * For certain functions (buyBooze, sellBooze, buyNarcs, sellNarcs),
 * it estimates gas and applies a 5x multiplier to avoid out-of-gas errors.
 */
export function useChainWriteContract() {
  const { chainConfig } = useChain();
  const result = useWriteContract();
  const publicClient = usePublicClient();
  const { address } = useAccount();

  const originalWriteContract = result.writeContract;
  const originalWriteContractAsync = result.writeContractAsync;

  const writeContract = useCallback(
    (args: Parameters<typeof originalWriteContract>[0]) => {
      originalWriteContract({
        ...args,
        chainId: chainConfig.wagmiChainId,
      } as Parameters<typeof originalWriteContract>[0]);
    },
    [originalWriteContract, chainConfig.wagmiChainId],
  );

  const writeContractAsync = useCallback(
    async (args: Parameters<typeof originalWriteContractAsync>[0]) => {
      const functionName = args.functionName as string;

      // For high-gas functions, estimate gas and multiply by 5
      if (HIGH_GAS_FUNCTIONS.includes(functionName) && publicClient && address) {
        try {
          // Encode the function call data
          const data = encodeFunctionData({
            abi: args.abi,
            functionName: args.functionName,
            args: args.args,
          } as EncodeFunctionDataParameters);

          // Estimate gas
          const gasEstimate = await publicClient.estimateGas({
            account: address,
            to: args.address,
            data,
          });

          // Apply 5x multiplier
          const gasLimit = gasEstimate * BigInt(5);

          return originalWriteContractAsync({
            ...args,
            chainId: chainConfig.wagmiChainId,
            gas: gasLimit,
          } as Parameters<typeof originalWriteContractAsync>[0]);
        } catch (error) {
          console.error("Gas estimation failed, proceeding without custom gas limit:", error);
          // Fall through to normal call if estimation fails
        }
      }

      return originalWriteContractAsync({
        ...args,
        chainId: chainConfig.wagmiChainId,
      } as Parameters<typeof originalWriteContractAsync>[0]);
    },
    [originalWriteContractAsync, chainConfig.wagmiChainId, publicClient, address],
  );

  return useMemo(
    () => ({
      ...result,
      writeContract,
      writeContractAsync,
    }),
    [result, writeContract, writeContractAsync],
  );
}
