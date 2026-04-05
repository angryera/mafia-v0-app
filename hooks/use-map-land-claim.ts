"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { toast } from "sonner";
import { useChain, useChainAddresses } from "@/components/chain-provider";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { MAFIA_MAP_ABI, OG_CRATE_ABI } from "@/lib/city-map-contract-abis";

/** ~2 blocks on BSC-style chains; tune if needed. */
const LAND_CLAIM_POLL_MS = 6000;

export type MapLandClaimPhase =
  | "idle"
  | "approving"
  | "requesting"
  | "waiting_vrf"
  | "finishing";

/** `getNonceStatus(user, cityId)` → `[isPending, isFulfilled]`. */
function parseMapNonceStatus(raw: unknown): {
  isPending: boolean;
  isFulfilled: boolean;
} | null {
  if (raw == null) return null;
  if (Array.isArray(raw) && raw.length >= 2) {
    return {
      isPending: Boolean(raw[0]),
      isFulfilled: Boolean(raw[1]),
    };
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if ("0" in o && "1" in o) {
      return {
        isPending: Boolean(o[0]),
        isFulfilled: Boolean(o[1]),
      };
    }
  }
  return null;
}

export function useMapLandClaim({
  cityId,
  hasVacantUserPlots,
  onSuccess,
}: {
  cityId: number;
  hasVacantUserPlots: boolean;
  onSuccess?: () => void;
}) {
  const { address, isConnected } = useAccount();
  const { chainConfig } = useChain();
  const addresses = useChainAddresses();
  const mapAddress = addresses.map;
  const ogCrateAddress = addresses.ogCrate;
  const chainId = chainConfig.wagmiChainId;

  const [phase, setPhase] = useState<MapLandClaimPhase>("idle");
  const finishAttemptedRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    data: statusRaw,
    refetch: refetchLandStatus,
    error: statusError,
  } = useReadContract({
    address: mapAddress,
    abi: MAFIA_MAP_ABI,
    functionName: "getNonceStatus",
    args: address && mapAddress ? [address, cityId] : undefined,
    chainId,
    query: {
      enabled: Boolean(address && mapAddress),
    },
  });

  const status = parseMapNonceStatus(statusRaw);

  useEffect(() => {
    if (status && !status.isPending) {
      finishAttemptedRef.current = false;
    }
  }, [status]);

  const { data: crateApprovedRaw, refetch: refetchCrateApproval } =
    useReadContract({
      address: ogCrateAddress,
      abi: OG_CRATE_ABI,
      functionName: "isApprovedForAll",
      args:
        address && ogCrateAddress && mapAddress
          ? [address, mapAddress]
          : undefined,
      chainId,
      query: {
        enabled: Boolean(address && ogCrateAddress && mapAddress),
      },
    });

  const crateApproved = crateApprovedRaw === true;

  const {
    writeContract: writeApproveCrate,
    data: approveHash,
    isPending: approveWalletPending,
    error: approveWriteError,
    reset: resetApproveWrite,
  } = useChainWriteContract();

  const {
    isLoading: approveConfirming,
    isSuccess: approveSuccess,
    isError: approveReceiptError,
  } = useWaitForTransactionReceipt({ hash: approveHash });

  const {
    writeContract: writeRequestSlot,
    data: requestHash,
    isPending: requestWalletPending,
    error: requestWriteError,
    reset: resetRequestWrite,
  } = useChainWriteContract();

  const {
    isLoading: requestConfirming,
    isSuccess: requestSuccess,
    isError: requestReceiptError,
  } = useWaitForTransactionReceipt({ hash: requestHash });

  const {
    writeContract: writeFinishSlot,
    data: finishHash,
    isPending: finishWalletPending,
    error: finishWriteError,
    reset: resetFinishWrite,
  } = useChainWriteContract();

  const {
    isLoading: finishConfirming,
    isSuccess: finishSuccess,
    isError: finishReceiptError,
  } = useWaitForTransactionReceipt({ hash: finishHash });

  // Wallet rejected or RPC error before tx — reset phase so the button works again.
  useEffect(() => {
    if (!approveWriteError || phase !== "approving") return;
    toast.error("OG Crate approval was cancelled.");
    setPhase("idle");
    resetApproveWrite();
  }, [approveWriteError, phase, resetApproveWrite]);

  useEffect(() => {
    if (!requestWriteError || phase !== "requesting") return;
    toast.error("Land claim request was cancelled.");
    setPhase("idle");
    resetRequestWrite();
  }, [requestWriteError, phase, resetRequestWrite]);

  useEffect(() => {
    if (!finishWriteError || phase !== "finishing") return;
    toast.error("Finish claim was cancelled.");
    finishAttemptedRef.current = false;
    setPhase("waiting_vrf");
    resetFinishWrite();
  }, [finishWriteError, phase, resetFinishWrite]);

  // Submitted tx failed on-chain — same recovery.
  useEffect(() => {
    if (!approveReceiptError || phase !== "approving" || !approveHash) return;
    toast.error("OG Crate approval transaction failed.");
    setPhase("idle");
    resetApproveWrite();
  }, [approveReceiptError, phase, approveHash, resetApproveWrite]);

  useEffect(() => {
    if (!requestReceiptError || phase !== "requesting" || !requestHash) return;
    toast.error("Land claim request transaction failed.");
    setPhase("idle");
    resetRequestWrite();
  }, [requestReceiptError, phase, requestHash, resetRequestWrite]);

  useEffect(() => {
    if (!finishReceiptError || phase !== "finishing" || !finishHash) return;
    toast.error("Finish claim transaction failed.");
    finishAttemptedRef.current = false;
    setPhase("waiting_vrf");
    resetFinishWrite();
  }, [finishReceiptError, phase, finishHash, resetFinishWrite]);

  useEffect(() => {
    setPhase("idle");
    finishAttemptedRef.current = false;
  }, [address, cityId]);

  // Resume in-flight claim after refresh or return visit.
  useEffect(() => {
    if (!status || phase !== "idle") return;
    if (!status.isPending) return;
    if (finishAttemptedRef.current) return;
    setPhase("waiting_vrf");
  }, [status, phase]);

  // After crate approval confirms → request open slot.
  useEffect(() => {
    if (!approveSuccess || phase !== "approving" || !mapAddress) return;
    void refetchCrateApproval();
    setPhase("requesting");
    writeRequestSlot({
      address: mapAddress,
      abi: MAFIA_MAP_ABI,
      functionName: "requestOpenSlot",
      args: [cityId],
    });
  }, [
    approveSuccess,
    phase,
    mapAddress,
    cityId,
    writeRequestSlot,
    refetchCrateApproval,
  ]);

  // After request confirms → poll VRF status.
  useEffect(() => {
    if (!requestSuccess || phase !== "requesting") return;
    setPhase("waiting_vrf");
    void refetchLandStatus();
  }, [requestSuccess, phase, refetchLandStatus]);

  // Poll while waiting for VRF.
  useEffect(() => {
    if (phase !== "waiting_vrf" || !address) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    void refetchLandStatus();
    pollRef.current = setInterval(() => {
      void refetchLandStatus();
    }, LAND_CLAIM_POLL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [phase, address, refetchLandStatus]);

  // When VRF fulfilled → call finish once (contract reverts if no slot is allocatable).
  useEffect(() => {
    if (phase !== "waiting_vrf" || !status || !mapAddress) return;
    if (!status.isPending || !status.isFulfilled) return;
    if (finishAttemptedRef.current) return;

    finishAttemptedRef.current = true;
    setPhase("finishing");
    writeFinishSlot({
      address: mapAddress,
      abi: MAFIA_MAP_ABI,
      functionName: "finishOpenSlot",
      args: [cityId],
    });
  }, [phase, status, mapAddress, cityId, writeFinishSlot]);

  useEffect(() => {
    if (!finishSuccess || phase !== "finishing") return;
    toast.success("Land claim completed.");
    setPhase("idle");
    void refetchLandStatus();
    onSuccess?.();
    // Keep finishAttemptedRef true until getNonceStatus shows isPending false (avoids resume loop).
  }, [finishSuccess, phase, refetchLandStatus, onSuccess]);

  useEffect(() => {
    if (statusError) {
      console.warn("[useMapLandClaim] getNonceStatus:", statusError);
    }
  }, [statusError]);

  const handleClaimLand = useCallback(() => {
    if (!isConnected || !address || !mapAddress || !ogCrateAddress) {
      toast.error("Connect your wallet first.");
      return;
    }
    if (!hasVacantUserPlots) {
      toast.error("No vacant user plots in this city.");
      return;
    }
    if (phase !== "idle") {
      return;
    }

    finishAttemptedRef.current = false;

    if (!crateApproved) {
      setPhase("approving");
      writeApproveCrate({
        address: ogCrateAddress,
        abi: OG_CRATE_ABI,
        functionName: "setApprovalForAll",
        args: [mapAddress, true],
      });
      return;
    }

    setPhase("requesting");
    writeRequestSlot({
      address: mapAddress,
      abi: MAFIA_MAP_ABI,
      functionName: "requestOpenSlot",
      args: [cityId],
    });
  }, [
    isConnected,
    address,
    mapAddress,
    ogCrateAddress,
    hasVacantUserPlots,
    phase,
    crateApproved,
    cityId,
    writeApproveCrate,
    writeRequestSlot,
  ]);

  const busy =
    approveWalletPending ||
    approveConfirming ||
    requestWalletPending ||
    requestConfirming ||
    finishWalletPending ||
    finishConfirming;

  const claimButtonDisabled =
    !isConnected ||
    !hasVacantUserPlots ||
    busy ||
    phase === "approving" ||
    phase === "requesting" ||
    phase === "finishing" ||
    phase === "waiting_vrf";

  return {
    handleClaimLand,
    phase,
    busy,
    claimButtonDisabled,
    status,
    vrfPending: phase === "waiting_vrf",
    crateApproved,
  };
}
