"use client";

import { useEffect, useRef } from "react";
import { useWaitForTransactionReceipt } from "wagmi";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";

interface UseContractTransactionOptions {
  /** Runs once per transaction hash after its receipt is confirmed. */
  onSuccess?: () => void;
}

/**
 * Write + receipt lifecycle for a single contract transaction.
 * `onSuccess` may change identity between renders without re-firing.
 */
export function useContractTransaction({ onSuccess }: UseContractTransactionOptions = {}) {
  const { writeContract, data: hash, isPending, error, reset } = useChainWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });

  useEffect(() => {
    if (receipt.isSuccess && hash) onSuccessRef.current?.();
  }, [receipt.isSuccess, hash]);

  return {
    write: writeContract,
    reset,
    hash,
    error: error ?? receipt.error,
    isPending,
    isConfirming: receipt.isLoading,
    isSuccess: receipt.isSuccess,
    isLoading: isPending || receipt.isLoading,
  };
}
