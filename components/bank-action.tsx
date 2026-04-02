"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
  useSignMessage,
} from "wagmi";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { BANK_TRANSFER_ABI } from "@/lib/contract";
import { useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import {
  Loader2,
  Landmark,
  CheckCircle2,
  XCircle,
  Send,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseUnits, isAddress } from "viem";

export function BankAction() {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();
  const [signing, setSigning] = useState(false);
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const { signMessageAsync } = useSignMessage();

  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useChainWriteContract();

  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  // Cooldown: lastTransferTime + 15 min
  const { data: lastTransferTimeRaw } = useReadContract({
    address: addresses.ingameCurrency,
    abi: BANK_TRANSFER_ABI,
    functionName: "lastTransferTime",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address,
      refetchInterval: 15_000,
    },
  });

  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  useEffect(() => {
    if (lastTransferTimeRaw === undefined) return;
    const lastTime = Number(lastTransferTimeRaw);
    const cooldownEnd = (lastTime + 15 * 60) * 1000; // +15 min in ms

    const tick = () => {
      const diff = cooldownEnd - Date.now();
      setCooldownRemaining(diff > 0 ? diff : 0);
    };

    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [lastTransferTimeRaw]);

  const cooldownSeconds = Math.ceil(cooldownRemaining / 1000);
  const cooldownMinutes = Math.floor(cooldownSeconds / 60);
  const cooldownSecs = cooldownSeconds % 60;
  const cooldownReady = cooldownSeconds <= 0;
  const onCooldown = isConnected && !cooldownReady;

  const isValidAddress = toAddress.length > 0 && isAddress(toAddress);
  const isValidAmount =
    amount.length > 0 && Number(amount) > 0 && !Number.isNaN(Number(amount));

  const handleTransfer = async () => {
    if (!isValidAddress || !isValidAmount) return;

    reset();
    setSigning(true);
    try {
      const threeDaysInSeconds = 3 * 24 * 60 * 60;
      const utcTimestamp = Math.floor(Date.now() / 1000) + threeDaysInSeconds;
      const authMessage = `"Sign this message with ${address} - expire at ${utcTimestamp}"`;
      const signature = await signMessageAsync({ message: authMessage });
      setSigning(false);

      const parsedAmount = parseUnits(amount, 18);

      writeContract({
        address: addresses.ingameCurrency,
        abi: BANK_TRANSFER_ABI,
        functionName: "userTransfer",
        args: [toAddress as `0x${string}`, parsedAmount, authMessage, signature],
      });
    } catch {
      setSigning(false);
    }
  };

  const toastFired = useRef(false);
  useEffect(() => {
    if (isSuccess && hash && !toastFired.current) {
      toastFired.current = true;
      toast.success(`Transfer of ${Number(amount).toLocaleString()} cash sent successfully`);
    }
    if (!hash) {
      toastFired.current = false;
    }
  }, [isSuccess, hash, amount]);

  const isLoading = signing || isPending || isConfirming;

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Bank Transfer
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Send cash to another player via{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-primary">
              userTransfer(address,uint256,string,bytes)
            </code>
          </p>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          <Landmark className="inline h-3.5 w-3.5" />
        </span>
      </div>

      {isConnected && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <Timer
            className={`h-5 w-5 shrink-0 ${cooldownReady ? "text-green-400" : "text-primary"}`}
          />
          <div className="flex flex-1 items-center justify-between">
            <span className="text-sm text-muted-foreground">Next Transfer</span>
            {cooldownReady ? (
              <span className="font-mono text-sm font-semibold text-green-400">
                Now
              </span>
            ) : (
              <span className="font-mono text-sm font-semibold text-primary tabular-nums">
                {cooldownMinutes}:{cooldownSecs.toString().padStart(2, "0")}
              </span>
            )}
          </div>
        </div>
      )}

      <div
        className={cn(
          "rounded-xl border border-border bg-card p-6 transition-all duration-300",
          onCooldown && "opacity-40 pointer-events-none",
          isSuccess && "border-green-400/30",
          error && "border-red-400/30"
        )}
      >
        {/* Recipient */}
        <div className="mb-5">
          <label
            htmlFor="bank-to"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Recipient Wallet Address
          </label>
          <input
            id="bank-to"
            type="text"
            placeholder="0x..."
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            disabled={isLoading}
            className={cn(
              "w-full rounded-lg border bg-background/50 px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors",
              toAddress.length > 0 && !isValidAddress
                ? "border-red-400/50 focus:border-red-400"
                : "border-border focus:border-primary"
            )}
          />
          {toAddress.length > 0 && !isValidAddress && (
            <p className="mt-1 text-[10px] text-red-400">
              Please enter a valid wallet address
            </p>
          )}
        </div>

        {/* Amount */}
        <div className="mb-5">
          <label
            htmlFor="bank-amount"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Amount (Cash)
          </label>
          <input
            id="bank-amount"
            type="number"
            placeholder="0"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isLoading}
            className={cn(
              "w-full rounded-lg border bg-background/50 px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors",
              amount.length > 0 && !isValidAmount
                ? "border-red-400/50 focus:border-red-400"
                : "border-border focus:border-primary"
            )}
          />
          {amount.length > 0 && !isValidAmount && (
            <p className="mt-1 text-[10px] text-red-400">
              Please enter a valid amount greater than 0
            </p>
          )}
        </div>

        {/* Info */}
        <div className="mb-5 rounded-md bg-background/50 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Function</span>
            <span className="font-mono text-[10px] text-primary">
              userTransfer(address,uint256,string,bytes)
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Auth</span>
            <span className="font-mono text-[10px] text-foreground">
              Signed message + signature
            </span>
          </div>
          {isValidAddress && isValidAmount && (
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Sending</span>
              <span className="font-mono text-xs font-semibold text-foreground">
                {Number(amount).toLocaleString()} cash
              </span>
            </div>
          )}
        </div>

        {/* Success */}
        {isSuccess && hash && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-400/10 px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
            <a
              href={`${explorer}/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-green-400 underline decoration-green-400/30 hover:decoration-green-400"
            >
              {hash.slice(0, 10)}...{hash.slice(-8)}
            </a>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-400/10 px-3 py-2">
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
            <p className="line-clamp-2 text-[10px] text-red-400">
              {error.message.includes("User rejected")
                ? "Transaction rejected by user"
                : error.message.split("\n")[0]}
            </p>
          </div>
        )}

        {/* Button */}
        <button
          onClick={handleTransfer}
          disabled={!isConnected || isLoading || !isValidAddress || !isValidAmount || onCooldown}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
            isConnected && isValidAddress && isValidAmount && !onCooldown
              ? "bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              : "bg-secondary text-muted-foreground cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {signing
                ? "Sign message..."
                : isPending
                  ? "Confirm in wallet..."
                  : "Confirming..."}
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              {isConnected ? "Send Transfer" : "Connect Wallet"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
