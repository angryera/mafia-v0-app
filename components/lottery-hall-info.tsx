"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import { ChainStatusBadge } from "@/components/chain-status-badge";
import { zeroAddress } from "viem";

export function LotteryHallInfo() {
  const addresses = useChainAddresses();
  const configured = addresses.lotteryHall !== zeroAddress;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 text-sm font-semibold text-foreground">Lottery Hall contract</h2>
      <div className="flex flex-col gap-2.5">
        {configured ? (
          <CopyableAddress address={addresses.lotteryHall} label="MafiaLotteryHall" />
        ) : (
          <p className="text-xs text-amber-400">
            Set <code className="font-mono">lotteryHall</code> in{" "}
            <code className="font-mono">lib/constants/address.ts</code> for this chain.
          </p>
        )}

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="mb-0.5 text-xs text-muted-foreground">Enter</p>
          <p className="break-all font-mono text-sm text-primary">enter(uint256 amount)</p>
          <p className="mt-1 text-[10px] text-muted-foreground leading-relaxed">
            Burns approved in-game cash via the game bank, credits your weighted tickets, and may
            start the round timer after the third unique participant.
          </p>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="mb-0.5 text-xs text-muted-foreground">Finish</p>
          <p className="font-mono text-sm text-primary">drawWinner()</p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Callable once <code className="font-mono">block.timestamp &gt;= endTime</code> and the
            round is not ended.
          </p>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="mb-0.5 text-xs text-muted-foreground">Inventory owner</p>
          <p className="font-mono text-sm text-primary">ownerWithdraw()</p>
          <p className="mt-1 text-[10px] text-muted-foreground leading-relaxed">
            Only the current owner of the lottery inventory item (see{" "}
            <code className="font-mono">lotteryOwner()</code>). Mints all accumulated player entries
            to the owner and closes the round without a random draw.
          </p>
        </div>

        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="mb-0.5 text-xs text-muted-foreground">Views</p>
          <p className="font-mono text-[10px] text-primary leading-relaxed">
            rounds(uint256) · getCurrentPrize() · getParticipantsCount(uint256) ·
            getParticipants(uint256,uint256,uint256) · lotteryOwner() · ownerFeePercent() ·
            getRoundFinishInfos(uint256,uint256)
          </p>
        </div>

        <ChainStatusBadge />
      </div>
    </div>
  );
}
