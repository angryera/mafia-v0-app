"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import { ChainStatusBadge } from "@/components/chain-status-badge";
import { SLOT_PAYOUT_SUMMARY } from "@/lib/contract";

export function SlotMachineInfo() {
  const addresses = useChainAddresses();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Slot Machine Contract
      </h2>
      <div className="flex flex-col gap-2.5">
        <CopyableAddress address={addresses.slotMachine} label="Contract" />

        {/* initializeBet */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">
            Step 1 &mdash; Place Bet
          </p>
          <p className="font-mono text-sm text-primary break-all">
            initializeBet(uint8,uint8,uint256,string,bytes)
          </p>
          <div className="mt-1.5 flex flex-col gap-1">
            <p className="font-mono text-xs text-foreground">
              slotMachineId{" "}
              <span className="text-muted-foreground">(uint8)</span>
            </p>
            <p className="font-mono text-xs text-foreground">
              spinCount{" "}
              <span className="text-muted-foreground">(uint8, 1-10)</span>
            </p>
            <p className="font-mono text-xs text-foreground">
              amountPerSpin{" "}
              <span className="text-muted-foreground">(uint256)</span>
            </p>
            <p className="font-mono text-xs text-foreground">
              message <span className="text-muted-foreground">(string)</span>
            </p>
            <p className="font-mono text-xs text-foreground">
              signature <span className="text-muted-foreground">(bytes)</span>
            </p>
          </div>
        </div>

        {/* finishBet */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">
            Step 2 &mdash; Spin Reels
          </p>
          <p className="font-mono text-sm text-primary break-all">finishBet(uint8)</p>
          <div className="mt-1.5 flex flex-col gap-1">
            <p className="font-mono text-xs text-foreground">
              slotMachineId{" "}
              <span className="text-muted-foreground">(uint8)</span>
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Resolves bet using on-chain VRF. Emits FinishedBet event with
              nonces and reward details.
            </p>
          </div>
        </div>

        {/* Payout table */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-1.5">
            Payout Multipliers
          </p>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
              <span>Symbol</span>
              <div className="flex gap-3">
                <span>2-match</span>
                <span>3-match</span>
              </div>
            </div>
            {SLOT_PAYOUT_SUMMARY.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between font-mono text-[10px]"
              >
                <span className="text-foreground">{p.name}</span>
                <div className="flex gap-3">
                  <span className="text-muted-foreground w-10 text-right">
                    {p.twoX}x
                  </span>
                  <span className="text-primary w-10 text-right">
                    {p.threeX}x
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* getUserBetInfo */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">Read Function</p>
          <p className="font-mono text-sm text-primary break-all">
            getUserBetInfo(address)
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Returns pending bet status per slot machine including spin count and
            amount per spin.
          </p>
        </div>

        <ChainStatusBadge />
      </div>
    </div>
  );
}
