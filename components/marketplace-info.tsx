"use client";

import { useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import { CopyableAddress } from "@/components/copyable-address";
import {
  Store,
  ExternalLink,
  Info,
  Tag,
  Gavel,
  XCircle,
  CheckCircle2,
  Package,
} from "lucide-react";

export function MarketplaceInfo() {
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Store className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">
            Inventory Marketplace
          </h3>
          <p className="text-xs text-muted-foreground">
            Trade inventory items with other players
          </p>
        </div>
      </div>

      {/* Contract Address */}
      <div className="mb-5">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Contract Address
        </p>
        <div className="flex items-center gap-2">
          <CopyableAddress address={addresses.inventoryMarketplace} />
          <a
            href={`${explorer}/address/${addresses.inventoryMarketplace}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background/50 text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            title="View on Explorer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* How It Works */}
      <div className="mb-5">
        <p className="mb-3 text-xs font-medium text-muted-foreground">
          How It Works
        </p>
        <div className="space-y-2.5">
          <div className="flex items-start gap-2.5 rounded-lg bg-background/50 p-3">
            <Package className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-medium text-foreground">Browse Items</p>
              <p className="text-[10px] text-muted-foreground">
                View inventory items listed by other players
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-lg bg-background/50 p-3">
            <Tag className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
            <div>
              <p className="text-xs font-medium text-foreground">Fixed Price</p>
              <p className="text-[10px] text-muted-foreground">
                Buy items instantly at the listed price
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-lg bg-background/50 p-3">
            <Gavel className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div>
              <p className="text-xs font-medium text-foreground">Auction</p>
              <p className="text-[10px] text-muted-foreground">
                Place bids on items. Minimum +5% per bid
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Functions */}
      <div className="mb-5">
        <p className="mb-3 text-xs font-medium text-muted-foreground">
          Contract Functions
        </p>
        <div className="space-y-2.5">
          {/* purchaseFixedItem */}
          <div className="rounded-lg bg-background/50 px-3 py-2.5">
            <p className="text-xs text-muted-foreground mb-0.5">Buy Fixed Price</p>
            <p className="font-mono text-sm text-primary break-all">
              purchaseFixedItem(uint256,uint256) payable
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Purchase a fixed-price listing; price is read from the listing (send native value when paying in BNB/PLS)
            </p>
          </div>

          {/* bidOnAuctionItem */}
          <div className="rounded-lg bg-background/50 px-3 py-2.5">
            <p className="text-xs text-muted-foreground mb-0.5">Place Bid</p>
            <p className="font-mono text-sm text-primary break-all">
              bidOnAuctionItem(uint256,uint256,uint256)
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Place a bid on an auction listing
            </p>
          </div>

          {/* cancelListing */}
          <div className="rounded-lg bg-background/50 px-3 py-2.5">
            <p className="text-xs text-muted-foreground mb-0.5">Cancel Listing</p>
            <p className="font-mono text-sm text-primary break-all">
              cancelListing(uint256)
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Cancel your own listing (seller only)
            </p>
          </div>

          {/* finishAuctionItem */}
          <div className="rounded-lg bg-background/50 px-3 py-2.5">
            <p className="text-xs text-muted-foreground mb-0.5">Complete Auction</p>
            <p className="font-mono text-sm text-primary break-all">
              finishAuctionItem(uint256)
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Finalize an expired auction
            </p>
          </div>
        </div>
      </div>

      {/* Listing Status */}
      <div className="mb-5">
        <p className="mb-3 text-xs font-medium text-muted-foreground">
          Listing Status
        </p>
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <div className="flex flex-col gap-0.5 font-mono text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-foreground">0 = OPEN</span>
              <span className="text-muted-foreground">Active listing</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground">1 = SOLD</span>
              <span className="text-muted-foreground">Item purchased</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground">2 = CANCELED</span>
              <span className="text-muted-foreground">Canceled by seller</span>
            </div>
          </div>
        </div>
      </div>

      {/* Listing Types */}
      <div>
        <p className="mb-3 text-xs font-medium text-muted-foreground">
          Listing Types
        </p>
        <div className="rounded-lg bg-background/50 px-3 py-2.5">
          <div className="flex flex-col gap-0.5 font-mono text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-foreground">0 = FIXED</span>
              <span className="text-muted-foreground">Buy at set price</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground">1 = AUCTION</span>
              <span className="text-muted-foreground">Competitive bidding</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
