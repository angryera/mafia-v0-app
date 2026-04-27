"use client";

import { useAuth } from "@/components/auth-provider";
import { useChain, useChainAddresses } from "@/components/chain-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { BULLET_ABI, BULLET_WALLET_TOKEN_ABI, type ChainId } from "@/lib/contract";
import { cn } from "@/lib/utils";
import { ExternalLink, Loader2, Zap } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatUnits, maxUint256, parseUnits } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
} from "wagmi";

function getBulletTradeUrl(params: {
  chain: ChainId;
  inputToken: `0x${string}`;
  outputToken: `0x${string}`;
}): string {
  const { chain, inputToken, outputToken } = params;
  if (chain === "bnb") {
    return `https://pancakeswap.finance/swap?chain=bsc&inputCurrency=${inputToken}&outputCurrency=${outputToken}`;
  }
  return `https://app.pulsex.com/swap?inputCurrency=${inputToken}&outputCurrency=${outputToken}`;
}

function formatBulletAmount(wei: bigint, decimals: number, loading: boolean): string {
  if (loading) return "…";
  if (wei === BigInt(0)) return "0";
  const s = formatUnits(wei, decimals);
  const n = Number(s);
  if (Number.isFinite(n) && n > 0 && n < 0.0001) return "< 0.0001";
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function tryParseInputWei(
  text: string,
  decimals: number,
): { wei: bigint | null; err: string | null } {
  const t = text.trim();
  if (!t) return { wei: null, err: null };
  if (!/^\d*(\.\d*)?$/.test(t) || t === ".")
    return { wei: null, err: "Invalid number" };
  try {
    const w = parseUnits(t, decimals);
    if (w === BigInt(0)) return { wei: null, err: "Enter an amount greater than 0" };
    return { wei: w, err: null };
  } catch {
    return { wei: null, err: "Invalid number" };
  }
}

export function ExchangeBulletAction() {
  const { address, isConnected } = useAccount();
  const { activeChain, chainConfig } = useChain();
  const addresses = useChainAddresses();
  const { authData } = useAuth();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useChainWriteContract();

  const [depositIn, setDepositIn] = useState("");
  const [withdrawIn, setWithdrawIn] = useState("");
  const [depositErr, setDepositErr] = useState<string | null>(null);
  const [withdrawErr, setWithdrawErr] = useState<string | null>(null);
  const [pending, setPending] = useState<"deposit" | "withdraw" | "approve" | null>(null);

  const { data: walletDecimalsRaw, isLoading: wDecL } = useReadContract({
    address: addresses.walletBullet,
    abi: BULLET_WALLET_TOKEN_ABI,
    functionName: "decimals",
  });

  const { data: ingameDecimalsRaw, isLoading: iDecL } = useReadContract({
    address: addresses.bullets,
    abi: BULLET_ABI,
    functionName: "decimals",
  });

  const walletDec = Number(walletDecimalsRaw ?? 18);
  const ingameDec = Number(ingameDecimalsRaw ?? 18);

  const authOk = isConnected && !!address && !!authData;

  const { data: walletBalanceRaw, refetch: refetchWallet, isLoading: wBalL } = useReadContract({
    address: addresses.walletBullet,
    abi: BULLET_WALLET_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const { data: ingameBalanceRaw, refetch: refetchIngame, isLoading: iBalL } = useReadContract({
    address: addresses.bullets,
    abi: BULLET_ABI,
    functionName: "balanceOf",
    args: authData && address ? [address, authData.message, authData.signature] : undefined,
    query: { enabled: authOk && !!authData && !!address },
  });

  const { data: allowanceRaw, refetch: refetchAllow } = useReadContract({
    address: addresses.walletBullet,
    abi: BULLET_WALLET_TOKEN_ABI,
    functionName: "allowance",
    args: address && addresses.bullets ? [address, addresses.bullets] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const zero = BigInt(0);
  const walletBalWei = (walletBalanceRaw as bigint | undefined) ?? zero;
  const ingameBalWei = (ingameBalanceRaw as bigint | undefined) ?? zero;
  const allowanceWei = (allowanceRaw as bigint | undefined) ?? zero;

  const depositParsed = useMemo(
    () => tryParseInputWei(depositIn, walletDec),
    [depositIn, walletDec],
  );
  const withdrawParsed = useMemo(
    () => tryParseInputWei(withdrawIn, ingameDec),
    [withdrawIn, ingameDec],
  );

  const estDepositOut = depositIn.trim() ? depositIn.trim() : "0";
  const estWithdrawOut = useMemo(() => {
    if (withdrawParsed.wei === null) return "0";
    return formatUnits((withdrawParsed.wei * BigInt(8)) / BigInt(10), ingameDec);
  }, [withdrawParsed.wei, ingameDec]);

  const openTrade = useCallback(() => {
    const u = getBulletTradeUrl({
      chain: activeChain,
      inputToken: addresses.mafia,
      outputToken: addresses.walletBullet,
    });
    window.open(u, "_blank", "noopener,noreferrer");
  }, [activeChain, addresses.mafia, addresses.walletBullet]);

  const onDeposit = async () => {
    if (!address) {
      toast.error("Connect your wallet");
      return;
    }
    if (!publicClient) {
      toast.error("Network not ready");
      return;
    }
    setDepositErr(null);
    const w = depositParsed.wei;
    if (w === null) {
      setDepositErr(depositParsed.err || "Enter an amount");
      return;
    }
    if (w > walletBalWei) {
      setDepositErr("Not enough in wallet");
      return;
    }
    setPending("deposit");
    try {
      if (allowanceWei < w) {
        setPending("approve");
        const approveHash = await writeContractAsync({
          address: addresses.walletBullet,
          abi: BULLET_WALLET_TOKEN_ABI,
          functionName: "approve",
          args: [addresses.bullets, maxUint256],
        });
        if (approveHash) {
          const receipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
          if (receipt.status === "reverted") {
            throw new Error("Approval failed");
          }
          await refetchAllow();
        }
        setPending("deposit");
      }
      const depHash = await writeContractAsync({
        address: addresses.walletBullet,
        abi: BULLET_WALLET_TOKEN_ABI,
        functionName: "depositBullet",
        args: [w],
      });
      if (depHash) {
        await publicClient.waitForTransactionReceipt({ hash: depHash });
        toast.success("Deposited");
        await refetchWallet();
        await refetchIngame();
        void refetchAllow();
        setDepositIn("");
      }
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "shortMessage" in e
        ? String((e as { shortMessage: string }).shortMessage)
        : (e as Error).message;
      toast.error(msg || "Deposit failed");
    } finally {
      setPending(null);
    }
  };

  const onWithdraw = async () => {
    if (!address || !authData) {
      toast.error("Connect your wallet and sign the message");
      return;
    }
    if (!publicClient) {
      toast.error("Network not ready");
      return;
    }
    setWithdrawErr(null);
    const w = withdrawParsed.wei;
    if (w === null) {
      setWithdrawErr(withdrawParsed.err || "Enter an amount");
      return;
    }
    if (w > ingameBalWei) {
      setWithdrawErr("Not enough in-game");
      return;
    }
    setPending("withdraw");
    try {
      const h = await writeContractAsync({
        address: addresses.bullets,
        abi: BULLET_ABI,
        functionName: "withdrawBullet",
        args: [w],
      });
      if (h) {
        await publicClient.waitForTransactionReceipt({ hash: h });
        toast.success("Withdrawn");
        await refetchWallet();
        await refetchIngame();
        void refetchAllow();
        setWithdrawIn("");
      }
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "shortMessage" in e
        ? String((e as { shortMessage: string }).shortMessage)
        : (e as Error).message;
      toast.error(msg || "Withdraw failed");
    } finally {
      setPending(null);
    }
  };

  const canDeposit =
    isConnected && !!address && depositParsed.wei !== null && depositParsed.err === null && pending === null;
  const canWithdraw =
    authOk && withdrawParsed.wei !== null && withdrawParsed.err === null && pending === null;

  const isBusy = pending !== null;

  return (
    <div className="mx-auto mt-4 flex w-full max-w-md flex-col gap-8 px-2 pb-8">
      {/* Deposit */}
      <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Deposit</h2>
          <span className="text-xs text-muted-foreground">Fee: 0%</span>
        </div>
        <div className="mb-2 flex w-full min-w-0 items-stretch gap-2">
          <div className="relative flex-1 max-w-md">
            <Zap className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={depositIn}
              onChange={(e) => {
                setDepositIn(e.target.value);
                setDepositErr(null);
              }}
              disabled={!isConnected}
              className="pl-9"
            />
          </div>
          <Button
            className="min-w-[5.5rem] shrink-0"
            onClick={onDeposit}
            disabled={!canDeposit || isBusy}
          >
            {isBusy && pending && pending !== "withdraw" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Confirm"
            )}
          </Button>
        </div>
        {depositErr && <p className="mb-2 text-xs text-destructive">{depositErr}</p>}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            Balance: {formatBulletAmount(walletBalWei, walletDec, wDecL || wBalL)} (wallet)
          </span>
          <span>
            Estimated output: {estDepositOut} (in-game, 1:1)
          </span>
        </div>
        {!isConnected && (
          <p className="mt-2 text-center text-xs text-amber-600/90">Connect wallet to deposit</p>
        )}
      </div>

      {/* Withdraw */}
      <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Withdraw</h2>
          <span className="text-xs text-muted-foreground">Fee: 20%</span>
        </div>
        <div className="mb-2 flex w-full min-w-0 items-stretch gap-2">
          <div className="relative flex-1 max-w-md">
            <Zap className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={withdrawIn}
              onChange={(e) => {
                setWithdrawIn(e.target.value);
                setWithdrawErr(null);
              }}
              disabled={!authOk}
              className="pl-9"
            />
          </div>
          <Button
            className="min-w-[5.5rem] shrink-0"
            onClick={onWithdraw}
            disabled={!canWithdraw || isBusy}
          >
            {isBusy && pending === "withdraw" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Confirm"
            )}
          </Button>
        </div>
        {withdrawErr && <p className="mb-2 text-xs text-destructive">{withdrawErr}</p>}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            Balance: {formatBulletAmount(ingameBalWei, ingameDec, iDecL || iBalL)} (in-game)
          </span>
          <span>
            Estimated output: {estWithdrawOut} (to wallet, after 20% fee)
          </span>
        </div>
        {!isConnected && (
          <p className="mt-2 text-center text-xs text-amber-600/90">Connect wallet to withdraw</p>
        )}
        {isConnected && !authData && (
          <p className="mt-2 text-center text-xs text-amber-600/90">Waiting for signature…</p>
        )}
      </div>

      {/* Trade */}
      <div className="mx-auto w-full max-w-md">
        <Button
          variant="secondary"
          className={cn("h-11 w-full justify-between gap-2 rounded-xl px-4 text-sm font-medium")}
          onClick={openTrade}
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 shrink-0 opacity-80" />
            Trade {chainConfig.label} (MAFIA → Bullet)
          </span>
          {activeChain === "bnb" ? (
            <span className="text-[10px] text-muted-foreground">PancakeSwap</span>
          ) : (
            <span className="text-[10px] text-muted-foreground">PulseX</span>
          )}
        </Button>
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
          Opens a DEX swap in a new tab. Input: MAFIA · Output: wallet bullet
        </p>
      </div>
    </div>
  );
}
