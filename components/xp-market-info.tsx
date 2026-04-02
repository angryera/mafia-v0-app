"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import { ChainStatusBadge } from "@/components/chain-status-badge";

export function XpMarketInfo() {
  const addresses = useChainAddresses();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        XP Market Contract
      </h2>
      <div className="flex flex-col gap-2.5">
        <CopyableAddress address={addresses.xpMarket} label="Contract" />

        {/* listXp */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">
            List XP for Sale
          </p>
          <p className="font-mono text-sm text-primary break-all">
            listXp(uint8,uint8,address,uint256,uint256)
          </p>
          <div className="mt-1.5 flex flex-col gap-1">
            <p className="font-mono text-xs text-foreground">
              xpType{" "}
              <span className="text-muted-foreground">
                (0=Rank, 1=Kill, 2=Bust, 3=Race)
              </span>
            </p>
            <p className="font-mono text-xs text-foreground">
              listingType <span className="text-muted-foreground">(1=Auction)</span>
            </p>
            <p className="font-mono text-xs text-foreground">
              listingToken <span className="text-muted-foreground">(address)</span>
            </p>
            <p className="font-mono text-xs text-foreground">
              startPrice <span className="text-muted-foreground">(uint256)</span>
            </p>
            <p className="font-mono text-xs text-foreground">
              duration <span className="text-muted-foreground">(seconds)</span>
            </p>
          </div>
        </div>

        {/* bidOnAuctionItem */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">
            Bid on Auction
          </p>
          <p className="font-mono text-sm text-primary break-all">
            bidOnAuctionItem(uint256,uint256,uint256)
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Place a bid on an active XP listing. Send native token value if
            bidding with BNB/PLS.
          </p>
        </div>

        {/* finishAuctionItem */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">
            Finish Auction
          </p>
          <p className="font-mono text-sm text-primary break-all">
            finishAuctionItem(uint256)
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Complete an expired auction to transfer XP to the winner and funds
            to the seller.
          </p>
        </div>

        {/* cancelListing */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-0.5">
            Cancel Listing
          </p>
          <p className="font-mono text-sm text-primary break-all">
            cancelListing(uint256)
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Cancel your own listing if it has no bids yet.
          </p>
        </div>

        {/* XP Types */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-1.5">
            XP Types
          </p>
          <div className="flex flex-col gap-0.5 font-mono text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-primary">0 = Rank XP</span>
              <span className="text-muted-foreground">Main progression</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-red-500">1 = Kill Skill XP</span>
              <span className="text-muted-foreground">Combat skill</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-500">2 = Bustout XP</span>
              <span className="text-muted-foreground">Jail break skill</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-cyan-500">3 = Race XP</span>
              <span className="text-muted-foreground">Racing skill</span>
            </div>
          </div>
        </div>

        {/* Listing Status */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-1.5">
            Listing Status
          </p>
          <div className="flex flex-col gap-0.5 font-mono text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-foreground">0 = ACTIVE</span>
              <span className="text-muted-foreground">Accepting bids</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground">1 = SOLD</span>
              <span className="text-muted-foreground">Auction completed</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground">2 = CANCELLED</span>
              <span className="text-muted-foreground">Cancelled by owner</span>
            </div>
          </div>
        </div>

        {/* Duration Info */}
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground mb-1.5">
            Duration Options
          </p>
          <div className="flex flex-col gap-0.5 font-mono text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-foreground">24 hours</span>
              <span className="text-muted-foreground">86,400 seconds</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground">72 hours (3D)</span>
              <span className="text-muted-foreground">259,200 seconds</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground">168 hours (7D)</span>
              <span className="text-muted-foreground">604,800 seconds</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground">720 hours (30D)</span>
              <span className="text-muted-foreground">2,592,000 seconds</span>
            </div>
          </div>
        </div>

        <ChainStatusBadge />
      </div>
    </div>
  );
}
