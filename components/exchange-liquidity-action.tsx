"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAccount, usePublicClient, useReadContract } from "wagmi";
import { useChain, useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import {
  DEPOSIT_ADDRESSES,
  DEPOSIT_CONTRACT_ABI,
  INGAME_CURRENCY_ABI,
  INGAME_CURRENCY_APPROVE_AMOUNT,
} from "@/lib/contract";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { formatEther, parseEther } from "viem";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Wallet,
  Plus,
  Coins,
  ArrowDownToLine,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ── Types ───────────────────────────────────────────────────────
interface LiquidityPosition {
  id: bigint;
  provider: `0x${string}`;
  initialCashAmount: bigint;
  cashAmount: bigint;
  cashPerMafia: bigint;
  mafiaEarned: bigint;
  mafiaWithdrawn: bigint;
  active: boolean;
}

declare global {
  interface Window {
    MafiaDeposit?: {
      getLiquidityPositions: (opts: { chain: string }) => Promise<LiquidityPosition[]>;
    };
  }
}

// ── Script loader ───────────────────────────────────────────────
function useDepositScript() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.MafiaDeposit) {
      setReady(true);
    } else {
      const existingScript = document.querySelector(
        'script[src="/js/mafia-utils.js"]'
      );
      if (existingScript) {
        existingScript.addEventListener("load", () => setReady(true));
      } else {
        const script = document.createElement("script");
        script.src = "/js/mafia-utils.js";
        script.async = true;
        script.onload = () => setReady(true);
        script.onerror = () => setError("Failed to load deposit script");
        document.head.appendChild(script);
      }
    }
  }, []);

  return { ready, error };
}

// ── Helper functions ────────────────────────────────────────────
function formatCash(value: bigint): string {
  const num = Number(formatEther(value));
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return `${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatMafia(value: bigint): string {
  const num = Number(formatEther(value));
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function isLiquidityProvider(
  wallet: `0x${string}` | undefined,
  provider: `0x${string}`
): boolean {
  return (
    !!wallet && wallet.toLowerCase() === provider.toLowerCase()
  );
}

function shortAddress(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ── Main Component ──────────────────────────────────────────────
export function ExchangeLiquidityAction() {
  const { address, isConnected } = useAccount();
  const { activeChain } = useChain();
  const depositSpender = DEPOSIT_ADDRESSES[activeChain];
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useChainWriteContract();
  const { authData, requestSignature, isSigning: authSigning, signError: authSignError } =
    useAuth();
  const { ready: scriptReady, error: scriptError } = useDepositScript();

  const {
    data: ingameCashRaw,
    isLoading: ingameCashLoading,
    refetch: refetchIngameCash,
  } = useReadContract({
    address: addresses.ingameCurrency,
    abi: INGAME_CURRENCY_ABI,
    functionName: "balanceOfWithSignMsg",
    args:
      authData && address
        ? [address, authData.message, authData.signature]
        : undefined,
    query: {
      enabled:
        !!address &&
        !!authData &&
        !!addresses.ingameCurrency &&
        isConnected,
    },
  });

  const availableCashWei =
    ingameCashRaw !== undefined ? (ingameCashRaw as bigint) : undefined;
  const availableCashDisplay =
    availableCashWei !== undefined
      ? Number(formatEther(availableCashWei)).toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })
      : null;

  const { data: depositAllowanceRaw, refetch: refetchDepositAllowance } =
    useReadContract({
      address: addresses.ingameCurrency as `0x${string}`,
      abi: INGAME_CURRENCY_ABI,
      functionName: "allowances",
      args:
        address && depositSpender
          ? [address, depositSpender]
          : undefined,
      query: {
        enabled:
          !!address &&
          !!depositSpender &&
          !!addresses.ingameCurrency &&
          isConnected,
      },
    });

  /** Positions per page (client-side only; full list still loaded in one request). */
  const CLIENT_PAGE_SIZE = 15;

  // ── State ─────────────────────────────────────────────────────
  const [positions, setPositions] = useState<LiquidityPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listPage, setListPage] = useState(0);
  /** When on, list only positions where `provider` is the connected wallet. */
  const [mineOnly, setMineOnly] = useState(false);

  // Action states
  const [pendingWithdrawId, setPendingWithdrawId] = useState<number | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<number | null>(null);

  // Add liquidity form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [cashInput, setCashInput] = useState("");
  const [cashPerMafiaInput, setCashPerMafiaInput] = useState("");
  const [addPending, setAddPending] = useState(false);

  // Expanded position for details
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const parsedCashWei = useMemo(() => {
    if (!cashInput.trim()) return null;
    try {
      return parseEther(cashInput.trim());
    } catch {
      return null;
    }
  }, [cashInput]);

  const cashExceedsBalance =
    parsedCashWei !== null &&
    availableCashWei !== undefined &&
    parsedCashWei > availableCashWei;

  const cashAmountValid =
    parsedCashWei !== null &&
    parsedCashWei > BigInt(0) &&
    availableCashWei !== undefined &&
    parsedCashWei <= availableCashWei;

  const needsDepositApproval =
    cashAmountValid &&
    parsedCashWei !== null &&
    depositAllowanceRaw !== undefined &&
    (depositAllowanceRaw as bigint) < parsedCashWei;

  /** MAFIA swap capacity at the quoted rate: cash ÷ (cash per 1 MAFIA). */
  const estimatedMafiaAmount = useMemo(() => {
    const cash = parseFloat(cashInput.trim());
    const rate = parseFloat(cashPerMafiaInput.trim());
    if (
      !Number.isFinite(cash) ||
      !Number.isFinite(rate) ||
      cash <= 0 ||
      rate <= 0
    ) {
      return null;
    }
    return cash / rate;
  }, [cashInput, cashPerMafiaInput]);

  const handleCashInputChange = (raw: string) => {
    if (availableCashWei === undefined) {
      setCashInput(raw);
      return;
    }
    if (raw === "" || raw === ".") {
      setCashInput(raw);
      return;
    }
    try {
      const w = parseEther(raw.trim());
      if (w > availableCashWei) {
        setCashInput(formatEther(availableCashWei));
      } else {
        setCashInput(raw);
      }
    } catch {
      setCashInput(raw);
    }
  };

  // ── Fetch positions (full list in one call) ──────────────────
  const fetchPositions = useCallback(async () => {
    if (!window.MafiaDeposit || !address) return;

    setLoading(true);
    setError(null);
    try {
      const chain = activeChain === "bnb" ? "bnb" : "pls";
      const list = await window.MafiaDeposit.getLiquidityPositions({ chain });
      setPositions(list);
      setListPage(0);
    } catch (e) {
      console.error("Failed to fetch liquidity positions:", e);
      setError("Failed to load liquidity positions");
      toast.error("Failed to load liquidity positions");
    } finally {
      setLoading(false);
    }
  }, [address, activeChain]);

  const activePositions = useMemo(() => positions.filter((p) => p.active), [positions]);
  const visibleActivePositions = useMemo(() => {
    if (!address) return activePositions;
    // Public list: show only listings with available cash, but always include my listings.
    return activePositions.filter(
      (p) => isLiquidityProvider(address, p.provider) || p.cashAmount > BigInt(0)
    );
  }, [activePositions, address]);
  const filteredActivePositions = useMemo(() => {
    if (!mineOnly || !address) return visibleActivePositions;
    return visibleActivePositions.filter((p) =>
      isLiquidityProvider(address, p.provider)
    );
  }, [visibleActivePositions, mineOnly, address]);

  const totalPositions = filteredActivePositions.length;
  const totalListPages = Math.max(1, Math.ceil(totalPositions / CLIENT_PAGE_SIZE));
  const listPageStart = listPage * CLIENT_PAGE_SIZE;
  const paginatedPositions = useMemo(
    () =>
      filteredActivePositions.slice(
        listPageStart,
        listPageStart + CLIENT_PAGE_SIZE
      ),
    [filteredActivePositions, listPageStart]
  );

  useEffect(() => {
    setListPage(0);
  }, [mineOnly]);

  useEffect(() => {
    if (listPage > 0 && listPage >= totalListPages) {
      setListPage(Math.max(0, totalListPages - 1));
    }
  }, [listPage, totalListPages]);

  // ── Initialize ────────────────────────────────────────────────
  useEffect(() => {
    if (scriptReady && isConnected && address) {
      void fetchPositions();
    }
  }, [scriptReady, isConnected, address, activeChain, fetchPositions]);

  // ── Withdraw MAFIA handler ────────────────────────────────────
  const handleWithdrawMafia = async (positionId: number) => {
    if (!address || !depositSpender) return;

    setPendingWithdrawId(positionId);
    try {
      const withdrawHash = await writeContractAsync({
        address: depositSpender,
        abi: DEPOSIT_CONTRACT_ABI,
        functionName: "withdrawMafia",
        args: [BigInt(positionId)],
      });
      if (publicClient && withdrawHash) {
        await publicClient.waitForTransactionReceipt({ hash: withdrawHash });
      }
      toast.success("MAFIA withdrawn successfully!");
      if (withdrawHash) {
        toast.info(
          <a
            href={`${explorer}/tx/${withdrawHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View transaction
          </a>
        );
      }
      await fetchPositions();
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to withdraw MAFIA";
      if (!errorMessage.includes("User rejected")) {
        toast.error(errorMessage);
      }
    } finally {
      setPendingWithdrawId(null);
    }
  };

  // ── Remove Liquidity handler ──────────────────────────────────
  const handleRemoveLiquidity = async (positionId: number) => {
    if (!address || !depositSpender) return;

    setPendingRemoveId(positionId);
    try {
      const removeHash = await writeContractAsync({
        address: depositSpender,
        abi: DEPOSIT_CONTRACT_ABI,
        functionName: "removeLiquidity",
        args: [BigInt(positionId)],
      });
      if (publicClient && removeHash) {
        await publicClient.waitForTransactionReceipt({ hash: removeHash });
      }
      toast.success("Liquidity removed successfully!");
      if (removeHash) {
        toast.info(
          <a
            href={`${explorer}/tx/${removeHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View transaction
          </a>
        );
      }
      await fetchPositions();
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to remove liquidity";
      if (!errorMessage.includes("User rejected")) {
        toast.error(errorMessage);
      }
    } finally {
      setPendingRemoveId(null);
    }
  };

  // ── Add Liquidity handler ─────────────────────────────────────
  const handleAddLiquidity = async () => {
    if (!address || !depositSpender) return;

    let cashWei: bigint;
    let cashPerMafiaWei: bigint;
    try {
      cashWei = parseEther(cashInput.trim());
      cashPerMafiaWei = parseEther(cashPerMafiaInput.trim());
    } catch {
      toast.error("Invalid cash or cash-per-MAFIA amount");
      return;
    }

    if (cashWei <= BigInt(0)) {
      toast.error("Please enter a valid cash amount");
      return;
    }
    if (cashPerMafiaWei <= BigInt(0)) {
      toast.error("Please enter a valid cash per MAFIA rate");
      return;
    }

    if (availableCashWei !== undefined && cashWei > availableCashWei) {
      toast.error("Amount exceeds your available in-game cash");
      return;
    }

    setAddPending(true);
    try {
      const requiredWei = cashWei;

      const allowanceResult = await refetchDepositAllowance();
      const currentAllowance =
        allowanceResult.data !== undefined
          ? (allowanceResult.data as bigint)
          : (depositAllowanceRaw as bigint | undefined);

      if (currentAllowance === undefined) {
        toast.error("Could not read in-game cash allowance. Try again.");
        return;
      }

      if (requiredWei > currentAllowance) {
        toast.info("Approving in-game cash for deposit contract…");
        const approveHash = await writeContractAsync({
          address: addresses.ingameCurrency,
          abi: INGAME_CURRENCY_ABI,
          functionName: "approveInGameCurrency",
          args: [depositSpender, INGAME_CURRENCY_APPROVE_AMOUNT],
        });
        if (publicClient && approveHash) {
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
        await refetchDepositAllowance();
      }

      toast.info("Adding liquidity...");
      const addHash = await writeContractAsync({
        address: depositSpender,
        abi: DEPOSIT_CONTRACT_ABI,
        functionName: "addLiquidity",
        args: [cashWei, cashPerMafiaWei],
      });
      if (publicClient && addHash) {
        await publicClient.waitForTransactionReceipt({ hash: addHash });
      }
      toast.success("Liquidity added successfully!");
      if (addHash) {
        toast.info(
          <a
            href={`${explorer}/tx/${addHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View transaction
          </a>
        );
      }

      // Reset form and refresh
      setCashInput("");
      setCashPerMafiaInput("");
      setShowAddForm(false);
      await fetchPositions();
      void refetchIngameCash();
      void refetchDepositAllowance();
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to add liquidity";
      if (!errorMessage.includes("User rejected")) {
        toast.error(errorMessage);
      }
    } finally {
      setAddPending(false);
    }
  };

  // ── Disconnected state ────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Wallet className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">
          Exchange Liquidity
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect wallet to view liquidity positions.
        </p>
      </div>
    );
  }

  // ── Script error state ────────────────────────────────────────
  if (scriptError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
        <p className="text-lg font-semibold text-foreground">Script Error</p>
        <p className="mt-1 text-sm text-muted-foreground">{scriptError}</p>
      </div>
    );
  }

  // ── Loading state ─────────────────────────────────────────────
  if (!scriptReady || loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-semibold text-foreground">
          Loading Positions...
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Fetching active liquidity positions from the blockchain.
        </p>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────
  if (error && positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
        <p className="text-lg font-semibold text-foreground">Error</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => void fetchPositions()}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Liquidity Positions
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Browse active pools. Withdraw or remove liquidity only on your own
            positions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Liquidity
          </Button>
          <button
            type="button"
            onClick={() => void fetchPositions()}
            disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background/50 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/30 disabled:opacity-50"
            aria-label="Refresh positions"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5",
                loading && "animate-spin"
              )}
            />
          </button>
        </div>
      </div>

      <Dialog
        open={showAddForm}
        onOpenChange={(open) => {
          if (!open && addPending) return;
          setShowAddForm(open);
        }}
      >
        <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <DialogTitle>Add New Liquidity</DialogTitle>
                <DialogDescription className="mt-1">
                  Provide in-game cash and earn MAFIA from trades at your rate.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-1">
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
              {!authData ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-muted-foreground">
                    Sign a message to load your in-game cash balance.
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => requestSignature()}
                    disabled={authSigning}
                  >
                    {authSigning ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Signing…
                      </>
                    ) : (
                      "Sign"
                    )}
                  </Button>
                </div>
              ) : ingameCashLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading available cash…
                </div>
              ) : availableCashDisplay !== null ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-foreground">
                    Available in-game cash:{" "}
                    <span className="font-semibold tabular-nums">
                      ${availableCashDisplay}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 shrink-0"
                    disabled={addPending || availableCashWei === undefined}
                    onClick={() =>
                      availableCashWei !== undefined &&
                      setCashInput(formatEther(availableCashWei))
                    }
                  >
                    Use max
                  </Button>
                </div>
              ) : (
                <span className="text-muted-foreground">
                  Could not load cash balance.
                </span>
              )}
              {authSignError ? (
                <p className="mt-1 text-xs text-destructive">{authSignError}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cash" className="text-sm">
                Cash Amount
              </Label>
              <Input
                id="cash"
                type="text"
                inputMode="decimal"
                placeholder="Enter cash amount"
                value={cashInput}
                onChange={(e) => handleCashInputChange(e.target.value)}
                disabled={addPending || !authData}
              />
              {cashExceedsBalance && (
                <p className="text-xs text-destructive">
                  Amount cannot exceed your available in-game cash.
                </p>
              )}
              {needsDepositApproval && (
                <p className="text-xs text-amber-200">
                  Your wallet will first approve in-game cash for the deposit
                  contract (same as elsewhere in the app), then add liquidity.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cashPerMafia" className="text-sm">
                Cash per MAFIA
              </Label>
              <Input
                id="cashPerMafia"
                type="number"
                placeholder="Exchange rate (cash per MAFIA)"
                value={cashPerMafiaInput}
                onChange={(e) => setCashPerMafiaInput(e.target.value)}
                disabled={addPending}
              />
              <p className="text-xs text-muted-foreground">
                The rate at which traders can swap MAFIA for your cash.
              </p>
            </div>

            {estimatedMafiaAmount !== null && (
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                <p className="text-xs font-medium text-muted-foreground">
                  MAFIA at this rate
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                  ≈{" "}
                  {estimatedMafiaAmount.toLocaleString(undefined, {
                    maximumFractionDigits: 6,
                  })}{" "}
                  MAFIA
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Cash amount ÷ cash per MAFIA (how much MAFIA your cash can
                  back at this quote).
                </p>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
                disabled={addPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAddLiquidity}
                disabled={
                  addPending ||
                  !authData ||
                  !cashPerMafiaInput ||
                  parseFloat(cashPerMafiaInput) <= 0 ||
                  !cashAmountValid
                }
              >
                {addPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Liquidity
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Positions list (active only; inactive / closed positions are omitted) */}
      {visibleActivePositions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-12">
          <Coins className="mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">
            {positions.length === 0
              ? "No liquidity positions found"
              : "No listings with available cash"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {positions.length === 0
              ? "Add liquidity to start earning MAFIA from trades."
              : "Only active listings with cash available are shown (plus your own listings)."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card/50 px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label
                htmlFor="liquidity-mine-only"
                className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"
              >
                <Switch
                  id="liquidity-mine-only"
                  checked={mineOnly}
                  onCheckedChange={setMineOnly}
                />
                <span className="select-none font-medium text-foreground">
                  My listings only
                </span>
              </label>
            </div>
            {filteredActivePositions.length > 0 && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing{" "}
                  <span className="font-medium tabular-nums text-foreground">
                    {listPageStart + 1}
                  </span>
                  –
                  <span className="font-medium tabular-nums text-foreground">
                    {Math.min(
                      listPageStart + CLIENT_PAGE_SIZE,
                      totalPositions
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium tabular-nums text-foreground">
                    {totalPositions}
                  </span>
                  {mineOnly ? (
                    <span className="text-muted-foreground"> (your pools)</span>
                  ) : null}
                </p>
                {totalListPages > 1 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={listPage <= 0}
                      onClick={() => setListPage((p) => Math.max(0, p - 1))}
                    >
                      Previous
                    </Button>
                    <span className="text-xs tabular-nums text-muted-foreground px-1">
                      Page {listPage + 1} / {totalListPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={listPage >= totalListPages - 1}
                      onClick={() =>
                        setListPage((p) => Math.min(totalListPages - 1, p + 1))
                      }
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {filteredActivePositions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 py-10">
              <p className="text-sm font-medium text-foreground">
                No active positions from your wallet
              </p>
              <p className="mt-1 max-w-sm text-center text-xs text-muted-foreground">
                Turn off My listings only to browse everyone else&apos;s pools,
                or add liquidity to create your own.
              </p>
            </div>
          ) : (
            paginatedPositions.map((position) => {
              const posId = Number(position.id);
              const isOwn = isLiquidityProvider(address, position.provider);
              const isExpanded = expandedId === posId;
              const isPendingWithdraw = pendingWithdrawId === posId;
              const isPendingRemove = pendingRemoveId === posId;
              const isPending = isPendingWithdraw || isPendingRemove;


              const availableToWithdraw = position.mafiaEarned - position.mafiaWithdrawn;
              const mafiaEarnedDisplay = formatMafia(position.mafiaEarned);
              const mafiaWithdrawnDisplay = formatMafia(position.mafiaWithdrawn);
              const availableToWithdrawDisplay = formatMafia(availableToWithdraw);

              const hasEarnings = availableToWithdraw > BigInt(0);
              const providerHref = `${explorer}/address/${position.provider}`;

              return (
                <div
                  key={posId}
                  className={cn(
                    "rounded-xl border bg-card overflow-hidden transition-colors",
                    isOwn ? "border-border" : "border-muted/50"
                  )}
                >
                  {/* Position header */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : posId)}
                    className="flex w-full items-center justify-between px-4 py-3 hover:bg-background/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg",
                          isOwn
                            ? "bg-green-400/10 text-green-400"
                            : "bg-muted/15 text-muted-foreground"
                        )}
                      >
                        <Coins className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            Position #{posId}
                          </p>
                          <Badge
                            variant="default"
                            className="text-xs bg-green-500/20 text-green-400"
                          >
                            Active
                          </Badge>
                          {isOwn ? (
                            <Badge className="text-xs bg-primary/15 text-primary">
                              Yours
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-muted/30 text-muted-foreground"
                            >
                              View only
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {isOwn ? (
                            <>
                              {formatCash(position.cashAmount)} remaining ·{" "}
                              {availableToWithdrawDisplay} MAFIA to withdraw
                            </>
                          ) : (
                            <>
                              {formatCash(position.cashAmount)} remaining ·
                              Provider{" "}
                              <a
                                href={providerHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-foreground/80 underline-offset-2 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {shortAddress(position.provider)}
                              </a>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Position details */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 py-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                        <div className="col-span-2 rounded-lg bg-background/50 p-3 sm:col-span-3">
                          <p className="text-xs text-muted-foreground">Provider</p>
                          <a
                            href={providerHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 inline-block font-mono text-sm font-semibold text-primary underline-offset-2 hover:underline"
                          >
                            {position.provider}
                          </a>
                        </div>
                        <div className="rounded-lg bg-background/50 p-3">
                          <p className="text-xs text-muted-foreground">
                            Initial Cash
                          </p>
                          <p className="text-sm font-semibold text-foreground mt-0.5">
                            {formatCash(position.initialCashAmount)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-background/50 p-3">
                          <p className="text-xs text-muted-foreground">
                            Current Cash
                          </p>
                          <p className="text-sm font-semibold text-foreground mt-0.5">
                            {formatCash(position.cashAmount)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-background/50 p-3">
                          <p className="text-xs text-muted-foreground">
                            Cash per MAFIA
                          </p>
                          <p className="text-sm font-semibold text-foreground mt-0.5">
                            {formatCash(position.cashPerMafia)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-background/50 p-3">
                          <p className="text-xs text-muted-foreground">
                            MAFIA Earned
                          </p>
                          <p className="text-sm font-semibold text-primary mt-0.5">
                            {mafiaEarnedDisplay}
                          </p>
                        </div>
                        <div className="rounded-lg bg-background/50 p-3">
                          <p className="text-xs text-muted-foreground">
                            MAFIA Withdrawn
                          </p>
                          <p className="text-sm font-semibold text-foreground mt-0.5">
                            {mafiaWithdrawnDisplay}
                          </p>
                        </div>
                        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                          <p className="text-xs text-muted-foreground">
                            Available to Withdraw
                          </p>
                          <p className="text-sm font-semibold text-primary mt-0.5">
                            {availableToWithdrawDisplay} MAFIA
                          </p>
                        </div>
                      </div>

                      {/* Actions: only the liquidity provider may withdraw or remove */}
                      {isOwn ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleWithdrawMafia(posId)}
                            disabled={isPending || !hasEarnings}
                            className="flex-1"
                          >
                            {isPendingWithdraw ? (
                              <>
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                Withdrawing...
                              </>
                            ) : (
                              <>
                                <ArrowDownToLine className="mr-1.5 h-4 w-4" />
                                Withdraw MAFIA
                              </>
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveLiquidity(posId)}
                            disabled={isPending}
                            className="flex-1"
                          >
                            {isPendingRemove ? (
                              <>
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                Removing...
                              </>
                            ) : (
                              <>
                                <Trash2 className="mr-1.5 h-4 w-4" />
                                Remove Liquidity
                              </>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Only the provider can withdraw MAFIA or remove this
                          liquidity. This listing is read-only for you.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

    </div>
  );
}
