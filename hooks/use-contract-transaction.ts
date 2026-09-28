"use client";

import { useEffect, useRef } from "react";
import { useWaitForTransactionReceipt } from "wagmi";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";

interface UseContractTransactionOptions {
  /** Runs once per transaction hash after its receipt is confirmed. */
  onSuccess?: () => void;
  /** Runs once per write error, such as a wallet rejection. */
  onWriteError?: (error: Error) => void;
  /** Runs once per failed receipt. */
  onReceiptError?: (error: Error) => void;
}

/**
 * Write + receipt lifecycle for a single contract transaction.
 * Callbacks may change identity between renders without re-firing.
 * `writeAsync` is the same chain-aware write used when the caller must await the hash.
 */
export function useContractTransaction({
  onSuccess,
  onWriteError,
  onReceiptError,
}: UseContractTransactionOptions = {}) {
  const {
    writeContract,
    writeContractAsync,
    data: hash,
    isPending,
    error: writeError,
    reset,
  } = useChainWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const onSuccessRef = useRef(onSuccess);
  const onWriteErrorRef = useRef(onWriteError);
  const onReceiptErrorRef = useRef(onReceiptError);
  const firedSuccessHash = useRef<typeof hash>(undefined);
  const firedWriteError = useRef<unknown>(undefined);
  const firedReceiptError = useRef<unknown>(undefined);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onWriteErrorRef.current = onWriteError;
    onReceiptErrorRef.current = onReceiptError;
  });

  useEffect(() => {
    if (!receipt.isSuccess || !hash) return;
    if (firedSuccessHash.current === hash) return;
    firedSuccessHash.current = hash;
    onSuccessRef.current?.();
  }, [receipt.isSuccess, hash]);

  useEffect(() => {
    if (!writeError) return;
    if (firedWriteError.current === writeError) return;
    firedWriteError.current = writeError;
    onWriteErrorRef.current?.(writeError);
  }, [writeError]);

  useEffect(() => {
    const receiptError = receipt.error;
    if (!receiptError) return;
    if (firedReceiptError.current === receiptError) return;
    firedReceiptError.current = receiptError;
    onReceiptErrorRef.current?.(receiptError);
  }, [receipt.error]);

  return {
    write: writeContract,
    writeAsync: writeContractAsync,
    reset,
    hash,
    error: writeError ?? receipt.error,
    writeError,
    receiptError: receipt.error,
    isPending,
    isConfirming: receipt.isLoading,
    isSuccess: receipt.isSuccess,
    isLoading: isPending || receipt.isLoading,
    receipt,
  };
}
