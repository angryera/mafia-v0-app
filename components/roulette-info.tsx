"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import { ChainStatusBadge } from "@/components/chain-status-badge";

export function RouletteInfo() {
  const addresses = useChainAddresses();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Roulette Contract
      </h2>
      <div className="flex flex-col gap-2.5">
        <CopyableAddress address={addresses.roulette} label="Contract" />

        {/* initializeBet */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">
            Step 1 &mdash; Place Bet
          </p>
          <p className="font-mono text-sm text-primary break-all">
            initializeBet(uint8,Bet[],string,bytes)
          </p>
          <div className="mt-1.5 flex flex-col gap-1">
            <p className="font-mono text-xs text-foreground">
              rouletteId <span className="text-muted-foreground">(uint8)</span>
            </p>
            <p className="font-mono text-xs text-foreground">
              bets{" "}
              <span className="text-muted-foreground">
                (betType, number, amount)[]
              </span>
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
            Step 2 &mdash; Spin Wheel
          </p>
          <p className="font-mono text-sm text-primary break-all">
            finishBet(uint8)
          </p>
          <div className="mt-1.5 flex flex-col gap-1">
            <p className="font-mono text-xs text-foreground">
              rouletteId <span className="text-muted-foreground">(uint8)</span>
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Resolves bet using on-chain VRF. Emits FinishedBet event with
              reward details.
            </p>
          </div>
        </div>

        {/* Bet types reference */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-1.5">
            Bet Types (on-chain)
          </p>
          <div className="flex flex-col gap-1">
            {[
              { id: 0, label: "Red/Black", payout: "1:1" },
              { id: 1, label: "Column (R1/R2/R3)", payout: "2:1" },
              { id: 2, label: "Dozen (S1/S2/S3)", payout: "2:1" },
              { id: 3, label: "Half (H1/H2)", payout: "1:1" },
              { id: 4, label: "Even/Odd", payout: "1:1" },
              { id: 5, label: "Straight (0-37)", payout: "35:1" },
            ].map((bt) => (
              <div
                key={bt.id}
                className="flex items-center justify-between font-mono text-[10px]"
              >
                <span className="text-foreground">
                  {bt.id}: {bt.label}
                </span>
                <span className="text-muted-foreground">{bt.payout}</span>
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
            Returns pending bet status per roulette table including bets placed
            and total amount.
          </p>
        </div>

        <ChainStatusBadge />
      </div>
    </div>
  );
}
